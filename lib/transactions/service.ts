import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { BadRequestError, NotFoundError } from "@/lib/http/errors";
import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import {
  resolveScoringAxis,
  type LinkedToType,
  type TxAccountRef,
  type TxCategoryRef,
  type TxDetail,
  type TxLinkedRef,
  type TxListItem,
  type TxType,
} from "@/lib/transactions/model";
import type { TransactionCreateInput } from "@/lib/validation/schemas";

/**
 * Server-side transaction reads/writes (SCREEN-6/7/8/9/10) — the financial core.
 *
 * PHASE 2 / PAYSTACK: this table also absorbs what the FOUNDATION docs call the
 * `payments` table (Day 9). That merge is right for a ledger everyone fills in
 * by hand and wrong the day a provider is connected — a pending or reversed
 * charge is not a movement of money and does not belong in these rows. The full
 * note, and the shape to build instead, is at the head of the `transactions`
 * table in supabase/migrations/0002_core_schema.sql.
 *
 * SECURITY (BUILD-PLAN § LOT 3 · 🔎 LAYER 3):
 *  - identity comes from `withAuth`, never the body;
 *  - EVERY referenced row (source/destination account, category, person/project)
 *    is re-checked to belong to the caller before an insert/update — the client
 *    only ever sends ids;
 *  - `scoring_axis` is resolved here, never trusted from the client;
 *  - the derived balance (D3) recomputes itself — delete/edit need no
 *    reconciliation;
 *  - a resulting negative balance is a WARNING, never a silent block (D4).
 */

export type {
  TxAccountRef,
  TxCategoryRef,
  TxDetail,
  TxLinkedRef,
  TxListItem,
} from "@/lib/transactions/model";

const LIST_COLUMNS = `
  id, type, amount, occurred_on, status, note, scoring_axis, recurrence, created_at,
  linked_to_type, linked_to_id,
  category:categories!transactions_category_id_fkey(id, name, color),
  source_account:accounts!transactions_source_account_id_fkey(id, name, type),
  destination_account:accounts!transactions_destination_account_id_fkey(id, name, type)
`;

// ── helpers ────────────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;

function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

async function resolveLinked(
  db: SupabaseClient,
  userId: string,
  rows: { linked_to_type: string | null; linked_to_id: string | null }[],
): Promise<Map<string, TxLinkedRef>> {
  const personIds = new Set<string>();
  const projectIds = new Set<string>();
  for (const r of rows) {
    if (!r.linked_to_id) continue;
    if (r.linked_to_type === "person") personIds.add(r.linked_to_id);
    else if (r.linked_to_type === "project") projectIds.add(r.linked_to_id);
  }
  const out = new Map<string, TxLinkedRef>();
  if (personIds.size) {
    const { data } = await db
      .from("people")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", [...personIds]);
    for (const p of data ?? []) out.set(p.id, { type: "person", id: p.id, name: p.name });
  }
  if (projectIds.size) {
    const { data } = await db
      .from("projects")
      .select("id, name")
      .eq("user_id", userId)
      .in("id", [...projectIds]);
    for (const p of data ?? []) out.set(p.id, { type: "project", id: p.id, name: p.name });
  }
  return out;
}

function shapeRow(raw: RawRow, linked: Map<string, TxLinkedRef>): TxListItem {
  const linkId = raw.linked_to_id as string | null;
  return {
    id: raw.id as string,
    type: raw.type as TxType,
    amount: Number(raw.amount),
    occurred_on: raw.occurred_on as string,
    status: raw.status as string,
    note: (raw.note as string | null) ?? null,
    scoring_axis: (raw.scoring_axis as string | null) ?? null,
    recurrence: raw.recurrence as string,
    created_at: raw.created_at as string,
    category: one(raw.category as TxCategoryRef | TxCategoryRef[] | null),
    source_account: one(raw.source_account as TxAccountRef | TxAccountRef[] | null),
    destination_account: one(
      raw.destination_account as TxAccountRef | TxAccountRef[] | null,
    ),
    linked_to: linkId ? (linked.get(linkId) ?? null) : null,
  };
}

// ── list (SCREEN-6) ────────────────────────────────────────────────────────

export interface TxListPage {
  items: TxListItem[];
  nextCursor: string | null;
}

export async function listTransactions(
  db: SupabaseClient,
  userId: string,
  opts: {
    type?: TxType;
    account?: string;
    linkedToType?: LinkedToType;
    linkedToId?: string;
    cursor?: string;
    limit: number;
  },
): Promise<TxListPage> {
  let q = db
    .from("transactions")
    .select(LIST_COLUMNS)
    .eq("user_id", userId)
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false })
    .limit(opts.limit + 1);

  if (opts.type) q = q.eq("type", opts.type);
  if (opts.account) {
    q = q.or(
      `source_account_id.eq.${opts.account},destination_account_id.eq.${opts.account}`,
    );
  }
  if (opts.linkedToType) q = q.eq("linked_to_type", opts.linkedToType);
  if (opts.linkedToId) q = q.eq("linked_to_id", opts.linkedToId);

  if (opts.cursor) {
    const [date, id] = opts.cursor.split("|");
    if (date && id) {
      q = q.or(
        `occurred_on.lt.${date},and(occurred_on.eq.${date},id.lt.${id})`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawRow[];
  const hasMore = rows.length > opts.limit;
  const visible = rows.slice(0, opts.limit);

  const linked = await resolveLinked(
    db,
    userId,
    visible.map((r) => ({
      linked_to_type: r.linked_to_type as string | null,
      linked_to_id: r.linked_to_id as string | null,
    })),
  );

  const page = visible.map((raw) => shapeRow(raw, linked));

  const last = page.at(-1);
  return {
    items: page,
    nextCursor: hasMore && last ? `${last.occurred_on}|${last.id}` : null,
  };
}

// ── detail (SCREEN-7) ──────────────────────────────────────────────────────

export async function getTransaction(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<TxDetail> {
  const { data, error } = await db
    .from("transactions")
    .select(
      `${LIST_COLUMNS}, updated_at, template_id, user_id, linked_to_type, linked_to_id`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  assertOwnership(data as { user_id?: string | null } | null, user, {
    resource: "transaction",
    resourceId: id,
  });

  const raw = data as unknown as RawRow;
  const linked = await resolveLinked(db, user.id, [
    {
      linked_to_type: raw.linked_to_type as string | null,
      linked_to_id: raw.linked_to_id as string | null,
    },
  ]);
  const base = shapeRow(raw, linked);
  return {
    ...base,
    updated_at: raw.updated_at as string,
    template_id: (raw.template_id as string | null) ?? null,
  };
}

// ── write (SCREEN-8/9/10) ──────────────────────────────────────────────────

/**
 * Re-verify every id the client sent belongs to the caller (or is a system
 * category), and that the category kind matches the transaction type. Returns
 * the category axis so the caller can resolve `scoring_axis`.
 */
async function verifyRefs(
  db: SupabaseClient,
  userId: string,
  input: TransactionCreateInput,
): Promise<{ categoryAxis: string | null }> {
  const accountIds = new Set<string>();
  if ("source_account_id" in input && input.source_account_id)
    accountIds.add(input.source_account_id);
  if ("destination_account_id" in input && input.destination_account_id)
    accountIds.add(input.destination_account_id);

  if (accountIds.size) {
    const { data, error } = await db
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .in("id", [...accountIds]);
    if (error) throw error;
    if ((data?.length ?? 0) !== accountIds.size) {
      throw new NotFoundError("Compte introuvable.");
    }
  }

  let categoryAxis: string | null = null;
  const categoryId =
    "category_id" in input ? (input.category_id ?? null) : null;
  if (categoryId) {
    const { data, error } = await db
      .from("categories")
      .select("id, kind, axis, user_id")
      .eq("id", categoryId)
      .maybeSingle();
    if (error) throw error;
    if (!data || (data.user_id !== null && data.user_id !== userId)) {
      throw new NotFoundError("Catégorie introuvable.");
    }
    const expectedKind = input.type === "income" ? "income" : "expense";
    if (data.kind !== expectedKind) {
      throw new BadRequestError("Cette catégorie ne correspond pas au type.");
    }
    categoryAxis = data.axis;
  }

  const linkedType =
    "linked_to_type" in input ? (input.linked_to_type ?? null) : null;
  const linkedId = "linked_to_id" in input ? (input.linked_to_id ?? null) : null;
  if (linkedType && linkedId) {
    const table = linkedType === "person" ? "people" : "projects";
    const { data, error } = await db
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .eq("id", linkedId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("« Lié à » introuvable.");
  }

  return { categoryAxis };
}

function toRow(
  userId: string,
  input: TransactionCreateInput,
  scoringAxis: string | null,
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    user_id: userId,
    type: input.type,
    amount: input.amount,
    scoring_axis: scoringAxis,
    note: "note" in input ? (input.note ?? null) : null,
    // reset the polymorphic + FK columns so an edit that clears a field persists
    category_id: null,
    linked_to_type: null,
    linked_to_id: null,
    source_account_id: null,
    destination_account_id: null,
  };
  if ("occurred_on" in input && input.occurred_on) row.occurred_on = input.occurred_on;
  if ("source_account_id" in input) row.source_account_id = input.source_account_id;
  if ("destination_account_id" in input)
    row.destination_account_id = input.destination_account_id;
  if ("category_id" in input) row.category_id = input.category_id ?? null;
  if ("linked_to_type" in input && input.linked_to_type) {
    row.linked_to_type = input.linked_to_type;
    row.linked_to_id = input.linked_to_id;
  }
  if ("status" in input && input.status) row.status = input.status;
  if ("recurrence" in input && input.recurrence) row.recurrence = input.recurrence;
  return row;
}

export interface TxWriteResult {
  transaction: TxDetail;
  /** set when the source account's derived balance is now negative (D4) */
  warning: { code: "NEGATIVE_BALANCE"; account: string; balance: number } | null;
}

async function negativeBalanceWarning(
  db: SupabaseClient,
  input: TransactionCreateInput,
): Promise<TxWriteResult["warning"]> {
  if (input.type === "income") return null;
  const accountId =
    "source_account_id" in input ? input.source_account_id : undefined;
  if (!accountId) return null;
  const { data } = await db.rpc("account_balance", { p_account_id: accountId });
  const balance = Number(data ?? 0);
  return balance < 0
    ? { code: "NEGATIVE_BALANCE", account: accountId, balance }
    : null;
}

export async function createTransaction(
  db: SupabaseClient,
  user: AuthUser,
  input: TransactionCreateInput,
): Promise<TxWriteResult> {
  const { categoryAxis } = await verifyRefs(db, user.id, input);
  const scoringAxis = resolveScoringAxis({
    type: input.type,
    categoryAxis,
    linkedToType:
      "linked_to_type" in input ? (input.linked_to_type ?? null) : null,
  });

  const { data, error } = await db
    .from("transactions")
    .insert(toRow(user.id, input, scoringAxis))
    .select("id")
    .single();
  if (error) throw error;

  const warning = await negativeBalanceWarning(db, input);
  const transaction = await getTransaction(db, user, data.id);
  return { transaction, warning };
}

export async function updateTransaction(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: TransactionCreateInput,
): Promise<TxWriteResult> {
  // Ownership of the existing row first (throws 404/403).
  const existing = await db
    .from("transactions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(existing.data, user, { resource: "transaction", resourceId: id });

  const { categoryAxis } = await verifyRefs(db, user.id, input);
  const scoringAxis = resolveScoringAxis({
    type: input.type,
    categoryAxis,
    linkedToType:
      "linked_to_type" in input ? (input.linked_to_type ?? null) : null,
  });

  const row = toRow(user.id, input, scoringAxis);
  delete row.user_id; // never rewrite the owner
  const { error } = await db
    .from("transactions")
    .update(row)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  const warning = await negativeBalanceWarning(db, input);
  const transaction = await getTransaction(db, user, id);
  return { transaction, warning };
}

export async function deleteTransaction(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  const existing = await db
    .from("transactions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(existing.data, user, { resource: "transaction", resourceId: id });

  const { error } = await db
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  // Derived balance (D3) recomputes on the next read — nothing to reconcile.
}
