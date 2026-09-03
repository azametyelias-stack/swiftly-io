import { test } from "node:test";
import assert from "node:assert/strict";

import {
  emptyTemplateDraft,
  matchesKindFilter,
  sortTemplates,
  templateDraftToPayload,
  templateFormErrors,
  templateToDraft,
  type TemplateListItem,
} from "../../lib/templates/model.ts";

const tpl = (o: Partial<TemplateListItem>): TemplateListItem => ({
  id: "t",
  name: "Loyer",
  description: "",
  kind: "expense",
  amount: 100_000,
  category: null,
  account: null,
  linked_to: null,
  recurrence: "once",
  usage_count: 0,
  is_favorite: false,
  next_run_on: null,
  category_id: null,
  account_id: null,
  linked_to_type: null,
  linked_to_id: null,
  created_at: "2026-09-01T00:00:00Z",
  ...o,
});

test("matchesKindFilter", () => {
  assert.equal(matchesKindFilter("expense", "all"), true);
  assert.equal(matchesKindFilter("expense", "income"), false);
});

test("sortTemplates: frequent, alpha, amount, favorite", () => {
  const rows = [
    tpl({ id: "1", name: "B", amount: 10, usage_count: 1, created_at: "2026-09-01T00:00:00Z" }),
    tpl({ id: "2", name: "A", amount: 90, usage_count: 9, created_at: "2026-09-02T00:00:00Z" }),
    tpl({ id: "3", name: "C", amount: 50, is_favorite: true, created_at: "2026-09-03T00:00:00Z" }),
  ];
  assert.deepEqual(sortTemplates(rows, "frequent").map((r) => r.id), ["2", "1", "3"]);
  assert.deepEqual(sortTemplates(rows, "alpha").map((r) => r.id), ["2", "1", "3"]);
  assert.deepEqual(sortTemplates(rows, "amount").map((r) => r.id), ["2", "3", "1"]);
  assert.deepEqual(sortTemplates(rows, "favorite").map((r) => r.id), ["3", "2", "1"]);
  assert.deepEqual(sortTemplates(rows, "recent").map((r) => r.id), ["3", "2", "1"]);
});

test("templateToDraft: expense uses source account, income uses destination", () => {
  const exp = templateToDraft(tpl({ kind: "expense", account_id: "a1", amount: 5000 }));
  assert.equal(exp.sourceAccountId, "a1");
  assert.equal(exp.destinationAccountId, null);
  assert.equal(exp.amount, "5000");

  const inc = templateToDraft(tpl({ kind: "income", account_id: "a2" }));
  assert.equal(inc.destinationAccountId, "a2");
  assert.equal(inc.sourceAccountId, null);
});

test("templateFormErrors: name + amount + linked-to pair", () => {
  assert.deepEqual(templateFormErrors(emptyTemplateDraft()), ["name", "amount"]);
  assert.deepEqual(
    templateFormErrors({
      ...emptyTemplateDraft(),
      name: "X",
      amount: "1000",
      linkedToType: "person",
      linkedToId: null,
    }),
    ["linkedTo"],
  );
  assert.deepEqual(
    templateFormErrors({ ...emptyTemplateDraft(), name: "X", amount: "1000" }),
    [],
  );
});

test("templateDraftToPayload strips a half-filled linked-to and trims text", () => {
  const p = templateDraftToPayload({
    ...emptyTemplateDraft(),
    name: "  Loyer  ",
    description: " maison ",
    amount: "120 000",
    linkedToType: "person",
    linkedToId: null,
    recurrence: "monthly",
  });
  assert.equal(p.name, "Loyer");
  assert.equal(p.description, "maison");
  assert.equal(p.amount, 120_000);
  assert.equal(p.linked_to_type, null);
  assert.equal(p.linked_to_id, null);
  assert.equal(p.recurrence, "monthly");
});
