import { test } from "node:test";
import assert from "node:assert/strict";

import { isOwner } from "../../lib/auth/ownership.ts";

const UID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

test("isOwner is true only when user_id matches", () => {
  assert.equal(isOwner({ user_id: UID }, UID), true);
});

test("isOwner is false for a different owner", () => {
  assert.equal(isOwner({ user_id: OTHER }, UID), false);
});

test("isOwner is false for a missing row", () => {
  assert.equal(isOwner(null, UID), false);
  assert.equal(isOwner(undefined, UID), false);
});

test("isOwner is false when the row has no owner", () => {
  assert.equal(isOwner({ user_id: null }, UID), false);
  assert.equal(isOwner({}, UID), false);
});

test("isOwner is false when userId is empty", () => {
  assert.equal(isOwner({ user_id: "" }, ""), false);
});
