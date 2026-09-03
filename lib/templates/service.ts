import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import { BadRequestError, NotFoundError } from "@/lib/http/errors";
import { todayISO } from "@/lib/format/date";
import { initialNextRun } from "@/lib/recurrence/model";
import type { TemplateListItem } from "@/lib/templates/model";
import type {
  TemplateCreateInput,
  TemplateUpdateInput,
} from "@/lib/validation/schemas";

/**
 * Server-side template reads/writes (SCREEN-14). Identity from `withAuth`; every
 * referenced id (account, category, "lié à") is re-checked against the caller.
 *
 * Recurrence cursor (D2): a template with `recurrence` ≠ "once" carries a
 * `next_run_on`; the daily cron generates the transactions. Switching the
 * recurrence on/off here (re)sets or clears that cursor.
 */

export type { TemplateListItem } from "@/lib/templates/model";

const COLUMNS =
  "id, name, description, kind, amount, category_id, linked_to_type, linked_to_id, account_id, recurrence, usage_count, is_favorite, next_run_on, created_at";

async function verifyRefs(
  db: SupabaseClient,
  userId: string,
  input: {
    kind?: string;
    account_id?: string | null;
    category_id?: string | null;
    linked_to_type?: string | null;
    linked_to_id?: string | null;
  },
): Promise<void> {
  if (input.account_id) {
    const { data } = await db
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("id", input.account_id)
      .maybeSingle();
    if (!data) throw new NotFoundError("Compte introuvable.");
  }
  if (input.category_id) {
    const { data } = await db
      .from("categories")
      .select("id, kind, user_id")
      .eq("id", input.category_id)
      .maybeSingle();
    if (!data || (data.user_id !== null && data.user_id !== userId)) {
      throw new NotFoundError("Catégorie introuvable.");
    }
    if (input.kind && data.kind !== input.kind) {
      throw new BadRequestError("Cette catégorie ne correspond pas au type.");
    }
  }
  if (input.linked_to_type && input.linked_to_id) {
    const table = input.linked_to_type === "person" ? "people" : "projects";
    const { data } = await db
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .eq("id", input.linked_to_id)
      .maybeSingle();
    if (!data) throw new NotFoundError("« Lié à » introuvable.");
  }
}

function shape(
  raw: Record<string, unknown>,
  names: {
    category: Map<string, { name: string; color: string }>;
    account: Map<string, string>;
    person: Map<string, string>;
    project: Map<string, string>;
  },
): TemplateListItem {
  const catId = raw.category_id as string | null;
  const acctId = raw.account_id as string | null;
  const linkType = raw.linked_to_type as "person" | "project" | null;
  const linkId = raw.linked_to_id as string | null;
  const cat = catId ? names.category.get(catId) : undefined;
  const linkName =
    linkId && linkType
      ? (linkType === "person" ? names.person : names.project).get(linkId)
      : undefined;
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) ?? "",
    kind: raw.kind as TemplateListItem["kind"],
    amount: Number(raw.amount),
    category: cat ? { name: cat.name, color: cat.color } : null,
    account: acctId ? { name: names.account.get(acctId) ?? "" } : null,
    linked_to: linkName && linkType ? { type: linkType, name: linkName } : null,
    recurrence: raw.recurrence as TemplateListItem["recurrence"],
    usage_count: Number(raw.usage_count ?? 0),
    is_favorite: Boolean(raw.is_favorite),
    next_run_on: (raw.next_run_on as string | null) ?? null,
    category_id: catId,
    account_id: acctId,
    linked_to_type: linkType,
    linked_to_id: linkId,
    created_at: raw.created_at as string,
  };
}

async function resolveNames(db: SupabaseClient, userId: string, rows: Record<string, unknown>[]) {
  const catIds = new Set<string>();
  const acctIds = new Set<string>();
  const personIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const r of rows) {
    if (r.category_id) catIds.add(r.category_id as string);
    if (r.account_id) acctIds.add(r.account_id as string);
    if (r.linked_to_id && r.linked_to_type === "person")
      personIds.add(r.linked_to_id as string);
    if (r.linked_to_id && r.linked_to_type === "project")
      projectIds.add(r.linked_to_id as string);
  }
  const [cats, accts, people, projects] = await Promise.all([
    catIds.size
      ? db.from("categories").select("id, name, color").in("id", [...catIds])
      : Promise.resolve({ data: [] }),
    acctIds.size
      ? db.from("accounts").select("id, name").eq("user_id", userId).in("id", [...acctIds])
      : Promise.resolve({ data: [] }),
    personIds.size
      ? db.from("people").select("id, name").eq("user_id", userId).in("id", [...personIds])
      : Promise.resolve({ data: [] }),
    projectIds.size
      ? db.from("projects").select("id, name").eq("user_id", userId).in("id", [...projectIds])
      : Promise.resolve({ data: [] }),
  ]);
  return {
    category: new Map(
      ((cats.data ?? []) as { id: string; name: string; color: string }[]).map((c) => [
        c.id,
        { name: c.name, color: c.color },
      ]),
    ),
    account: new Map(
      ((accts.data ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]),
    ),
    person: new Map(
      ((people.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
    ),
    project: new Map(
      ((projects.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
    ),
  };
}

export async function listTemplates(
  db: SupabaseClient,
  userId: string,
): Promise<TemplateListItem[]> {
  const { data, error } = await db
    .from("templates")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const names = await resolveNames(db, userId, rows);
  return rows.map((r) => shape(r, names));
}

export async function getTemplate(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<TemplateListItem> {
  const { data, error } = await db
    .from("templates")
    .select(`${COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  assertOwnership(data as { user_id?: string | null } | null, user, {
    resource: "template",
    resourceId: id,
  });
  const raw = data as Record<string, unknown>;
  const names = await resolveNames(db, user.id, [raw]);
  return shape(raw, names);
}

export async function createTemplate(
  db: SupabaseClient,
  userId: string,
  input: TemplateCreateInput,
): Promise<{ id: string }> {
  await verifyRefs(db, userId, input);
  const recurrence = input.recurrence ?? "once";
  const nextRun =
    recurrence === "once" ? null : initialNextRun(todayISO(), recurrence);
  const { data, error } = await db
    .from("templates")
    .insert({ ...input, user_id: userId, next_run_on: nextRun })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function updateTemplate(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: TemplateUpdateInput,
): Promise<TemplateListItem> {
  const { data: existing } = await db
    .from("templates")
    .select("id, user_id, kind, recurrence")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(existing, user, { resource: "template", resourceId: id });

  await verifyRefs(db, user.id, {
    kind: existing!.kind as string,
    ...input,
  });

  const patch: Record<string, unknown> = { ...input };
  if (input.recurrence !== undefined && input.recurrence !== existing!.recurrence) {
    patch.next_run_on =
      input.recurrence === "once"
        ? null
        : initialNextRun(todayISO(), input.recurrence);
  }
  const { error } = await db
    .from("templates")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  return getTemplate(db, user, id);
}

export async function deleteTemplate(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  const { data } = await db
    .from("templates")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "template", resourceId: id });
  const { error } = await db
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

/** SCREEN-14 § 6 — bump the "plus utilisé" counter after a launch is confirmed. */
export async function bumpTemplateUsage(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  const { data } = await db
    .from("templates")
    .select("id, user_id, usage_count")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "template", resourceId: id });
  await db
    .from("templates")
    .update({ usage_count: Number(data!.usage_count ?? 0) + 1 })
    .eq("id", id)
    .eq("user_id", user.id);
}
