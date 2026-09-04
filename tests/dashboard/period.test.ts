import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isPeriod,
  PERIODS,
  previousPeriodLabel,
  resolvePeriod,
  toISODate,
} from "../../lib/dashboard/period.ts";

const NOW = new Date("2026-09-17T10:30:00Z"); // a Thursday

test("PERIODS / isPeriod", () => {
  assert.deepEqual([...PERIODS], ["day", "week", "month", "year"]);
  assert.equal(isPeriod("month"), true);
  assert.equal(isPeriod("decade"), false);
  assert.equal(isPeriod(null), false);
});

test("day: today only, previous = yesterday", () => {
  const r = resolvePeriod("day", NOW);
  assert.equal(r.start, "2026-09-17");
  assert.equal(r.end, "2026-09-18");
  assert.deepEqual(r.previous, { start: "2026-09-16", end: "2026-09-17" });
  assert.deepEqual(r.buckets, ["2026-09-17"]);
  assert.equal(r.granularity, "hour");
});

test("week: Monday-based, capped at today, daily buckets", () => {
  const r = resolvePeriod("week", NOW);
  assert.equal(r.start, "2026-09-14"); // Monday
  assert.equal(r.end, "2026-09-18"); // capped at tomorrow (draw up to today)
  assert.deepEqual(r.previous, { start: "2026-09-07", end: "2026-09-14" });
  assert.deepEqual(r.buckets, [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
  ]);
  assert.equal(r.granularity, "day");
});

test("month: 1st to today, previous = full previous month", () => {
  const r = resolvePeriod("month", NOW);
  assert.equal(r.start, "2026-09-01");
  assert.equal(r.end, "2026-09-18");
  assert.deepEqual(r.previous, { start: "2026-08-01", end: "2026-09-01" });
  assert.equal(r.buckets[0], "2026-09-01");
  assert.equal(r.buckets.at(-1), "2026-09-17");
  assert.equal(r.buckets.length, 17);
});

test("year: Jan 1 to today, monthly buckets, previous = last year", () => {
  const r = resolvePeriod("year", NOW);
  assert.equal(r.start, "2026-01-01");
  assert.equal(r.end, "2026-09-18");
  assert.deepEqual(r.previous, { start: "2025-01-01", end: "2026-01-01" });
  assert.equal(r.granularity, "month");
  assert.deepEqual(r.buckets, [
    "2026-01-01","2026-02-01","2026-03-01","2026-04-01","2026-05-01",
    "2026-06-01","2026-07-01","2026-08-01","2026-09-01",
  ]);
});

test("toISODate / previousPeriodLabel", () => {
  assert.equal(toISODate(new Date("2026-02-03T23:00:00Z")), "2026-02-03");
  assert.equal(previousPeriodLabel("day"), "hier");
  assert.equal(previousPeriodLabel("year"), "l'an dernier");
});
