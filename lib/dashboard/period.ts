/**
 * Dashboard period maths (SCREEN-4 § 3 / § 5). Pure + import-free so
 * `tests/dashboard/period.test.ts` runs it under `node --test`.
 *
 * Swiftly.io is single-region (Benin, UTC+1, no DST) and `transactions.occurred_on`
 * is a calendar `date` with no time-of-day. So every boundary here is a whole
 * day: the period is a half-open range of dates `[start, end)` plus the buckets
 * the balance curve is sampled at.
 *
 * "Aujourd'hui" is drawn on an hourly axis (design `04-dashboard.png`): the
 * curve is stepped by each of today's transactions, placed by the hour of their
 * `created_at` (`granularity: "hour"`). `week`/`month` step by day, `year` by
 * month.
 */

export const PERIODS = ["day", "week", "month", "year"] as const;
export type Period = (typeof PERIODS)[number];

export function isPeriod(value: unknown): value is Period {
  return typeof value === "string" && (PERIODS as readonly string[]).includes(value);
}

/** `YYYY-MM-DD` in UTC (dates are timezone-free here). */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

function startOfDay(d: Date): Date {
  return utc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Monday-based week start (ISO). */
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const dow = (s.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  s.setUTCDate(s.getUTCDate() - dow);
  return s;
}

export interface PeriodRange {
  /** inclusive first day */
  start: string;
  /** EXCLUSIVE day after the last day */
  end: string;
  /** the equivalent previous window, for the variation line */
  previous: { start: string; end: string };
  /** day boundaries the curve is sampled at, from `start` to `end` inclusive */
  buckets: string[];
  /** how the curve is sampled: "hour" (today, stepped per transaction), "day", "month" */
  granularity: "hour" | "day" | "month";
}

function eachDay(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

function eachMonthStart(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Resolve a period against `now` (defaults to today). `end` is exclusive and is
 * capped at "tomorrow" so a month/year in progress doesn't draw a flat future
 * tail.
 */
export function resolvePeriod(period: Period, now: Date = new Date()): PeriodRange {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  let start: Date;
  let fullEnd: Date; // the period's natural end (may be in the future)
  let prevStart: Date; // the equivalent previous window, calendar-aligned

  switch (period) {
    case "day": {
      start = today;
      fullEnd = tomorrow;
      prevStart = new Date(start);
      prevStart.setUTCDate(prevStart.getUTCDate() - 1);
      break;
    }
    case "week": {
      start = startOfWeek(today);
      fullEnd = new Date(start);
      fullEnd.setUTCDate(fullEnd.getUTCDate() + 7);
      prevStart = new Date(start);
      prevStart.setUTCDate(prevStart.getUTCDate() - 7);
      break;
    }
    case "month": {
      start = utc(today.getUTCFullYear(), today.getUTCMonth(), 1);
      fullEnd = utc(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
      prevStart = utc(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
      break;
    }
    case "year": {
      start = utc(today.getUTCFullYear(), 0, 1);
      fullEnd = utc(today.getUTCFullYear() + 1, 0, 1);
      prevStart = utc(today.getUTCFullYear() - 1, 0, 1);
      break;
    }
  }

  // Curve is drawn only up to today.
  const drawnEnd = fullEnd < tomorrow ? fullEnd : tomorrow;
  const lastBucketDay = new Date(drawnEnd);
  lastBucketDay.setUTCDate(lastBucketDay.getUTCDate() - 1);

  const granularity: "hour" | "day" | "month" =
    period === "year" ? "month" : period === "day" ? "hour" : "day";
  const buckets =
    granularity === "month"
      ? eachMonthStart(start, lastBucketDay)
      : eachDay(start, lastBucketDay < start ? start : lastBucketDay);

  return {
    start: toISODate(start),
    end: toISODate(drawnEnd),
    previous: { start: toISODate(prevStart), end: toISODate(start) },
    buckets,
    granularity,
  };
}

const LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: "Cette semaine",
  month: "Ce mois",
  year: "Cette année",
};

/** The dropdown label + the "vs …" comparison word. */
export function periodLabel(period: Period): string {
  return LABELS[period];
}

const VS: Record<Period, string> = {
  day: "hier",
  week: "la semaine dernière",
  month: "le mois dernier",
  year: "l'an dernier",
};

export function previousPeriodLabel(period: Period): string {
  return VS[period];
}
