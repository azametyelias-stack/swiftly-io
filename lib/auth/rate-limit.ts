import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import {
  INVITE_CODE_POLICY,
  INVITE_GLOBAL_ALARM,
  INVITE_IP_POLICY,
  MemoryWindow,
  RATE_LIMIT_PREFIX,
  inviteCodeKey,
  inviteGlobalKey,
  inviteIpKey,
  retryAfterSeconds,
} from "@/lib/auth/rate-limit-policy";
import { serverEnv } from "@/lib/env/server";
import { log } from "@/lib/log/logger";

/**
 * Rate limiting for `POST /api/auth/verify-code` — SECURITY MASTERPLAN Point 3.
 *
 * The policy (limits, key shapes, window arithmetic) lives in
 * `lib/auth/rate-limit-policy.ts`; this file is the wiring: Upstash when it is
 * configured, an in-process window when it is not.
 *
 * ── What happens when Upstash is missing or broken ──────────────────────────
 *
 * Two failures that look alike and must not be treated alike:
 *
 *   • NOT CONFIGURED in production — a deploy mistake. The endpoint hands out
 *     sessions for a 6-digit secret; running it with no limiter is the exact
 *     hole this module exists to close, so it FAILS CLOSED: 503, nobody signs
 *     in, and the log says why. Loud and fixable in one env var, rather than a
 *     silent regression to the old no-op.
 *
 *   • CONFIGURED BUT UNREACHABLE — a network blip. Locking every user out of
 *     the app because Redis hiccuped is worse than the blip. So this degrades
 *     to the in-process window instead: weaker (per-instance) but not absent,
 *     and each fallback is logged so an outage is visible.
 *
 * Development without Upstash uses the in-process window too, so the code path
 * is exercised locally instead of only being discovered in production.
 */

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds = 60) {
    super("Trop de tentatives. Réessayez plus tard.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Thrown when the limiter cannot run at all and refusing is the safe answer. */
export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Le service d'authentification est indisponible.");
    this.name = "RateLimitUnavailableError";
  }
}

function upstashConfigured(): boolean {
  return Boolean(
    serverEnv("UPSTASH_REDIS_REST_URL") && serverEnv("UPSTASH_REDIS_REST_TOKEN"),
  );
}

/** True once Upstash is wired up — the distributed limiter is in force. */
export const RATE_LIMIT_READY = upstashConfigured();

// --- Upstash limiters (built once, lazily) ---------------------------------

let limiters: {
  ip: Ratelimit;
  code: Ratelimit;
  global: Ratelimit;
} | null = null;

function upstashLimiters() {
  if (limiters) return limiters;
  const redis = new Redis({
    url: serverEnv("UPSTASH_REDIS_REST_URL")!,
    token: serverEnv("UPSTASH_REDIS_REST_TOKEN")!,
  });
  const make = (limit: number, windowSeconds: number) =>
    new Ratelimit({
      redis,
      // Sliding window: a fixed window would let an attacker spend a full
      // budget on each side of the boundary and double the rate at the seam.
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: RATE_LIMIT_PREFIX,
      // `analytics` writes an extra key per request; the closed beta has no use
      // for the dashboard and it doubles the command count.
      analytics: false,
    });
  limiters = {
    ip: make(INVITE_IP_POLICY.limit, INVITE_IP_POLICY.windowSeconds),
    code: make(INVITE_CODE_POLICY.limit, INVITE_CODE_POLICY.windowSeconds),
    global: make(INVITE_GLOBAL_ALARM.limit, INVITE_GLOBAL_ALARM.windowSeconds),
  };
  return limiters;
}

// --- In-process fallback ---------------------------------------------------

const memory = {
  ip: new MemoryWindow(INVITE_IP_POLICY),
  code: new MemoryWindow(INVITE_CODE_POLICY),
  global: new MemoryWindow(INVITE_GLOBAL_ALARM),
};

type Bucket = keyof typeof memory;

interface Decision {
  success: boolean;
  retryAfter: number;
}

let devWarned = false;

/**
 * Consume one token from `bucket` for `key`.
 *
 * Never throws: every caller decides for itself what a refusal means, and a
 * limiter that throws on its own internal errors would take the endpoint down
 * with it.
 */
async function consume(bucket: Bucket, key: string): Promise<Decision> {
  const now = Date.now();

  if (!RATE_LIMIT_READY) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed — see the header comment.
      log.error("auth.rate_limit_unconfigured", {
        endpoint: "POST /api/auth/verify-code",
        missing: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN",
        impact: "sign-in refused rather than left unlimited",
      });
      throw new RateLimitUnavailableError();
    }
    if (!devWarned) {
      devWarned = true;
      log.warn("auth.rate_limit_in_memory", {
        reason: "Upstash not configured — using the per-process window",
        impact: "fine for local dev, NOT sufficient in production",
      });
    }
    const r = memory[bucket].check(key, now);
    return { success: r.success, retryAfter: retryAfterSeconds(r.resetAtMs, now) };
  }

  try {
    const { success, reset } = await upstashLimiters()[bucket].limit(key);
    return { success, retryAfter: retryAfterSeconds(reset, now) };
  } catch (err) {
    // Configured but unreachable: degrade to the in-process window.
    log.error("auth.rate_limit_backend_failed", {
      bucket,
      err: err instanceof Error ? err.message : String(err),
      impact: "degraded to the per-process window for this request",
    });
    const r = memory[bucket].check(key, now);
    return { success: r.success, retryAfter: retryAfterSeconds(r.resetAtMs, now) };
  }
}

// --- Public API ------------------------------------------------------------

/**
 * Gate on the caller's IP. Called BEFORE the body is read, so a flood costs the
 * attacker a connection and costs us one Redis command — no JSON parsing, no
 * database round-trip.
 *
 * Throws `RateLimitError` when the budget is spent, `RateLimitUnavailableError`
 * when the limiter cannot run and refusing is the safe answer.
 */
export async function assertInviteAttemptAllowed(ip: string): Promise<void> {
  const { success, retryAfter } = await consume("ip", inviteIpKey(ip));
  if (!success) {
    log.warn("auth.invite_rate_limited", { scope: "ip", retryAfter });
    throw new RateLimitError(retryAfter);
  }
}

/**
 * Gate on the code itself, for a botnet spreading its guesses across IPs.
 *
 * Checked before the database claim and fed only by `recordInviteFailure`, so a
 * valid unused code can never reach the threshold: it would have to fail to be
 * counted, and it does not fail. Locking out a code with five failures behind
 * it means locking out a code that is already unknown, spent or expired.
 *
 * Returns `false` instead of throwing — the caller answers with the ordinary
 * invalid-code message (Point 16), which is also the truthful one here.
 */
export async function isInviteCodeLockedOut(codeHash: string): Promise<boolean> {
  const key = inviteCodeKey(codeHash);
  if (!RATE_LIMIT_READY) {
    if (process.env.NODE_ENV === "production") throw new RateLimitUnavailableError();
    return memory.code.peek(key).limited;
  }
  try {
    // `getRemaining`, not `limit`: asking the question must not itself spend a
    // token, or five checks would lock a code that never failed once.
    const { remaining } = await upstashLimiters().code.getRemaining(key);
    return remaining <= 0;
  } catch (err) {
    log.error("auth.rate_limit_backend_failed", {
      bucket: "code",
      err: err instanceof Error ? err.message : String(err),
      impact: "lockout check skipped for this request",
    });
    return false;
  }
}

/**
 * Record one rejected code.
 *
 * Feeds the per-code lockout and the global alarm. Called only on an actual
 * rejection — a successful redemption leaves both counters untouched, which is
 * what keeps the lockout free of a denial-of-service angle.
 */
export async function recordInviteFailure(codeHash: string): Promise<void> {
  const [, globalDecision] = await Promise.all([
    consume("code", inviteCodeKey(codeHash)),
    consume("global", inviteGlobalKey()),
  ]);
  if (!globalDecision.success) {
    // Detection only — this never rejects. Blocking on a global counter would
    // hand any attacker a switch to lock every user out at once.
    log.error("auth.invite_bruteforce_suspected", {
      window: `${INVITE_GLOBAL_ALARM.windowSeconds}s`,
      threshold: INVITE_GLOBAL_ALARM.limit,
      action: "none — alarm only; investigate before it becomes an outage",
    });
  }
}

/** Test seam: drop the in-process counters between cases. */
export function resetInMemoryLimiters(): void {
  memory.ip.reset();
  memory.code.reset();
  memory.global.reset();
}
