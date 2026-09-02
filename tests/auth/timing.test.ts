import { test } from "node:test";
import assert from "node:assert/strict";

import { safeEqual, withMinimumDuration } from "../../lib/auth/timing.ts";

// ---------------------------------------------------------------------------
// safeEqual
// ---------------------------------------------------------------------------

test("safeEqual is true only for identical strings", () => {
  assert.equal(safeEqual("", ""), true);
  assert.equal(safeEqual("123456", "123456"), true);
  assert.equal(safeEqual("café ☕", "café ☕"), true);

  assert.equal(safeEqual("123456", "123457"), false);
  assert.equal(safeEqual("abc", "abcd"), false); // different length, no leak / no throw
  assert.equal(safeEqual("A", "a"), false);
  assert.equal(safeEqual("secret", ""), false);
});

test("safeEqual always returns a boolean and never throws on length mismatch", () => {
  for (const [a, b] of [
    ["", "x"],
    ["short", "a much longer value than the other one"],
    ["🔑", "🔒🔒"],
  ] as const) {
    assert.equal(typeof safeEqual(a, b), "boolean");
  }
});

// ---------------------------------------------------------------------------
// withMinimumDuration
// ---------------------------------------------------------------------------

const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

test("withMinimumDuration floors a fast path to ~floorMs", async () => {
  const start = clock();
  const out = await withMinimumDuration(80, async () => "done");
  const elapsed = clock() - start;

  assert.equal(out, "done");
  assert.ok(elapsed >= 75, `elapsed ${elapsed}ms should be >= ~80`);
  assert.ok(elapsed < 200, `elapsed ${elapsed}ms should not overshoot much`);
});

test("withMinimumDuration does not add delay when work already exceeds the floor", async () => {
  const start = clock();
  await withMinimumDuration(30, async () => {
    await new Promise((r) => setTimeout(r, 90));
  });
  const elapsed = clock() - start;
  assert.ok(elapsed >= 85 && elapsed < 200, `elapsed ${elapsed}ms ~ 90, not floor+90`);
});

test("a 'user not found' path and a 'slow verify' path land in the same window", async () => {
  const notFound = async () => {
    const s = clock();
    await withMinimumDuration(120, async () => "generic-error");
    return clock() - s;
  };
  const slowVerify = async () => {
    const s = clock();
    await withMinimumDuration(120, async () => {
      await new Promise((r) => setTimeout(r, 40)); // "bcrypt/Supabase work"
      return "generic-error";
    });
    return clock() - s;
  };

  const a = await notFound();
  const b = await slowVerify();
  for (const t of [a, b]) assert.ok(t >= 115 && t < 220, `t=${t} outside window`);
  assert.ok(Math.abs(a - b) < 60, `paths distinguishable by ${Math.abs(a - b).toFixed(1)}ms`);
});

test("withMinimumDuration still pads when work rejects", async () => {
  const start = clock();
  await assert.rejects(
    withMinimumDuration(80, async () => {
      throw new Error("verification blew up");
    }),
    /verification blew up/,
  );
  assert.ok(clock() - start >= 75, "padding should apply on the error path too");
});
