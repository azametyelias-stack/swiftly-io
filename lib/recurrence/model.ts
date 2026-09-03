/**
 * Recurrence + monthly-fee scheduling math (D2). Pure and import-free so
 * `tests/recurrence/model.test.ts` runs it under `node --test`.
 *
 * D2: recurring templates and monthly account fees are materialised by a DAILY
 * server cron. Every generated row carries a `recurrence_key` unique per
 * (rule, occurrence) so re-running the cron the same day is a no-op.
 */

export type CronRecurrence = "daily" | "monthly";

// ── date helpers (UTC, YYYY-MM-DD) ────────────────────────────────────────
function parseISO(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDaysISO(d: string, n: number): string {
  const c = parseISO(d);
  c.setUTCDate(c.getUTCDate() + n);
  return iso(c);
}

/** Add `n` months, clamping the day to the target month's last day. */
export function addMonthsISO(d: string, n: number): string {
  const src = parseISO(d);
  const y = src.getUTCFullYear();
  const m = src.getUTCMonth() + n;
  const targetY = y + Math.floor(m / 12);
  const targetM = ((m % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
  const day = Math.min(src.getUTCDate(), lastDay);
  return iso(new Date(Date.UTC(targetY, targetM, day)));
}

/** YYYY-MM of a date. */
export function monthKey(d: string): string {
  return d.slice(0, 7);
}

/** First calendar day of the month containing `d`. */
export function firstOfMonth(d: string): string {
  return `${monthKey(d)}-01`;
}

// ── recurrence cursor ────────────────────────────────────────────────────

/** Advance a run date by one period. */
export function advanceRunDate(from: string, recurrence: CronRecurrence): string {
  return recurrence === "daily" ? addDaysISO(from, 1) : addMonthsISO(from, 1);
}

/**
 * The first `next_run_on` when a recurring rule is created / switched on:
 * one full period after `createdOn`.
 */
export function initialNextRun(
  createdOn: string,
  recurrence: CronRecurrence,
): string {
  return advanceRunDate(createdOn, recurrence);
}

/**
 * Every occurrence date from `nextRunOn` up to and including `today`, oldest
 * first. Bounded by `cap` so a rule that has been dormant for years can't spin
 * the cron. Empty when nothing is due yet.
 */
export function dueDates(
  nextRunOn: string | null,
  today: string,
  recurrence: CronRecurrence,
  cap = 60,
): string[] {
  if (!nextRunOn) return [];
  const out: string[] = [];
  let cursor = nextRunOn;
  while (cursor <= today && out.length < cap) {
    out.push(cursor);
    cursor = advanceRunDate(cursor, recurrence);
  }
  return out;
}

// ── idempotency keys ─────────────────────────────────────────────────────
export function templateRunKey(templateId: string, occurredOn: string): string {
  return `tpl:${templateId}:${occurredOn}`;
}
export function feeRunKey(accountId: string, ym: string): string {
  return `fee:${accountId}:${ym}`;
}

// ── monthly account fees ─────────────────────────────────────────────────
export type FeeType = "fixed" | "percent";

/** Whether a fee for the current month is still owed. */
export function feeDue(lastFeeOn: string | null, today: string): boolean {
  return lastFeeOn === null || lastFeeOn < firstOfMonth(today);
}

/**
 * The fee to charge this month.
 *   fixed   → `feeValue` francs, flat.
 *   percent → `feeValue` basis points of the current balance (50 bp = 0.50 %),
 *             rounded, never negative (a debt account owes no percentage fee).
 */
export function feeAmount(
  feeType: FeeType,
  feeValue: number,
  balance: number,
): number {
  if (feeType === "fixed") return Math.max(0, Math.round(feeValue));
  if (balance <= 0) return 0;
  return Math.max(0, Math.round((balance * feeValue) / 10_000));
}
