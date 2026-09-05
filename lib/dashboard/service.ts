import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  computeAggregate,
  computeVariation,
  type TxRow,
  type Variation,
} from "@/lib/dashboard/aggregates";
import { resolvePeriod, type Period } from "@/lib/dashboard/period";

/**
 * Server-side dashboard reads (SCREEN-4). `withAuth` has already proved identity;
 * these queries are all scoped `user_id = <caller>` on the service client, the
 * same pattern as the profile / privacy endpoints.
 *
 * Current balance is the authoritative `public.account_balance()` (D3 — derived,
 * includes project allocations). The period breakdown + curve are computed in JS
 * from the transaction rows (`lib/dashboard/aggregates.ts`).
 */

export interface AccountSummary {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_primary: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  balance: number;
}

export async function listAccounts(
  db: SupabaseClient,
  userId: string,
): Promise<AccountSummary[]> {
  const { data, error } = await db
    .from("accounts")
    .select("id, name, type, currency, is_primary, is_favorite, is_archived")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  const balances = await Promise.all(
    rows.map((a) => db.rpc("account_balance", { p_account_id: a.id })),
  );

  return rows.map((a, i) => ({
    ...a,
    balance: Number(balances[i]?.data ?? 0),
  }));
}

export interface DashboardPayload {
  account: { id: string; name: string; currency: string };
  period: Period;
  balance: number;
  startBalance: number;
  income: number;
  expenses: number;
  variation: Variation;
  /** null until the account has any settled transaction (SCREEN-4 empty state) */
  curve: { date: string; balance: number; at?: string }[] | null;
  granularity: "hour" | "day" | "month";
  hasTransactions: boolean;
}

export async function getDashboard(
  db: SupabaseClient,
  userId: string,
  accountId: string | null,
  period: Period,
): Promise<DashboardPayload | null> {
  // Resolve the target account (explicit id, else the primary).
  const accountQuery = db
    .from("accounts")
    .select("id, name, currency, initial_balance")
    .eq("user_id", userId)
    .eq("is_archived", false);
  const { data: account, error: accErr } = accountId
    ? await accountQuery.eq("id", accountId).maybeSingle()
    : await accountQuery.eq("is_primary", true).maybeSingle();
  if (accErr) throw accErr;
  if (!account) return null;

  const now = new Date();
  const range = resolvePeriod(period, now);

  const { data: txData, error: txErr } = await db
    .from("transactions")
    .select(
      "type, amount, occurred_on, status, source_account_id, destination_account_id, created_at",
    )
    .eq("user_id", userId)
    .or(`source_account_id.eq.${account.id},destination_account_id.eq.${account.id}`)
    .lt("occurred_on", range.end)
    .order("occurred_on", { ascending: true });
  if (txErr) throw txErr;

  const transactions: TxRow[] = (txData ?? []).map((t) => ({
    type: t.type,
    amount: Number(t.amount),
    occurred_on: t.occurred_on,
    created_at: t.created_at,
    status: t.status,
    source_account_id: t.source_account_id,
    destination_account_id: t.destination_account_id,
  }));

  const agg = computeAggregate({
    initialBalance: Number(account.initial_balance),
    transactions,
    accountId: account.id,
    rangeStart: range.start,
    rangeEnd: range.end,
    buckets: range.buckets,
    granularity: range.granularity,
    now: now.toISOString(),
  });

  // Authoritative live balance (includes project allocations).
  const { data: liveBalance } = await db.rpc("account_balance", { p_account_id: account.id });
  const balance = Number(liveBalance ?? agg.endBalance);

  // Previous-period baseline for the variation line.
  const prevBaseline = computeAggregate({
    initialBalance: Number(account.initial_balance),
    transactions,
    accountId: account.id,
    rangeStart: range.previous.start,
    rangeEnd: range.previous.end,
    buckets: [range.previous.start],
  }).endBalance;

  const hasTransactions = transactions.some((t) => t.status !== "planned");

  return {
    account: { id: account.id, name: account.name, currency: account.currency },
    period,
    balance,
    startBalance: agg.startBalance,
    income: agg.income,
    expenses: agg.expenses,
    variation: computeVariation(agg.endBalance, prevBaseline),
    curve: hasTransactions ? agg.curve : null,
    granularity: range.granularity,
    hasTransactions,
  };
}
