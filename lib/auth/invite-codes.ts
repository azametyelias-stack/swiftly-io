/**
 * Invite-code primitives (SECURITY MASTERPLAN — Point 19: MVP auth = closed-beta
 * invite codes; phone/SMS is Phase 2, OAuth is Phase 3).
 *
 * The auth screens (SCREEN-2 "code d'invitation", SCREEN-3 "username") and the
 * `public.invitation_codes` / `public.users` tables are a later lot, so nothing
 * here is wired to a live route yet. This module is the reusable, dependency-free
 * core the endpoints will build on:
 *
 *   admin  POST /api/admin/create-invitations  → generateInviteCode() × N, store inviteCodeHash(code, pepper)
 *   user   POST /api/auth/verify-code          → classifyInviteCode(row, submittedCode, pepper)   (SCREEN-2)
 *
 * ── Format decision (2026-09-02, Elias) ──────────────────────────────────────
 *   **6 digits**, per SCREEN-2 (six input boxes, easy to share verbally). This
 *   DEVIATES from the masterplan's "length 32". The space is only 10^6, so:
 *
 *     ⚠️  Security here rests on RATE-LIMITING + LOCKOUT (Point 3), NOT on the
 *         code's entropy. The redeem endpoint MUST be hard rate-limited per IP
 *         and per code, with a global attempt ceiling, before it ships.
 *
 *   And because a 6-digit code is trivially brute-forced from a plain hash, the
 *   stored value is an **HMAC-SHA256 keyed with a server-side pepper**
 *   (`INVITE_CODE_PEPPER`, never in the DB) — a DB-only leak then can't recover
 *   the codes. Pass the pepper in from `serverEnv("INVITE_CODE_PEPPER")`; the
 *   pure functions stay testable with a fixed test pepper.
 *
 * Dependency-free apart from `node:crypto` — unit-tested in
 * `tests/auth/invite-codes.test.ts`.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const INVITE_CODE_ALPHABET = "0123456789";
export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_SPACE = 10 ** INVITE_CODE_LENGTH; // 1_000_000
export const INVITE_CODE_TTL_DAYS = 30;

const TTL_MS = INVITE_CODE_TTL_DAYS * 24 * 60 * 60 * 1000;
const MAX_BATCH = 200;

// Largest multiple of INVITE_CODE_SPACE below 2^24 (3 random bytes) — reject
// anything at/above it so `% INVITE_CODE_SPACE` is unbiased.
const REJECT_AT = Math.floor(0x1_00_00_00 / INVITE_CODE_SPACE) * INVITE_CODE_SPACE;

/** One uniformly-random 6-digit code (leading zeros kept: "004821" is valid). */
export function generateInviteCode(): string {
  let n: number;
  do {
    n = randomBytes(3).readUIntBE(0, 3);
  } while (n >= REJECT_AT);
  return String(n % INVITE_CODE_SPACE).padStart(INVITE_CODE_LENGTH, "0");
}

/** `count` distinct invite codes. Throws `RangeError` outside 1…200. */
export function generateInviteCodes(count: number): string[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH) {
    throw new RangeError(`count must be an integer in 1…${MAX_BATCH}`);
  }
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateInviteCode());
  return [...codes];
}

/** Fold whatever the user typed/pasted into canonical form: digits only. */
export function normalizeInviteCode(raw: string): string {
  return String(raw).replace(/\D+/g, "");
}

/** Display form. SCREEN-2 uses six separate boxes, so this is just the digits. */
export function formatInviteCode(code: string): string {
  return normalizeInviteCode(code);
}

/** True when `raw` normalizes to exactly 6 digits. */
export function isValidInviteCodeShape(raw: string): boolean {
  return /^\d{6}$/.test(normalizeInviteCode(raw));
}

/**
 * HMAC-SHA256(normalized code, pepper) as hex — this is the `code_hash` column.
 * `pepper` = `serverEnv("INVITE_CODE_PEPPER")`, a long random string kept out of
 * the database so a DB leak alone can't brute-force the 10^6 code space.
 */
export function inviteCodeHash(code: string, pepper: string): string {
  if (!pepper) throw new Error("inviteCodeHash: pepper is required (INVITE_CODE_PEPPER)");
  return createHmac("sha256", pepper).update(normalizeInviteCode(code), "utf8").digest("hex");
}

/** Constant-time check of a submitted code against a stored `code_hash`. */
export function verifyInviteCode(submitted: string, storedHash: string, pepper: string): boolean {
  const a = Buffer.from(inviteCodeHash(submitted, pepper), "hex");
  let b: Buffer;
  try {
    b = Buffer.from(String(storedHash), "hex");
  } catch {
    return false;
  }
  if (b.length !== a.length) return false;
  return timingSafeEqual(a, b);
}

/** `expires_at` for a freshly minted code (default: 30 days from now). */
export function inviteExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + TTL_MS);
}

export type InviteCodeRecord = {
  /** `code_hash` column — HMAC-SHA256 hex of the normalized code. */
  codeHash: string;
  /** `used_at` column — null while the code is unused. */
  usedAt: string | Date | null;
  /** `expires_at` column. */
  expiresAt: string | Date;
};

export type InviteVerdict = "valid" | "unknown" | "used" | "expired";

/**
 * Pure decision for the redeem endpoint. `record` is the row fetched by
 * `code_hash = inviteCodeHash(submitted, pepper)` (or null when nothing matched).
 *
 * An unknown code and a wrong-hash row both read as `"unknown"` so a probe can't
 * tell "no such code" from "code exists but you mistyped it". Only once the hash
 * matches do `"used"` / `"expired"` / `"valid"` apply.
 */
export function classifyInviteCode(
  record: InviteCodeRecord | null | undefined,
  submitted: string,
  pepper: string,
  now: Date = new Date(),
): InviteVerdict {
  if (!record || !verifyInviteCode(submitted, record.codeHash, pepper)) return "unknown";
  if (record.usedAt != null) return "used";
  if (new Date(record.expiresAt).getTime() <= now.getTime()) return "expired";
  return "valid";
}
