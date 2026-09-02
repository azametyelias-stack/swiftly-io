import { test } from "node:test";
import assert from "node:assert/strict";

import {
  accountCreateSchema,
  budgetCreateSchema,
  categoryCreateSchema,
  isoDate,
  profileUpdateSchema,
  projectCreateSchema,
  templateCreateSchema,
  transactionCreateSchema,
} from "../../lib/validation/schemas.ts";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

test("isoDate: accepts a real date, rejects a fake one", () => {
  assert.equal(isoDate.safeParse("2026-09-02").success, true);
  assert.equal(isoDate.safeParse("2026-02-31").success, false); // no Feb 31
  assert.equal(isoDate.safeParse("02/09/2026").success, false);
});

test("accountCreateSchema: minimal valid payload, defaults applied", () => {
  const r = accountCreateSchema.safeParse({ name: "Wave", type: "mobile" });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.initial_balance, 0);
    assert.equal(r.data.currency, "XOF");
    assert.equal(r.data.is_favorite, false);
  }
});

test("accountCreateSchema: rejects unknown keys and bad type", () => {
  assert.equal(
    accountCreateSchema.safeParse({ name: "x", type: "mobile", hacker: 1 }).success,
    false,
  );
  assert.equal(
    accountCreateSchema.safeParse({ name: "x", type: "crypto" }).success,
    false,
  );
});

test("accountCreateSchema: fee amount and fee type must come together", () => {
  assert.equal(
    accountCreateSchema.safeParse({ name: "x", type: "bank", monthly_fee: 800 }).success,
    false,
  );
  assert.equal(
    accountCreateSchema.safeParse({
      name: "x",
      type: "bank",
      monthly_fee: 800,
      fee_type: "fixed",
    }).success,
    true,
  );
});

test("accountCreateSchema: does not accept server-controlled fields", () => {
  const r = accountCreateSchema.safeParse({
    name: "x",
    type: "cash",
    is_primary: true,
  });
  assert.equal(r.success, false); // .strict() rejects it
});

test("transaction expense: needs a source account, amount > 0", () => {
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "expense",
      amount: 1500,
      source_account_id: UUID,
    }).success,
    true,
  );
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "expense",
      amount: 0,
      source_account_id: UUID,
    }).success,
    false,
  );
  assert.equal(
    transactionCreateSchema.safeParse({ type: "expense", amount: 1500 }).success,
    false,
  );
});

test("transaction expense: partial 'lié à' is rejected", () => {
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "expense",
      amount: 10,
      source_account_id: UUID,
      linked_to_type: "person",
    }).success,
    false,
  );
});

test("transaction income: category and 'lié à' are required (SCREEN-9)", () => {
  const base = {
    type: "income",
    amount: 90000,
    destination_account_id: UUID,
  };
  assert.equal(transactionCreateSchema.safeParse(base).success, false);
  assert.equal(
    transactionCreateSchema.safeParse({
      ...base,
      category_id: UUID,
      linked_to_type: "person",
      linked_to_id: UUID2,
    }).success,
    true,
  );
});

test("transaction transfer: source must differ from destination, no category", () => {
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "transfer",
      amount: 5000,
      source_account_id: UUID,
      destination_account_id: UUID,
    }).success,
    false,
  );
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "transfer",
      amount: 5000,
      source_account_id: UUID,
      destination_account_id: UUID2,
    }).success,
    true,
  );
  assert.equal(
    transactionCreateSchema.safeParse({
      type: "transfer",
      amount: 5000,
      source_account_id: UUID,
      destination_account_id: UUID2,
      category_id: UUID,
    }).success,
    false,
  );
});

test("transaction: unknown type is rejected", () => {
  assert.equal(
    transactionCreateSchema.safeParse({ type: "gift", amount: 1 }).success,
    false,
  );
});

test("budgetCreateSchema: needs category + positive allocation", () => {
  assert.equal(
    budgetCreateSchema.safeParse({ category_id: UUID, allocated_amount: 100000 }).success,
    true,
  );
  assert.equal(
    budgetCreateSchema.safeParse({ category_id: UUID, allocated_amount: -1 }).success,
    false,
  );
});

test("projectCreateSchema: target_amount optional, defaults applied", () => {
  const r = projectCreateSchema.safeParse({ name: "Maison" });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.status, "active");
    assert.equal(r.data.target_amount ?? null, null);
  }
});

test("templateCreateSchema: kind + amount required", () => {
  assert.equal(
    templateCreateSchema.safeParse({ name: "Loyer", kind: "expense", amount: 120000 }).success,
    true,
  );
  assert.equal(
    templateCreateSchema.safeParse({ name: "Loyer", kind: "expense" }).success,
    false,
  );
});

test("categoryCreateSchema: colour must be a 6-digit hex", () => {
  assert.equal(
    categoryCreateSchema.safeParse({ name: "Santé", kind: "expense", color: "#12AB34" }).success,
    true,
  );
  assert.equal(
    categoryCreateSchema.safeParse({ name: "Santé", kind: "expense", color: "red" }).success,
    false,
  );
});

test("profileUpdateSchema: email cannot be set, name needs 2 chars", () => {
  assert.equal(profileUpdateSchema.safeParse({ email: "x@y.z" }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ name: "A" }).success, false);
  assert.equal(profileUpdateSchema.safeParse({ name: "Elias", theme: "dark" }).success, true);
});
