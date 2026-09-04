import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDaysISO,
  formatClock,
  formatLongDate,
  formatMonthYear,
  formatRowMoment,
  todayISO,
} from "../../lib/format/date.ts";

test("todayISO: Bénin (UTC+1) calendar day, independent of host tz", () => {
  assert.equal(todayISO(new Date("2026-09-05T12:00:00Z")), "2026-09-05");
  // 23:30 UTC = 00:30 in Bénin — already the next calendar day there.
  assert.equal(todayISO(new Date("2026-09-17T23:30:00Z")), "2026-09-18");
  assert.equal(todayISO(new Date("2026-09-17T22:59:00Z")), "2026-09-17");
});

test("addDaysISO", () => {
  assert.equal(addDaysISO("2026-09-01", -1), "2026-08-31");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
});

test("formatLongDate / formatMonthYear", () => {
  assert.equal(formatLongDate("2026-08-27", "fr"), "27 août 2026");
  assert.equal(formatMonthYear("2026-06", "fr"), "Juin 2026");
});

test("formatClock", () => {
  assert.equal(formatClock("2026-09-17T09:37:00", "fr"), "9 h 37");
  assert.equal(formatClock("2026-09-17T09:37:00", "en"), "09:37");
  assert.equal(formatClock("not-a-date", "fr"), "");
});

test("formatRowMoment: today / yesterday / dated", () => {
  const labels = { today: "Aujourd'hui", yesterday: "Hier" };
  assert.equal(
    formatRowMoment("2026-09-17", "2026-09-17T09:37:00", "2026-09-17", "fr", labels),
    "Aujourd'hui, 9 h 37",
  );
  assert.equal(
    formatRowMoment("2026-09-16", "2026-09-16T19:07:00", "2026-09-17", "fr", labels),
    "Hier, 19 h 07",
  );
  assert.match(
    formatRowMoment("2026-07-01", "2026-07-01T06:00:00", "2026-09-17", "fr", labels),
    /1 juillet 2026, 6 h 00/,
  );
});
