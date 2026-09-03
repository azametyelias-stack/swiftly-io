/**
 * Dashboard aggregates (SCREEN-4 § 3 / § 4 / § 5). Pure + import-free so
 * `tests/dashboard/aggregates.test.ts` runs it under `node --test`. The API
 * route (`app/api/dashboard/route.ts`) resolves the period (`./period`) and
 * feeds the buckets in here.
 *
 * Balance is always derived (DESIGN-RECONCILIATION D3) — there is no stored
 * balance. The "counts toward the balance" rules mirror
 * `public.account_balance()` in 0002_core_schema.sql exactly:
 *   income   → counts when status in (done, received)
 *   expense  → counts when status = done
 *   transfer → always counts
 * Project allocations also reduce the live balance (D3) but carry no date, so
 * they are a "now" adjustment the API applies on top — not part of the curve.
 */

export type TxType = "expense" | "income" | "transfer";

export interface TxRow {
  type: TxType;
  /** whole XOF, always positive */
  amount: number;
  /** YYYY-MM-DD */
  occurred_on: string;
  status: string;
  source_account_id: string | null;
  destination_account_id: string | null;
}

/** Signed effect of one transaction on `accountId`'s balance (0 if unrelated). */
export function txDelta(tx: TxRow, accountId: string): number {
  const amount = Math.max(0, Math.round(tx.amount));
  if (tx.type === "income") {
    if (tx.destination_account_id !== accountId) return 0;
    return tx.status === "done" || tx.status === "received" ? amount : 0;
  }
  if (tx.type === "expense") {
    if (tx.source_account_id !== accountId) return 0;
    return tx.status === "done" ? -amount : 0;
  }
  // transfer
  if (tx.destination_account_id === accountId) return amount;
  if (tx.source_account_id === accountId) return -amount;
  return 0;
}

export interface CurvePoint {
  date: string;
  balance: number;
}

export interface DashboardAggregate {
  /** balance at 00:00 on `rangeStart` */
  startBalance: number;
  /** money into the account during [rangeStart, rangeEnd) */
  income: number;
  /** money out of the account during [rangeStart, rangeEnd) */
  expenses: number;
  /** startBalance + income − expenses (== last curve point) */
  endBalance: number;
  /** cumulative balance at the end of each bucket */
  curve: CurvePoint[];
}

export interface AggregateInput {
  initialBalance: number;
  transactions: TxRow[];
  accountId: string;
  /** inclusive YYYY-MM-DD */
  rangeStart: string;
  /** EXCLUSIVE YYYY-MM-DD */
  rangeEnd: string;
  /** bucket start dates within the range, ascending */
  buckets: string[];
}

export function computeAggregate(input: AggregateInput): DashboardAggregate {
  const { initialBalance, transactions, accountId, rangeStart, rangeEnd, buckets } = input;

  const deltas = transactions.map((tx) => ({
    on: tx.occurred_on,
    delta: txDelta(tx, accountId),
  }));

  const sumBefore = (cutoffExclusive: string) =>
    deltas.reduce((acc, d) => (d.on < cutoffExclusive ? acc + d.delta : acc), 0);

  const startBalance = initialBalance + sumBefore(rangeStart);

  let income = 0;
  let expenses = 0;
  for (const d of deltas) {
    if (d.on < rangeStart || d.on >= rangeEnd) continue;
    if (d.delta > 0) income += d.delta;
    else expenses += -d.delta;
  }

  const curve: CurvePoint[] = buckets.map((bucket, i) => {
    const cutoff = buckets[i + 1] ?? rangeEnd;
    return { date: bucket, balance: initialBalance + sumBefore(cutoff) };
  });

  return {
    startBalance,
    income,
    expenses,
    endBalance: startBalance + income - expenses,
    curve,
  };
}

export interface Variation {
  /** signed absolute change vs the equivalent previous period */
  amount: number;
  /** signed percentage, or null when the previous baseline was 0 */
  percent: number | null;
}

/**
 * `current` vs `previousBaseline` (the account balance at the end of the
 * equivalent previous window). SCREEN-4 § 3 "+17 800 F (9,29 %) vs Hier".
 */
export function computeVariation(current: number, previousBaseline: number): Variation {
  const amount = current - previousBaseline;
  const percent =
    previousBaseline === 0 ? null : (amount / Math.abs(previousBaseline)) * 100;
  return { amount, percent };
}
