import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INVITE_CODE_POLICY,
  INVITE_GLOBAL_ALARM,
  INVITE_IP_POLICY,
  MemoryWindow,
  UNKNOWN_IP,
  inviteCodeKey,
  inviteGlobalKey,
  inviteIpKey,
  retryAfterSeconds,
} from "../../lib/auth/rate-limit-policy.ts";

// SECURITY MASTERPLAN Point 3 — the invite code is 6 digits (10^6), so its
// safety comes from these numbers, not from its entropy. Every boundary below
// is a security boundary.

// ---------------------------------------------------------------------------
// Policy values
// ---------------------------------------------------------------------------

test("the per-IP budget keeps a full sweep of the code space out of reach", () => {
  const attemptsPerYear =
    (INVITE_IP_POLICY.limit / INVITE_IP_POLICY.windowSeconds) * 365 * 24 * 3600;
  const yearsToSweep = 1_000_000 / attemptsPerYear;
  assert.ok(
    yearsToSweep > 5,
    `one IP could walk the 10^6 space in ${yearsToSweep.toFixed(1)} years — too fast`,
  );
});

test("a human entering the code twice is never limited", () => {
  // SCREEN-2 auto-submits on the 6th digit; two fumbles must stay comfortable.
  assert.ok(INVITE_IP_POLICY.limit >= 5, "too tight for an honest tester");
});

test("the per-code lockout is tighter than the per-IP window", () => {
  // It has to be: it exists for the botnet the per-IP window cannot see.
  assert.ok(INVITE_CODE_POLICY.limit < INVITE_IP_POLICY.limit);
  assert.ok(INVITE_CODE_POLICY.windowSeconds > INVITE_IP_POLICY.windowSeconds);
});

test("the global alarm sits above the per-IP budget", () => {
  // Below it, one limited-but-honest IP would raise the alarm on its own.
  assert.ok(INVITE_GLOBAL_ALARM.limit > INVITE_IP_POLICY.limit);
});

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

test("keys are bare — the Upstash prefix is applied once, by the limiter", () => {
  // Prefixing here as well produced `swiftly:rl:swiftly:rl:…`.
  for (const key of [inviteIpKey("1.2.3.4"), inviteCodeKey("abc"), inviteGlobalKey()]) {
    assert.doesNotMatch(key, /swiftly:rl/);
  }
});

test("distinct IPs and distinct codes get distinct buckets", () => {
  assert.notEqual(inviteIpKey("1.2.3.4"), inviteIpKey("1.2.3.5"));
  assert.notEqual(inviteCodeKey("hash-a"), inviteCodeKey("hash-b"));
  assert.notEqual(inviteIpKey("x"), inviteCodeKey("x"));
});

test("a missing IP falls into one shared bucket, not a free pass", () => {
  assert.equal(inviteIpKey(""), inviteIpKey(UNKNOWN_IP));
});

test("the code bucket is keyed on the hash, never on a code", () => {
  // A 6-digit code in a Redis key name is a plaintext credential in a third
  // party's logs.
  const key = inviteCodeKey("9f8e7d6c");
  assert.doesNotMatch(key, /\b\d{6}\b/);
});

// ---------------------------------------------------------------------------
// retryAfterSeconds
// ---------------------------------------------------------------------------

test("retryAfterSeconds rounds up so it never advertises a blocked moment", () => {
  assert.equal(retryAfterSeconds(10_400, 10_000), 1); // 0.4 s -> 1
  assert.equal(retryAfterSeconds(11_001, 10_000), 2); // 1.001 s -> 2
  assert.equal(retryAfterSeconds(70_000, 10_000), 60);
});

test("retryAfterSeconds never returns 0 — that reads as 'retry now'", () => {
  assert.equal(retryAfterSeconds(10_000, 10_000), 1);
  assert.equal(retryAfterSeconds(9_000, 10_000), 1); // already past
});

// ---------------------------------------------------------------------------
// MemoryWindow — the fallback used when Upstash is down or unconfigured
// ---------------------------------------------------------------------------

test("MemoryWindow allows exactly `limit` attempts, then refuses", () => {
  const w = new MemoryWindow({ limit: 3, windowSeconds: 60 });
  assert.equal(w.check("k", 1_000).success, true);
  assert.equal(w.check("k", 1_100).success, true);
  assert.equal(w.check("k", 1_200).success, true);
  assert.equal(w.check("k", 1_300).success, false, "the 4th must be refused");
});

test("MemoryWindow slides — it does not reset on a fixed boundary", () => {
  const w = new MemoryWindow({ limit: 2, windowSeconds: 10 });
  // Both hits land late in the first 10 s window.
  assert.equal(w.check("k", 9_000).success, true);
  assert.equal(w.check("k", 9_500).success, true);
  // A FIXED window would open a fresh budget at 10_000 and grant two more
  // straight away — twice the advertised rate across the seam. A sliding one
  // still sees both hits, which are 1.5 s and 1 s old.
  assert.equal(w.check("k", 10_500).success, false);
  // The budget returns only once they age out, 10 s after the oldest.
  assert.equal(w.check("k", 19_600).success, true);
});

test("MemoryWindow keeps counting while blocked, so hammering does not help", () => {
  const w = new MemoryWindow({ limit: 1, windowSeconds: 10 });
  assert.equal(w.check("k", 0).success, true);
  assert.equal(w.check("k", 1_000).success, false);
  assert.equal(w.check("k", 2_000).success, false);
  // The window frees up 10 s after the OLDEST surviving hit, which the retries
  // have pushed forward — not 10 s after the first one.
  assert.equal(w.check("k", 10_500).success, false);
});

test("MemoryWindow buckets are independent", () => {
  const w = new MemoryWindow({ limit: 1, windowSeconds: 60 });
  assert.equal(w.check("a", 0).success, true);
  assert.equal(w.check("b", 0).success, true, "one IP must not limit another");
  assert.equal(w.check("a", 10).success, false);
});

test("MemoryWindow reports when the budget comes back", () => {
  const w = new MemoryWindow({ limit: 1, windowSeconds: 30 });
  const first = w.check("k", 5_000);
  assert.equal(first.remaining, 0);
  assert.equal(first.resetAtMs, 35_000);
});

// ---------------------------------------------------------------------------
// peek — the read-only path behind the per-code lockout
// ---------------------------------------------------------------------------

test("peek does not consume — asking must not lock a code that never failed", () => {
  // The bug this guards: checking the lockout with a consuming call meant five
  // *checks* locked out a code with zero failures behind it.
  const w = new MemoryWindow({ limit: 2, windowSeconds: 60 });
  for (let i = 0; i < 20; i++) {
    assert.equal(w.peek("k", 1_000).limited, false);
  }
  assert.equal(w.check("k", 1_000).success, true, "budget must be untouched");
});

test("peek reports limited only once the recorded failures reach the limit", () => {
  const w = new MemoryWindow({ limit: 2, windowSeconds: 60 });
  assert.equal(w.peek("k", 0).limited, false);
  w.check("k", 0);
  assert.equal(w.peek("k", 0).limited, false, "1 of 2 — still open");
  w.check("k", 0);
  assert.equal(w.peek("k", 0).limited, true, "2 of 2 — locked");
});

test("peek forgets failures that have aged out of the window", () => {
  const w = new MemoryWindow({ limit: 1, windowSeconds: 10 });
  w.check("k", 0);
  assert.equal(w.peek("k", 5_000).limited, true);
  assert.equal(w.peek("k", 11_000).limited, false, "the lockout must expire");
});
