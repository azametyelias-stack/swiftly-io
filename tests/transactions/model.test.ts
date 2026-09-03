import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bucketFor,
  canAdvance,
  countsTowardBalance,
  directionOf,
  draftToPayload,
  emptyDraft,
  groupByPeriod,
  matchesTypeFilter,
  parseAmount,
  resolveScoringAxis,
  sortRows,
  stepErrors,
  transactionToDraft,
  type SortableRow,
  type TxDraft,
} from "../../lib/transactions/model.ts";

const TODAY = "2026-09-17"; // a Thursday

test("directionOf / countsTowardBalance mirror the balance rules", () => {
  assert.equal(directionOf("expense"), "out");
  assert.equal(directionOf("income"), "in");
  assert.equal(directionOf("transfer"), "neutral");

  assert.equal(countsTowardBalance("income", "done"), true);
  assert.equal(countsTowardBalance("income", "received"), true);
  assert.equal(countsTowardBalance("income", "planned"), false);
  assert.equal(countsTowardBalance("expense", "done"), true);
  assert.equal(countsTowardBalance("expense", "refunded"), false);
  assert.equal(countsTowardBalance("transfer", "done"), true);
});

test("resolveScoringAxis: expense from category, income from linked, transfer null", () => {
  assert.equal(
    resolveScoringAxis({ type: "expense", categoryAxis: "investment" }),
    "investment",
  );
  assert.equal(resolveScoringAxis({ type: "expense", categoryAxis: null }), null);
  assert.equal(
    resolveScoringAxis({ type: "income", linkedToType: "person" }),
    "active",
  );
  assert.equal(
    resolveScoringAxis({ type: "income", linkedToType: "project" }),
    "passive",
  );
  assert.equal(resolveScoringAxis({ type: "transfer" }), null);
});

test("bucketFor: today / yesterday / this-week / last-week / months", () => {
  assert.equal(bucketFor("2026-09-17", TODAY).id, "today");
  assert.equal(bucketFor("2026-09-16", TODAY).id, "yesterday");
  assert.equal(bucketFor("2026-09-15", TODAY).id, "this-week"); // Monday
  assert.equal(bucketFor("2026-09-10", TODAY).id, "last-week");
  assert.equal(bucketFor("2026-09-02", TODAY).id, "this-month");
  assert.equal(bucketFor("2026-08-20", TODAY).id, "last-month");
  assert.equal(bucketFor("2026-06-01", TODAY).id, "2026-06");
});

test("groupByPeriod: newest section first, rows keep their order", () => {
  const rows = [
    { id: "a", occurred_on: "2026-09-17" },
    { id: "b", occurred_on: "2026-08-01" },
    { id: "c", occurred_on: "2026-09-17" },
  ];
  const g = groupByPeriod(rows, TODAY);
  assert.deepEqual(
    g.map((x) => x.id),
    ["today", "last-month"],
  );
  assert.deepEqual(g[0]!.rows.map((r) => r.id), ["a", "c"]);
});

test("matchesTypeFilter", () => {
  assert.equal(matchesTypeFilter("expense", "all"), true);
  assert.equal(matchesTypeFilter("expense", "expense"), true);
  assert.equal(matchesTypeFilter("expense", "income"), false);
});

test("sortRows: amount desc, alpha, frequent", () => {
  const rows: SortableRow[] = [
    { id: "1", occurred_on: "2026-09-10", amount: 100, label: "Zèbre" },
    { id: "2", occurred_on: "2026-09-11", amount: 900, label: "Auto" },
    { id: "3", occurred_on: "2026-09-12", amount: 100, label: "Auto" },
  ];
  assert.deepEqual(sortRows(rows, "amount").map((r) => r.id), ["2", "3", "1"]);
  assert.deepEqual(sortRows(rows, "alpha").map((r) => r.id), ["3", "2", "1"]);
  assert.deepEqual(sortRows(rows, "frequent").map((r) => r.id)[0], "3"); // "Auto" x2
  assert.deepEqual(sortRows(rows, "recent").map((r) => r.id), ["3", "2", "1"]);
});

test("parseAmount: digits only, strictly positive", () => {
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("1 500"), 1500);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount("15000"), 15000);
});

test("stepErrors: expense wizard", () => {
  const d = emptyDraft("expense");
  assert.deepEqual(stepErrors(d, 1).sort(), ["account", "amount"]);
  d.amount = "15000";
  d.sourceAccountId = "acc-1";
  assert.deepEqual(stepErrors(d, 1), []);
  // step 2: category optional, "lié à" must be complete
  assert.deepEqual(stepErrors(d, 2), []);
  d.linkedToType = "person";
  assert.deepEqual(stepErrors(d, 2), ["linked-to"]);
  d.linkedToId = "p-1";
  assert.deepEqual(stepErrors(d, 2), []);
});

test("stepErrors: income requires category + linked, transfer requires distinct accounts", () => {
  const inc = emptyDraft("income");
  inc.amount = "9000";
  inc.destinationAccountId = "acc-1";
  assert.deepEqual(stepErrors(inc, 2).sort(), ["category", "linked-to"]);

  const tr = emptyDraft("transfer");
  tr.amount = "1000";
  tr.sourceAccountId = "acc-1";
  assert.deepEqual(stepErrors(tr, 2), ["destination"]);
  tr.destinationAccountId = "acc-1";
  assert.deepEqual(stepErrors(tr, 2), ["same-account"]);
  tr.destinationAccountId = "acc-2";
  assert.deepEqual(stepErrors(tr, 2), []);
});

test("draftToPayload: expense shape", () => {
  const d: TxDraft = {
    ...emptyDraft("expense"),
    amount: "1 500",
    sourceAccountId: "acc-1",
    categoryId: "cat-1",
    note: "  Spaghetti  ",
    datePreset: "yesterday",
  };
  const p = draftToPayload(d, TODAY);
  assert.equal(p.type, "expense");
  assert.equal(p.amount, 1500);
  assert.equal(p.occurred_on, "2026-09-16");
  assert.equal(p.source_account_id, "acc-1");
  assert.equal(p.category_id, "cat-1");
  assert.equal(p.note, "Spaghetti");
  assert.equal("destination_account_id" in p, false);
});

test("draftToPayload: transfer carries no category/status/recurrence", () => {
  const d: TxDraft = {
    ...emptyDraft("transfer"),
    amount: "10000",
    sourceAccountId: "a",
    destinationAccountId: "b",
  };
  const p = draftToPayload(d, TODAY);
  assert.equal(p.source_account_id, "a");
  assert.equal(p.destination_account_id, "b");
  assert.equal("category_id" in p, false);
  assert.equal("status" in p, false);
  assert.equal("recurrence" in p, false);
});

test("transactionToDraft round-trips through the wizard", () => {
  const draft = transactionToDraft(
    {
      type: "income",
      amount: 90000,
      occurred_on: "2026-09-16",
      source_account_id: null,
      destination_account_id: "acc-2",
      category_id: "cat-sal",
      linked_to_type: "person",
      linked_to_id: "p-9",
      note: "Salaire",
      status: "received",
      recurrence: "monthly",
    },
    TODAY,
  );
  assert.equal(draft.datePreset, "yesterday");
  assert.equal(draft.amount, "90000");
  assert.equal(draft.destinationAccountId, "acc-2");
  assert.equal(draft.recurrence, "monthly");
  assert.equal(canAdvance(draft, 2), true);
});
