import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import { BadRequestError } from "@/lib/http/errors";
import type { AccountCardData } from "@/lib/accounts/model";
import type {
  AccountCreateInput,
  AccountUpdateInput,
} from "@/lib/validation/schemas";

/**
 * Server-side account reads/writes (SCREEN-17). Identity from `withAuth`, every
 * query scoped to the caller (RLS is the net).
 *
 * SECURITY / 🔎 LAYER 3:
 *  - `is_primary` is never writable here — the Compte Principal is auto-created
 *    at sign-up (D5) and stays the primary for life;
 *  - deleting the primary account is refused;
 *  - an account with transactions can't be hard-deleted (FK `on delete
 *    restrict`) → it is archived instead (soft delete), transactions untouched.
 */

export type { AccountCardData } from "@/lib/accounts/model";

const CARD_COLUMNS =
  "id, name, type, currency, initial_balance, monthly_fee, fee_type, provider, card_network, account_number, notes, is_primary, is_favorite, is_archived, created_at";

async function txCount(
  db: SupabaseClient,
  userId: string,
  accountId: string,
): Promise<number> {
  const { count } = await db
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(
      `source_account_id.eq.${accountId},destination_account_id.eq.${accountId}`,
    );
  return count ?? 0;
}

function shape(
  raw: Record<string, unknown>,
  balance: number,
  count?: number,
): AccountCardData {
  return {
    id: raw.id as string,
    name: raw.name as string,
    type: raw.type as AccountCardData["type"],
    currency: raw.currency as string,
    balance,
    initial_balance: Number(raw.initial_balance ?? 0),
    monthly_fee:
      raw.monthly_fee === null || raw.monthly_fee === undefined
        ? null
        : Number(raw.monthly_fee),
    fee_type: (raw.fee_type as AccountCardData["fee_type"]) ?? null,
    provider: (raw.provider as string | null) ?? null,
    card_network: (raw.card_network as string | null) ?? null,
    account_number: (raw.account_number as string | null) ?? null,
    notes: (raw.notes as string | null) ?? null,
    is_primary: Boolean(raw.is_primary),
    is_favorite: Boolean(raw.is_favorite),
    is_archived: Boolean(raw.is_archived),
    created_at: raw.created_at as string,
    ...(count !== undefined ? { tx_count: count } : {}),
  };
}

export async function listAccountCards(
  db: SupabaseClient,
  userId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<AccountCardData[]> {
  let q = db.from("accounts").select(CARD_COLUMNS).eq("user_id", userId);
  if (!opts.includeArchived) q = q.eq("is_archived", false);
  const { data, error } = await q
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Record<string, unknown>[];
  const balances = await Promise.all(
    rows.map((a) => db.rpc("account_balance", { p_account_id: a.id as string })),
  );
  return rows.map((a, i) => shape(a, Number(balances[i]?.data ?? 0)));
}

export async function getAccountCard(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<AccountCardData> {
  const { data, error } = await db
    .from("accounts")
    .select(`${CARD_COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  assertOwnership(data as { user_id?: string | null } | null, user, {
    resource: "account",
    resourceId: id,
  });

  const raw = data as Record<string, unknown>;
  const { data: balance } = await db.rpc("account_balance", {
    p_account_id: id,
  });
  const count = await txCount(db, user.id, id);
  return shape(raw, Number(balance ?? 0), count);
}

export async function createAccount(
  db: SupabaseClient,
  userId: string,
  input: AccountCreateInput,
): Promise<{ id: string }> {
  const { data, error } = await db
    .from("accounts")
    .insert({ ...input, user_id: userId, is_primary: false })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string };
}

export async function updateAccount(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  input: AccountUpdateInput,
): Promise<void> {
  const existing = await db
    .from("accounts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(existing.data, user, { resource: "account", resourceId: id });

  const patch: Record<string, unknown> = { ...input };
  delete patch.user_id;
  delete patch.is_primary; // never reassigned by the client
  const { error } = await db
    .from("accounts")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export interface AccountDeleteResult {
  deleted: boolean;
  archived: boolean;
}

export async function deleteAccount(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<AccountDeleteResult> {
  const { data } = await db
    .from("accounts")
    .select("id, user_id, is_primary")
    .eq("id", id)
    .maybeSingle();
  assertOwnership(data, user, { resource: "account", resourceId: id });

  if (data?.is_primary) {
    throw new BadRequestError(
      "Le compte principal ne peut pas être supprimé.",
    );
  }

  if ((await txCount(db, user.id, id)) > 0) {
    const { error } = await db
      .from("accounts")
      .update({ is_archived: true })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return { deleted: false, archived: true };
  }

  const { error } = await db
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  return { deleted: true, archived: false };
}
