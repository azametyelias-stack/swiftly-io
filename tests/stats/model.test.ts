import { test } from "node:test";
import assert from "node:assert/strict";

import {
  aggregate,
  availableReportKeys,
  breakdown,
  buildReport,
  computeScore,
  isReportKey,
  previousReportKey,
  reportPeriodRange,
  scoreTier,
  variation,
  withOthers,
  type StatTx,
} from "../../lib/stats/model.ts";

const tx = (o: Partial<StatTx>): StatTx => ({
  type: "expense",
  amount: 0,
  occurred_on: "2026-06-10",
  status: "done",
  scoring_axis: null,
  category: null,
  source_account: null,
  destination_account: null,
  linked_to: null,
  ...o,
});

test("aggregate: settled only, active/passive + invest/conso split", () => {
  const a = aggregate([
    tx({ type: "income", amount: 100_000, status: "done", scoring_axis: "active", linked_to: { type: "person", id: "p1", name: "A" } }),
    tx({ type: "income", amount: 30_000, status: "received", scoring_axis: "passive", linked_to: { type: "project", id: "pr1", name: "P" } }),
    tx({ type: "income", amount: 5_000, status: "planned" }), // ignored
    tx({ type: "expense", amount: 40_000, status: "done", scoring_axis: "consumption" }),
    tx({ type: "expense", amount: 20_000, status: "done", scoring_axis: "investment" }),
    tx({ type: "expense", amount: 9_000, status: "refunded" }), // ignored
    tx({ type: "transfer", amount: 99_999 }), // neutral, ignored
  ]);
  assert.equal(a.income, 130_000);
  assert.equal(a.expenses, 60_000);
  assert.equal(a.net, 70_000);
  assert.equal(a.activeIncome, 100_000);
  assert.equal(a.passiveIncome, 30_000);
  assert.equal(a.investmentExpense, 20_000);
  assert.equal(a.consumptionExpense, 40_000);
  assert.equal(a.incomeSourceCount, 2);
});

test("breakdown: sorted desc with shares", () => {
  const b = breakdown(
    [
      tx({ type: "expense", amount: 8_000, category: { id: "c1", name: "Transport", color: "#111111" } }),
      tx({ type: "expense", amount: 12_000, category: { id: "c2", name: "Loisirs", color: "#222222" } }),
      tx({ type: "expense", amount: 3_000, category: { id: "c1", name: "Transport", color: "#111111" } }),
    ],
    "expense",
    "category",
  );
  assert.deepEqual(b.map((e) => e.label), ["Loisirs", "Transport"]);
  assert.equal(b[0]!.amount, 12_000);
  assert.equal(b[1]!.amount, 11_000);
  assert.ok(Math.abs(b[0]!.share - 12 / 23) < 1e-9);
});

test("withOthers folds the tail", () => {
  const entries = [1, 2, 3, 4, 5, 6].map((n) => ({
    key: `k${n}`,
    label: `L${n}`,
    color: null,
    amount: n * 1000,
    count: 1,
    share: n / 21,
  }));
  const folded = withOthers(entries.slice().reverse(), 4, "Autres");
  assert.equal(folded.length, 5);
  assert.equal(folded[4]!.label, "Autres");
  assert.equal(folded[4]!.amount, 3000); // 2000 + 1000
});

test("computeScore: weighted, tiers", () => {
  const s = computeScore(
    aggregate([
      tx({ type: "income", amount: 100_000, status: "done", scoring_axis: "active", linked_to: { type: "person", id: "p", name: "x" } }),
      tx({ type: "income", amount: 50_000, status: "received", scoring_axis: "passive", linked_to: { type: "project", id: "q", name: "y" } }),
      tx({ type: "expense", amount: 50_000, status: "done", scoring_axis: "consumption" }),
      tx({ type: "expense", amount: 50_000, status: "done", scoring_axis: "investment" }),
    ]),
  );
  // liberte = 50k/100k = 50 ; invest = 50k/100k = 50 ; epargne = (150-100)/150 = 33.3 ; divers = 2 -> 50
  // score = .4*50 + .25*50 + .25*33.3 + .1*50 = 20 + 12.5 + 8.33 + 5 = ~46
  assert.ok(s.score >= 44 && s.score <= 48, `score was ${s.score}`);
  assert.equal(s.tier, "moyen");
  assert.equal(s.criteria.find((c) => c.key === "diversification")!.value, 2);
});

test("scoreTier thresholds", () => {
  assert.equal(scoreTier(40), "faible");
  assert.equal(scoreTier(41), "moyen");
  assert.equal(scoreTier(61), "bon");
  assert.equal(scoreTier(81), "excellent");
});

test("variation: null baseline", () => {
  assert.equal(variation(10, 0), null);
  assert.equal(variation(120, 100), 20);
});

test("report periods", () => {
  assert.deepEqual(reportPeriodRange("2026-06"), {
    key: "2026-06",
    type: "monthly",
    start: "2026-06-01",
    end: "2026-07-01",
  });
  assert.deepEqual(reportPeriodRange("2025"), {
    key: "2025",
    type: "annual",
    start: "2025-01-01",
    end: "2026-01-01",
  });
  assert.equal(previousReportKey("2026-01"), "2025-12");
  assert.equal(previousReportKey("2026"), "2025");
  assert.equal(isReportKey("2026-06"), true);
  assert.equal(isReportKey("2026-6"), false);
  assert.equal(isReportKey("nope"), false);
});

test("availableReportKeys: completed months newest first + completed years", () => {
  const keys = availableReportKeys(new Date("2027-02-15T00:00:00Z"), "2025-11");
  // months Nov 2025 .. Jan 2027 (Feb 2027 excluded), plus year 2026 (complete)
  assert.equal(keys[0], "2027-01");
  assert.ok(keys.includes("2025-11"));
  assert.ok(keys.includes("2026"));
  assert.ok(!keys.includes("2027")); // not complete
  assert.equal(availableReportKeys(new Date(), null).length, 0);
});

test("buildReport: overview, score delta, priority, strengths", () => {
  const current: StatTx[] = [
    tx({ type: "income", amount: 200_000, occurred_on: "2026-06-05", status: "done", scoring_axis: "active", linked_to: { type: "person", id: "p", name: "Job" } }),
    tx({ type: "expense", amount: 120_000, occurred_on: "2026-06-10", status: "done", scoring_axis: "consumption", category: { id: "c", name: "Vie", color: "#333333" } }),
  ];
  const previous: StatTx[] = [
    tx({ type: "income", amount: 150_000, occurred_on: "2026-05-05", status: "done", scoring_axis: "active", linked_to: { type: "person", id: "p", name: "Job" } }),
    tx({ type: "expense", amount: 150_000, occurred_on: "2026-05-10", status: "done", scoring_axis: "consumption" }),
  ];
  const r = buildReport({ periodKey: "2026-06", now: new Date("2026-07-02T00:00:00Z"), current, previous });
  assert.equal(r.periodType, "monthly");
  assert.equal(r.overview.income, 200_000);
  assert.equal(r.overview.expenses, 120_000);
  assert.equal(r.overview.net, 80_000);
  assert.equal(r.overview.incomeVariation, variation(200_000, 150_000));
  assert.equal(r.score.delta !== null, true);
  // liberte has weight .4 and value 0 (no passive) → biggest lever
  assert.equal(r.priorityCriterion, "liberte");
  // net went from -0 to +80k and savings rate improved → a strength
  assert.ok(r.strengths.length >= 1);
  assert.equal(r.topExpenseCategories[0]?.label, "Vie");
});
