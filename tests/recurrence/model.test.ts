import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addMonthsISO,
  advanceRunDate,
  dueDates,
  feeAmount,
  feeDue,
  feeRunKey,
  firstOfMonth,
  initialNextRun,
  templateRunKey,
} from "../../lib/recurrence/model.ts";

test("addMonthsISO clamps the day to the target month", () => {
  assert.equal(addMonthsISO("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsISO("2026-01-15", 1), "2026-02-15");
  assert.equal(addMonthsISO("2026-12-31", 1), "2027-01-31");
});

test("advanceRunDate: daily vs monthly", () => {
  assert.equal(advanceRunDate("2026-09-03", "daily"), "2026-09-04");
  assert.equal(advanceRunDate("2026-09-03", "monthly"), "2026-10-03");
});

test("initialNextRun is one full period out", () => {
  assert.equal(initialNextRun("2026-09-03", "daily"), "2026-09-04");
  assert.equal(initialNextRun("2026-09-03", "monthly"), "2026-10-03");
});

test("dueDates: catch-up, bounded, empty when not due", () => {
  assert.deepEqual(dueDates("2026-09-01", "2026-09-04", "daily"), [
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
  ]);
  assert.deepEqual(dueDates("2026-10-01", "2026-09-04", "daily"), []);
  assert.deepEqual(dueDates(null, "2026-09-04", "monthly"), []);
  assert.equal(dueDates("2020-01-01", "2026-09-04", "daily").length, 60); // capped
  assert.deepEqual(dueDates("2026-07-15", "2026-09-04", "monthly"), [
    "2026-07-15",
    "2026-08-15",
  ]);
});

test("idempotency keys", () => {
  assert.equal(templateRunKey("t1", "2026-09-03"), "tpl:t1:2026-09-03");
  assert.equal(feeRunKey("a1", "2026-09"), "fee:a1:2026-09");
});

test("firstOfMonth / feeDue", () => {
  assert.equal(firstOfMonth("2026-09-17"), "2026-09-01");
  assert.equal(feeDue(null, "2026-09-17"), true);
  assert.equal(feeDue("2026-08-01", "2026-09-17"), true);
  assert.equal(feeDue("2026-09-01", "2026-09-17"), false);
});

test("feeAmount: fixed flat, percent = basis points of balance", () => {
  assert.equal(feeAmount("fixed", 800, 50_000), 800);
  assert.equal(feeAmount("fixed", 800, -10_000), 800);
  assert.equal(feeAmount("percent", 50, 100_000), 500); // 0.50 %
  assert.equal(feeAmount("percent", 50, 0), 0);
  assert.equal(feeAmount("percent", 50, -5_000), 0);
});
