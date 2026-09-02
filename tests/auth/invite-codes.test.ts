import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INVITE_CODE_LENGTH,
  INVITE_CODE_SPACE,
  INVITE_CODE_TTL_DAYS,
  classifyInviteCode,
  formatInviteCode,
  generateInviteCode,
  generateInviteCodes,
  inviteCodeHash,
  inviteExpiresAt,
  isValidInviteCodeShape,
  normalizeInviteCode,
  verifyInviteCode,
} from "../../lib/auth/invite-codes.ts";

const PEPPER = "test-pepper-not-a-real-secret-0000000000";

test("generateInviteCode: exactly 6 digits, leading zeros allowed", () => {
  let sawLeadingZero = false;
  for (let i = 0; i < 3000; i++) {
    const code = generateInviteCode();
    assert.match(code, /^\d{6}$/);
    if (code[0] === "0") sawLeadingZero = true;
  }
  assert.ok(sawLeadingZero, "expected at least one code starting with 0 over 3000 draws");
});

test("generateInviteCode: roughly uniform (no modulo bias in the low digit)", () => {
  const buckets = new Array(10).fill(0);
  const N = 20_000;
  for (let i = 0; i < N; i++) buckets[Number(generateInviteCode()[5])]++;
  const expected = N / 10;
  for (const c of buckets) assert.ok(Math.abs(c - expected) < expected * 0.2, `skewed: ${buckets}`);
});

test("generateInviteCodes: N distinct codes; rejects out-of-range counts", () => {
  const codes = generateInviteCodes(20);
  assert.equal(codes.length, 20);
  assert.equal(new Set(codes).size, 20);
  assert.equal(generateInviteCodes(1).length, 1);
  assert.throws(() => generateInviteCodes(0), RangeError);
  assert.throws(() => generateInviteCodes(-3), RangeError);
  assert.throws(() => generateInviteCodes(1.5), RangeError);
  assert.throws(() => generateInviteCodes(9999), RangeError);
});

test("constants match the SCREEN-2 6-digit decision", () => {
  assert.equal(INVITE_CODE_LENGTH, 6);
  assert.equal(INVITE_CODE_SPACE, 1_000_000);
  assert.equal(INVITE_CODE_TTL_DAYS, 30);
});

test("normalizeInviteCode / formatInviteCode: digits only", () => {
  assert.equal(normalizeInviteCode(" 12-34 56 "), "123456");
  assert.equal(normalizeInviteCode("abc123def456"), "123456");
  assert.equal(formatInviteCode("12 34 56"), "123456");
});

test("isValidInviteCodeShape: only a real 6-digit code passes", () => {
  assert.equal(isValidInviteCodeShape(generateInviteCode()), true);
  assert.equal(isValidInviteCodeShape("004821"), true);
  assert.equal(isValidInviteCodeShape("1 2 3 4 5 6"), true);
  assert.equal(isValidInviteCodeShape("12345"), false);
  assert.equal(isValidInviteCodeShape("1234567"), false);
  assert.equal(isValidInviteCodeShape(""), false);
  assert.equal(isValidInviteCodeShape("12ab56"), false);
});

test("inviteCodeHash: HMAC-keyed — pepper changes the digest, and is required", () => {
  const code = generateInviteCode();
  const h = inviteCodeHash(code, PEPPER);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(inviteCodeHash(code, PEPPER), h);
  assert.equal(inviteCodeHash(formatInviteCode(` ${code} `), PEPPER), h); // whitespace ignored
  assert.notEqual(inviteCodeHash(code, "a-different-pepper"), h);
  assert.notEqual(inviteCodeHash(generateInviteCode(), PEPPER), h);
  assert.throws(() => inviteCodeHash(code, ""), /pepper is required/);
});

test("verifyInviteCode: constant-time match, false (no throw) on mismatch/garbage", () => {
  const code = generateInviteCode();
  const stored = inviteCodeHash(code, PEPPER);
  assert.equal(verifyInviteCode(code, stored, PEPPER), true);
  assert.equal(verifyInviteCode(` ${code} `, stored, PEPPER), true);
  assert.equal(verifyInviteCode(code, stored, "wrong-pepper"), false);
  assert.equal(verifyInviteCode("000000", stored, PEPPER), false);
  assert.equal(verifyInviteCode(code, "not-hex-!!", PEPPER), false);
  assert.equal(verifyInviteCode(code, "abcd", PEPPER), false);
});

test("inviteExpiresAt: 30 days out by default", () => {
  const from = new Date("2026-01-01T00:00:00.000Z");
  assert.equal(inviteExpiresAt(from).toISOString(), "2026-01-31T00:00:00.000Z");
});

test("classifyInviteCode: unknown / used / expired / valid", () => {
  const code = generateInviteCode();
  const codeHash = inviteCodeHash(code, PEPPER);
  const future = new Date(Date.now() + 864e5);
  const past = new Date(Date.now() - 864e5);

  assert.equal(classifyInviteCode(null, code, PEPPER), "unknown");
  assert.equal(classifyInviteCode(undefined, code, PEPPER), "unknown");
  assert.equal(classifyInviteCode({ codeHash, usedAt: null, expiresAt: future }, "999999", PEPPER), "unknown");
  assert.equal(
    classifyInviteCode({ codeHash, usedAt: new Date().toISOString(), expiresAt: future }, code, PEPPER),
    "used",
  );
  assert.equal(classifyInviteCode({ codeHash, usedAt: null, expiresAt: past }, code, PEPPER), "expired");
  assert.equal(classifyInviteCode({ codeHash, usedAt: null, expiresAt: future }, code, PEPPER), "valid");
});

test("classifyInviteCode: expiry is exclusive at the exact instant", () => {
  const code = generateInviteCode();
  const codeHash = inviteCodeHash(code, PEPPER);
  const now = new Date("2026-06-01T12:00:00.000Z");
  assert.equal(classifyInviteCode({ codeHash, usedAt: null, expiresAt: now }, code, PEPPER, now), "expired");
  assert.equal(
    classifyInviteCode({ codeHash, usedAt: null, expiresAt: new Date(now.getTime() + 1) }, code, PEPPER, now),
    "valid",
  );
});
