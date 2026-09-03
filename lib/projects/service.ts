import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import { BadRequestError, NotFoundError } from "@/lib/http/errors";
import type { ProjectListItem } from "@/lib/projects/model";
import type {
  ProjectAllocateInput,
  ProjectCreateInput,
  ProjectUpdateInput,
} from "@/lib/validation/schemas";

/**
 * Server-side project reads/writes (SCREEN-16). Identity from `withAuth`.
 *
 * 🔎 LAYER 3:
 *  - "Affecter au solde" goes through `public.allocate_to_project()` — ONE
 *    atomic statement with a `for update` lock and an insufficient-funds guard,
 *    so two concurrent taps can't over-allocate;
 *  - a positive allocation is a HARD refusal when funds are short (D4), never a
 *    warning; a withdrawal is floored at 0;
 *  - the daily balance function nets allocations against project-linked spending,
 *    so reserving then spending is not double-counted.
 */

export type { ProjectListItem } from "@/lib/projects/model";

const COLUMNS =
  "id, name, description, category, target_amount, allocated_amount, status, account_id, is_favorite, start_date, end_date, created_at";

async function linkedSpendByProject(
  db: SupabaseClient,
  userId: string,
): Promise<Map<string, { spent: number; count: number }>> {
  const { data } = await db
    .from("transactions")
    .select("amount, linked_to_id, status")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("linked_to_type", "project");
  const out = new Map<string, { spent: number; count: number }>();
  for (const r of data ?? []) {
    if (!r.linked_to_id) continue;
    const cur = out.get(r.linked_to_id) ?? { spent: 0, count: 0 };
    if (r.status === "done") cur.spent += Number(r.amount);
    cur.count += 1;
    out.set(r.linked_to_id, cur);
  }
  return out;
}

function shape(
  raw: Record<string, unknown>,
  s: { spent: number; count: number },
): ProjectListItem {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: (raw.description as string) ?? "",
    category: (raw.category as string) ?? "other",
    target_amount:
      raw.target_amount === null || raw.target_amount === undefined
        ? null
        : Number(raw.target_amount),
    allocated_amount: Number(raw.allocated_amount ?? 0),
    spent: s.spent,
    status: raw.status as ProjectListItem["status"],
    account_id: (raw.account_id as string | null) ?? null,
    is_favorite: Boolean(raw.is_favorite),
    start_date: (raw.start_date as string | null) ?? null,
    end_date: (raw.end_date as string | null) ?? null,
    tx_count: s.count,
    created_at: raw.created_at as string,
  };
}

async function verifyAccount(
  db: SupabaseClient,
  userId: string,
  accountId: string | null | undefined,
): Promise<void> {
  if (!accountId) return;
  const { data } = await db
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .eq("id", accountId)
    .maybeSingle();
  if (!data) throw new NotFoundError("Compte introuvable.");
}

export async function listProjects(
  db: SupabaseClient,
  userId: string,
): Promise<ProjectListItem[]> {
  const { data, error } = await db
    .from("projects")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const spend = await linkedSpendByProject(db, userId);
  return (data ?? []).map((raw) =>
    shape(raw as Record<string, unknown>, spend.get(raw.id) ?? { spent: 0, count: 0 }),
  );
}

export async function getProject(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<{
  project: ProjectListItem;
  transactions: {
    id: string;
    amount: number;
    occurred_on: string;
    status: string;
    note: string | null;
  }[];
  accountBalance: number | null;
}> {
  const { data, error } = await db
    .from("projects")
    .select(`${COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  assertOwnership(data as { user_id?: string | null } | null, user, {
    resource: "project",
    resourceId: id,
  });

  const { data: txs } = await db
    .from("transactions")
    .select("id, amount, occurred_on, status, note")
    .eq("user_id", user.id)
    .eq("linked_to_type", "project")
    .eq("linked_to_id", id)
    .order("occurred_on", { ascending: false });

  const rows = (txs ?? []).map((r) => ({
    id: r.id as string,
    amount: Number(r.amount),
    occurred_on: r.occurred_on as string,
    status: r.status as string,
    note: (r.note as string | null) ?? null,
  }));
  const spent = rows
    .filter((r) => r.status === "done")
    .reduce((s, r) => s + r.amount, 0);

  const raw = data as Record<string, unknown>;
  const targetAccount =
    (raw.account_id as string | null) ??
    (
      await db
        .from("accounts")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle()
    ).data?.id ??
    null;
  let accountBalance: number | null = null;
  if (targetAccount) {
    const { data: bal } = await db.rpc("account_balance", {
      p_account_id: targetAccount,
    });
    accountBalance = Number(bal ?? 0);
  }

  return {
    project: shape(raw, { spent, count: rows.length }),
    transactions: rows,
    accountBalance,
  };
}

export async function createProject(
  db: SupabaseClient,
  userId: string,
  input: ProjectCreateInput,
): Promise<{ id: string }> {
  await verifyAccount(db, userId, input.account_id);
  const { data, error } = await db
    .from("projects")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function updateProject(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: ProjectUpdateInput,
): Promise<void> {
  const { data } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "project", resourceId: id });
  await verifyAccount(db, user.id, input.account_id);
  const { error } = await db
    .from("projects")
    .update(input)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function deleteProject(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  const { data } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "project", resourceId: id });
  const { error } = await db
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function allocateToProject(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: ProjectAllocateInput,
): Promise<{ allocated_amount: number }> {
  const { data } = await db
    .from("projects")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "project", resourceId: id });

  const delta = input.direction === "withdraw" ? -input.amount : input.amount;
  const { data: newAmount, error } = await db.rpc("allocate_to_project", {
    p_project_id: id,
    p_delta: delta,
  });
  if (error) {
    if (error.code === "23514") {
      throw new BadRequestError(
        "Fonds insuffisants sur le compte pour cette allocation.",
      );
    }
    throw error;
  }
  return { allocated_amount: Number(newAmount ?? 0) };
}
