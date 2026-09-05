import { test } from "node:test";
import assert from "node:assert/strict";

import {
  computeAggregate,
  computeVariation,
  txDelta,
  type TxRow,
} from "../../lib/dashboard/aggregates.ts";

const A = "acc-1";
const B = "acc-2";

const tx = (o: Partial<TxRow>): TxRow => ({
  type: "expense",
  amount: 0,
  occurred_on: "2026-09-10",
  created_at: "2026-09-10T12:00:00Z",
  status: "done",
  source_account_id: null,
  destination_account_id: null,
  ...o,
});

test("txDelta: income into the account counts only when settled", () => {
  assert.equal(txDelta(tx({ type: "income", amount: 5000, destination_account_id: A, status: "done" }), A), 5000);
  assert.equal(txDelta(tx({ type: "income", amount: 5000, destination_account_id: A, status: "received" }), A), 5000);
  assert.equal(txDelta(tx({ type: "income", amount: 5000, destination_account_id: A, status: "planned" }), A), 0);
  assert.equal(txDelta(tx({ type: "income", amount: 5000, destination_account_id: B, status: "done" }), A), 0);
});

test("txDelta: expense out of the account, only when done", () => {
  assert.equal(txDelta(tx({ type: "expense", amount: 1200, source_account_id: A }), A), -1200);
  assert.equal(txDelta(tx({ type: "expense", amount: 1200, source_account_id: A, status: "refunded" }), A), 0);
  assert.equal(txDelta(tx({ type: "expense", amount: 1200, source_account_id: B }), A), 0);
});

test("txDelta: transfer moves between the two accounts", () => {
  const t = tx({ type: "transfer", amount: 3000, source_account_id: A, destination_account_id: B });
  assert.equal(txDelta(t, A), -3000);
  assert.equal(txDelta(t, B), 3000);
});

test("computeAggregate: start balance folds in everything before the range", () => {
  const r = computeAggregate({
    initialBalance: 100_000,
    accountId: A,
    transactions: [
      tx({ type: "income", amount: 50_000, destination_account_id: A, occurred_on: "2026-08-31", status: "done" }),
      tx({ type: "expense", amount: 20_000, source_account_id: A, occurred_on: "2026-09-05" }),
      tx({ type: "income", amount: 90_000, destination_account_id: A, occurred_on: "2026-09-12", status: "received" }),
    ],
    rangeStart: "2026-09-01",
    rangeEnd: "2026-09-18",
    buckets: ["2026-09-01", "2026-09-05", "2026-09-12"],
  });
  assert.equal(r.startBalance, 150_000); // 100k + 50k before Sept
  assert.equal(r.income, 90_000);
  assert.equal(r.expenses, 20_000);
  assert.equal(r.endBalance, 220_000);
  assert.deepEqual(r.curve.map((p) => p.balance), [150_000, 130_000, 220_000]);
  assert.equal(r.curve.at(-1)!.balance, r.endBalance);
});

test("computeAggregate: empty history → flat at the initial balance", () => {
  const r = computeAggregate({
    initialBalance: 0,
    accountId: A,
    transactions: [],
    rangeStart: "2026-09-01",
    rangeEnd: "2026-09-18",
    buckets: ["2026-09-01", "2026-09-10"],
  });
  assert.equal(r.startBalance, 0);
  assert.equal(r.income, 0);
  assert.equal(r.expenses, 0);
  assert.deepEqual(r.curve.map((p) => p.balance), [0, 0]);
});

test("computeAggregate hour: stepped per transaction, closes on the end balance", () => {
  const r = computeAggregate({
    initialBalance: 10_000,
    accountId: A,
    granularity: "hour",
    transactions: [
      tx({ type: "income", amount: 20_000, destination_account_id: A, occurred_on: "2026-09-17", created_at: "2026-09-17T06:22:00Z", status: "done" }),
      tx({ type: "expense", amount: 5_000, source_account_id: A, occurred_on: "2026-09-17", created_at: "2026-09-17T09:40:00Z" }),
      // yesterday — folds into the start balance, not a curve point
      tx({ type: "expense", amount: 3_000, source_account_id: A, occurred_on: "2026-09-16", created_at: "2026-09-16T20:00:00Z" }),
    ],
    rangeStart: "2026-09-17",
    rangeEnd: "2026-09-18",
    buckets: ["2026-09-17"],
    now: "2026-09-17T11:00:00Z",
  });
  assert.equal(r.startBalance, 7_000); // 10k − 3k yesterday
  assert.equal(r.endBalance, 22_000); // 7k + 20k − 5k
  assert.deepEqual(
    r.curve.map((p) => p.balance),
    [7_000, 27_000, 22_000, 22_000],
  );
  assert.equal(r.curve[1]!.at, "2026-09-17T06:22:00Z");
  assert.equal(r.curve[0]!.at, undefined);
  // The closing point sits at the real current time, not pinned to end-of-day
  // — pinning it there wrapped the curve back on itself when "now" isn't
  // actually midnight yet (Elias caught this testing at 2 a.m.).
  assert.equal(r.curve[3]!.at, "2026-09-17T11:00:00Z");
});

test("computeAggregate hour: closing point falls back to the last transaction's time when `now` is omitted", () => {
  const r = computeAggregate({
    initialBalance: 0,
    accountId: A,
    granularity: "hour",
    transactions: [
      tx({ type: "income", amount: 1_000, destination_account_id: A, occurred_on: "2026-09-17", created_at: "2026-09-17T02:15:00Z", status: "done" }),
    ],
    rangeStart: "2026-09-17",
    rangeEnd: "2026-09-18",
    buckets: ["2026-09-17"],
  });
  assert.equal(r.curve.at(-1)!.at, "2026-09-17T02:15:00Z");
});

test("computeAggregate hour: no transactions today → single start point", () => {
  const r = computeAggregate({
    initialBalance: 4_000,
    accountId: A,
    granularity: "hour",
    transactions: [],
    rangeStart: "2026-09-17",
    rangeEnd: "2026-09-18",
    buckets: ["2026-09-17"],
  });
  assert.deepEqual(r.curve.map((p) => p.balance), [4_000]);
});

test("computeVariation: amount + percent, null baseline when 0", () => {
  assert.deepEqual(computeVariation(182_900, 165_100), {
    amount: 17_800,
    percent: (17_800 / 165_100) * 100,
  });
  assert.deepEqual(computeVariation(5_000, 0), { amount: 5_000, percent: null });
  assert.equal(computeVariation(90, 100).amount, -10);
});
