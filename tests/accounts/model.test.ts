import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountFormErrors,
  accountToDraft,
  bpToPercent,
  draftToAccountPayload,
  emptyAccountDraft,
  parseWholeAmount,
  percentToBp,
  sortAccounts,
  type AccountCardData,
} from "../../lib/accounts/model.ts";

const card = (o: Partial<AccountCardData>): AccountCardData => ({
  id: "a",
  name: "Compte",
  type: "cash",
  currency: "XOF",
  balance: 0,
  initial_balance: 0,
  monthly_fee: null,
  fee_type: null,
  provider: null,
  card_network: null,
  account_number: null,
  notes: null,
  is_primary: false,
  is_favorite: false,
  is_archived: false,
  created_at: "2026-09-01T00:00:00Z",
  ...o,
});

test("parseWholeAmount: empty = 0, digits only, rejects negatives", () => {
  assert.equal(parseWholeAmount(""), 0);
  assert.equal(parseWholeAmount("50 000"), 50_000);
  assert.equal(parseWholeAmount("1.5"), 15); // strips the dot
});

test("percent <-> basis points", () => {
  assert.equal(percentToBp(0.5), 50);
  assert.equal(bpToPercent(50), 0.5);
});

test("sortAccounts: primary leads 'recent', balance desc, favorite first", () => {
  const rows = [
    card({ id: "1", balance: 10, created_at: "2026-09-01T00:00:00Z" }),
    card({
      id: "2",
      balance: 90,
      is_primary: true,
      created_at: "2026-08-01T00:00:00Z",
    }),
    card({
      id: "3",
      balance: 50,
      is_favorite: true,
      created_at: "2026-09-03T00:00:00Z",
    }),
  ];
  assert.deepEqual(
    sortAccounts(rows, "recent").map((r) => r.id),
    ["2", "3", "1"],
  );
  assert.deepEqual(
    sortAccounts(rows, "balance").map((r) => r.id),
    ["2", "3", "1"],
  );
  assert.deepEqual(
    sortAccounts(rows, "favorite").map((r) => r.id),
    ["3", "1", "2"],
  );
});

test("accountFormErrors: name, provider (mobile), network (card), fee value", () => {
  assert.deepEqual(accountFormErrors(emptyAccountDraft()), ["name"]);
  assert.ok(
    accountFormErrors({
      ...emptyAccountDraft(),
      name: "X",
      type: "mobile",
    }).includes("provider"),
  );
  assert.ok(
    accountFormErrors({
      ...emptyAccountDraft(),
      name: "X",
      type: "card",
    }).includes("cardNetwork"),
  );
  assert.ok(
    accountFormErrors({
      ...emptyAccountDraft(),
      name: "X",
      type: "bank",
      hasFee: true,
      feeMode: "fixed",
      feeValue: "",
    }).includes("feeValue"),
  );
  assert.deepEqual(
    accountFormErrors({ ...emptyAccountDraft(), name: "Wave", type: "cash" }),
    [],
  );
});

test("draftToAccountPayload: percent fee stored as basis points, type-scoped fields", () => {
  const p = draftToAccountPayload({
    ...emptyAccountDraft(),
    name: "  BIM  ",
    type: "bank",
    initialBalance: "100 000",
    accountNumber: "SN012",
    hasFee: true,
    feeMode: "percent",
    feeValue: "0,5",
  });
  assert.equal(p.name, "BIM");
  assert.equal(p.initial_balance, 100_000);
  assert.equal(p.monthly_fee, 50);
  assert.equal(p.fee_type, "percent");
  assert.equal(p.account_number, "SN012");
  assert.equal(p.provider, null);

  // fee dropped when the type doesn't allow it
  const cashP = draftToAccountPayload({
    ...emptyAccountDraft(),
    name: "Cash",
    type: "cash",
    hasFee: true,
    feeMode: "fixed",
    feeValue: "800",
  });
  assert.equal(cashP.monthly_fee, null);
  assert.equal(cashP.fee_type, null);
});

test("accountToDraft round-trips a percent fee", () => {
  const d = accountToDraft(
    card({ type: "card", monthly_fee: 125, fee_type: "percent", card_network: "visa" }),
  );
  assert.equal(d.hasFee, true);
  assert.equal(d.feeValue, "1.25");
  assert.equal(d.cardNetwork, "visa");
});
