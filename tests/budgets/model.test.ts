import { test } from "node:test";
import assert from "node:assert/strict";

import {
  budgetDraftToPayload,
  budgetFormErrors,
  budgetStatus,
  budgetTone,
  emptyBudgetDraft,
  sortBudgets,
  type BudgetListItem,
} from "../../lib/budgets/model.ts";

const b = (o: Partial<BudgetListItem>): BudgetListItem => ({
  id: "b",
  category: { id: "c", name: "Transport", color: "#111111" },
  allocated_amount: 100_000,
  spent: 0,
  is_favorite: false,
  tx_count: 0,
  created_at: "2026-09-01T00:00:00Z",
  ...o,
});

test("budgetTone thresholds (SCREEN-15 § 5)", () => {
  assert.equal(budgetTone(0), "green");
  assert.equal(budgetTone(0.5), "green");
  assert.equal(budgetTone(0.51), "orange");
  assert.equal(budgetTone(0.91), "orange");
  assert.equal(budgetTone(0.92), "red");
  assert.equal(budgetTone(1.4), "red");
});

test("budgetStatus: percent can exceed 100, over flag", () => {
  const s = budgetStatus(120_000, 100_000);
  assert.equal(s.percent, 120);
  assert.equal(s.tone, "red");
  assert.equal(s.over, true);
  // no allocation, no spend
  assert.equal(budgetStatus(0, 0).percent, 0);
});

test("sortBudgets: frequent by tx_count, alpha by category, amount", () => {
  const rows = [
    b({ id: "1", allocated_amount: 10, tx_count: 1, category: { id: "a", name: "Transport", color: "#1" } }),
    b({ id: "2", allocated_amount: 90, tx_count: 9, category: { id: "b", name: "Alimentation", color: "#2" } }),
  ];
  assert.deepEqual(sortBudgets(rows, "frequent").map((r) => r.id), ["2", "1"]);
  assert.deepEqual(sortBudgets(rows, "alpha").map((r) => r.id), ["2", "1"]);
  assert.deepEqual(sortBudgets(rows, "amount").map((r) => r.id), ["2", "1"]);
});

test("budgetFormErrors + payload", () => {
  assert.deepEqual(budgetFormErrors(emptyBudgetDraft(), false), ["category", "allocated"]);
  assert.deepEqual(budgetFormErrors({ ...emptyBudgetDraft(), allocated: "50000" }, true), []);

  const create = budgetDraftToPayload(
    { categoryId: "c1", allocated: "50 000", isFavorite: true },
    false,
  );
  assert.equal(create.category_id, "c1");
  assert.equal(create.allocated_amount, 50_000);

  const edit = budgetDraftToPayload({ categoryId: "c1", allocated: "60000", isFavorite: false }, true);
  assert.equal(edit.category_id, undefined);
  assert.equal(edit.allocated_amount, 60_000);
});
