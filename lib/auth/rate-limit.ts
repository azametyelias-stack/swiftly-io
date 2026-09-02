import "server-only";

import { log } from "@/lib/log/logger";

/**
 * ⚠️  PLACEHOLDER — SECURITY MASTERPLAN Point 3 (rate limiting) is NOT built yet.
 *
 * `POST /api/auth/verify-code` accepts a 6-digit code — a 10^6 space that is
 * only safe behind a hard rate-limit. Before this endpoint ships to production
 * this function MUST enforce, via Upstash (Point 3):
 *   - a low per-IP attempt rate,
 *   - a per-code lockout after ~5 failed tries,
 *   - a global failed-attempt alarm.
 *
 * It is wired into the route now (every caller already `await`s it and handles a
 * thrown `RateLimitError`) so switching it on later is a one-file change.
 *
 * Lot 1's Go/No-Go does not gate on Point 3; the closed beta is ~5 known
 * testers. `RATE_LIMIT_READY` stays `false` until Upstash is connected.
 */

export const RATE_LIMIT_READY = false;

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Trop de tentatives. Réessayez plus tard.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Throws `RateLimitError` when `key` (an IP, a code hash, …) has exceeded its
 * budget. No-op until Point 3 lands — logs once so the gap is visible in prod.
 */
let warned = false;
export async function assertInviteAttemptAllowed(key: string): Promise<void> {
  if (!RATE_LIMIT_READY && !warned) {
    warned = true;
    log.warn("auth.rate_limit_not_enforced", {
      endpoint: "POST /api/auth/verify-code",
      impact: "6-digit invite code is brute-forceable — connect Upstash (Point 3) before production",
    });
  }
  void key;
  // TODO(Point 3): Upstash sliding-window check here.
}
