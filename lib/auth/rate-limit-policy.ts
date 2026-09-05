/**
 * Rate-limit POLICY for the invite-code endpoint — SECURITY MASTERPLAN Point 3.
 *
 * The numbers, the key shapes and the sliding-window arithmetic live here,
 * separated from the Upstash wiring in `lib/auth/rate-limit.ts`, for two
 * reasons: this file is dependency-free so `node --test` can exercise every
 * boundary without a Redis, and the in-memory fallback the enforcement layer
 * falls back to during an Upstash outage is the *same* algorithm as the one
 * running in Redis rather than a second, subtly different one.
 *
 * ── Why three limits and not one ────────────────────────────────────────────
 *
 * The code is 6 digits: 10^6. Its safety comes from the limiter, never from its
 * entropy. Three different attacks need three different answers:
 *
 *   1. ONE attacker, MANY codes  → per-IP window. The common case, and the one
 *      that makes the 10^6 space cost something: 5.7 years to walk it from a
 *      single address.
 *
 *      What this does NOT do: make a 6-digit code strong. A sweep spread over
 *      hundreds of addresses defeats a per-IP limit by definition, and the
 *      global alarm only sees it, it does not stop it. The durable fix is a longer
 *      code (`INVITE_CODE_LENGTH` in `lib/auth/invite-codes.ts`); until then
 *      this is a cost multiplier on a small closed beta, not a proof.
 *
 *   2. MANY IPs, ONE code → per-code lockout. A per-IP limit is blind to a
 *      botnet spreading its guesses. Only FAILED attempts count, which is what
 *      makes this safe to ship: a valid unused code cannot fail, so it can
 *      never be locked out by an attacker. Locking a code that has failed three
 *      times means locking a code that does not exist, is already spent, or has
 *      expired — all of them already dead. There is no denial-of-service here.
 *
 *   3. MANY IPs, MANY codes → global alarm. Neither limit above sees a
 *      distributed sweep with one guess per IP per code. This one does not
 *      block (blocking globally would let anyone lock every user out); it
 *      raises a log the operator can alert on.
 *
 * Windows are sliding, not fixed: a fixed window lets an attacker fire its full
 * budget in the last second of one window and again in the first second of the
 * next, doubling the effective rate at the seam.
 */

/** A single limiter's shape: `limit` attempts allowed per `windowSeconds`. */
export interface WindowPolicy {
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * Per-IP, counted on EVERY attempt (valid or not).
 *
 * 5 per 15 minutes. Generous for a human — the SCREEN-2 input auto-submits on
 * the 6th digit, so a fumbling tester spends two or three — and expensive for a
 * script: 480 guesses a day, 5.7 years to walk the whole 10^6 space, and 14_400
 * guesses (1.4 % of the space) over the 30-day life of a code.
 *
 * Do the arithmetic before loosening this. At 10 per 10 minutes — the first
 * value written here — a single IP covers 4.3 % of the space within one code's
 * lifetime, which against a handful of live codes is not a remote chance.
 */
export const INVITE_IP_POLICY: WindowPolicy = { limit: 5, windowSeconds: 900 };

/**
 * Per-code, counted on FAILED attempts only. One hour, so a botnet spreading
 * its guesses over many IPs still runs into a wall on the code itself.
 *
 * Three is deliberately tighter than the per-IP budget and costs an honest user
 * nothing: a typo produces a different hash, so it lands in a different bucket,
 * and the only way to fail on your own code is for it to be already spent or
 * expired — in which case locking it out changes nothing.
 */
export const INVITE_CODE_POLICY: WindowPolicy = { limit: 3, windowSeconds: 3600 };

/**
 * Global failure counter. Detection, not enforcement — crossing it logs
 * `auth.invite_bruteforce_suspected`; it never rejects a request.
 */
export const INVITE_GLOBAL_ALARM: WindowPolicy = { limit: 50, windowSeconds: 600 };

/**
 * Namespace prefix — keeps these keys distinct from anything else sharing the
 * Redis. Applied by the Upstash limiter itself, which is why the key builders
 * below return bare keys: prefixing in both places would produce
 * `swiftly:rl:swiftly:rl:…`.
 */
export const RATE_LIMIT_PREFIX = "swiftly:rl";

/**
 * `unknown` is what `clientIp()` returns when no proxy header is present. It is
 * a single shared bucket on purpose: an attacker who strips the header lands in
 * the same bucket as every other header-less caller and is limited harder, not
 * softer.
 */
export const UNKNOWN_IP = "unknown";

export function inviteIpKey(ip: string): string {
  return `invite:ip:${ip || UNKNOWN_IP}`;
}

/**
 * Keyed on the peppered HMAC, never on the code itself: Redis is a third-party
 * service and a 6-digit code sitting in a key name would be a plaintext
 * credential in someone else's logs.
 */
export function inviteCodeKey(codeHash: string): string {
  return `invite:code:${codeHash}`;
}

export function inviteGlobalKey(): string {
  return "invite:global";
}

/**
 * Seconds a client should wait, for the `Retry-After` header.
 *
 * Rounded UP so we never advertise a moment that is still blocked, and floored
 * at 1 — `Retry-After: 0` reads as "go ahead now" and invites an immediate
 * retry that will fail again.
 */
export function retryAfterSeconds(resetAtMs: number, nowMs: number): number {
  return Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));
}

/**
 * A sliding-window counter kept in this process.
 *
 * Used as the fallback when Upstash is unreachable and in local development
 * when it is not configured at all. Per-instance, so on serverless it is weaker
 * than Redis — several instances each grant their own budget. That is the point
 * of it being a fallback: weaker than the real limiter, far stronger than the
 * no-op it replaces.
 */
export class MemoryWindow {
  private readonly hits = new Map<string, number[]>();
  private readonly policy: WindowPolicy;

  // Spelled out rather than a `private readonly` constructor parameter: Node's
  // type-stripping runs these tests without a compiler and rejects parameter
  // properties outright.
  constructor(policy: WindowPolicy) {
    this.policy = policy;
  }

  /**
   * Record one attempt against `key` and report whether it is allowed.
   * `nowMs` is injected so tests drive time instead of sleeping.
   */
  check(key: string, nowMs: number = Date.now()): {
    success: boolean;
    remaining: number;
    resetAtMs: number;
  } {
    const windowMs = this.policy.windowSeconds * 1000;
    const cutoff = nowMs - windowMs;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff);

    // The attempt is recorded whether or not it is allowed: a caller hammering
    // a blocked key keeps it blocked, which is the behaviour we want.
    kept.push(nowMs);
    this.hits.set(key, kept);
    this.sweep(cutoff);

    const success = kept.length <= this.policy.limit;
    return {
      success,
      remaining: Math.max(0, this.policy.limit - kept.length),
      // The window frees up when its OLDEST surviving hit falls out.
      resetAtMs: (kept[0] ?? nowMs) + windowMs,
    };
  }

  /**
   * Report whether `key` is already at its limit WITHOUT recording an attempt.
   *
   * The read-only counterpart of `check`. Consuming a token just to ask the
   * question would mean five *questions* locked a key that had zero failures.
   */
  peek(key: string, nowMs: number = Date.now()): { limited: boolean; remaining: number } {
    const cutoff = nowMs - this.policy.windowSeconds * 1000;
    const kept = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    return {
      limited: kept.length >= this.policy.limit,
      remaining: Math.max(0, this.policy.limit - kept.length),
    };
  }

  /** Drop keys whose every hit has aged out, so the map can't grow forever. */
  private sweep(cutoff: number): void {
    for (const [k, times] of this.hits) {
      if (times.length === 0 || times[times.length - 1]! <= cutoff) {
        this.hits.delete(k);
      }
    }
  }

  /** Test seam. */
  reset(): void {
    this.hits.clear();
  }
}
