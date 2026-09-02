import { test } from "node:test";
import assert from "node:assert/strict";

import { createInvitationsSchema, inviteSignupSchema } from "../../lib/auth/schemas.ts";
import { generateInviteCode } from "../../lib/auth/invite-codes.ts";

test("inviteSignupSchema: accepts 6 digits, tolerating spaces/dashes from a paste", () => {
  const code = generateInviteCode();
  assert.equal(inviteSignupSchema.safeParse({ code }).success, true);
  assert.equal(inviteSignupSchema.safeParse({ code: "12 34 56" }).success, true);
  assert.equal(inviteSignupSchema.safeParse({ code: "12-34-56" }).success, true);
  assert.equal(inviteSignupSchema.safeParse({ code: `  ${code}  ` }).success, true);
});

test("inviteSignupSchema: rejects non-digits, wrong lengths, wrong types", () => {
  assert.equal(inviteSignupSchema.safeParse({ code: "12345" }).success, false);
  assert.equal(inviteSignupSchema.safeParse({ code: "abcdef" }).success, false);
  assert.equal(inviteSignupSchema.safeParse({ code: "" }).success, false);
  assert.equal(inviteSignupSchema.safeParse({ code: "1".repeat(17) }).success, false);
  assert.equal(inviteSignupSchema.safeParse({ code: 123456 }).success, false);
  assert.equal(inviteSignupSchema.safeParse({ code: null }).success, false);
  assert.equal(inviteSignupSchema.safeParse({}).success, false);
});

test("inviteSignupSchema: strict — no extra keys", () => {
  assert.equal(inviteSignupSchema.safeParse({ code: "123456", username: "x" }).success, false);
});

test("createInvitationsSchema: accepts a sane count and optional note", () => {
  assert.equal(createInvitationsSchema.safeParse({ count: 10 }).success, true);
  assert.equal(createInvitationsSchema.safeParse({ count: 1 }).success, true);
  assert.equal(createInvitationsSchema.safeParse({ count: 100, note: "amis beta" }).success, true);
});

test("createInvitationsSchema: rejects out-of-range / wrong-typed counts", () => {
  for (const count of [0, -1, 101, 1.5, "10", null, undefined]) {
    assert.equal(
      createInvitationsSchema.safeParse({ count }).success,
      false,
      `count=${String(count)} should be rejected`,
    );
  }
});

test("createInvitationsSchema: note capped at 200 chars, strict on extra keys", () => {
  assert.equal(createInvitationsSchema.safeParse({ count: 5, note: "a".repeat(201) }).success, false);
  assert.equal(createInvitationsSchema.safeParse({ count: 5, expires: "soon" }).success, false);
});
