/**
 * Date/time formatting for the transaction screens (SCREEN-6/7). Uses `Intl`
 * (available in node + the browser) so it stays import-free and unit-testable.
 *
 * `transactions.occurred_on` is a calendar `date` (no time); the wall-clock time
 * shown in a row ("Aujourd'hui, 9 h 37") comes from `created_at`.
 */

/** Bénin is UTC+1, no DST — kept in sync with `lib/dashboard/period.ts`. */
const BENIN_OFFSET_MS = 60 * 60 * 1000;

/**
 * Bénin (UTC+1) calendar day as YYYY-MM-DD — independent of the host's own
 * OS/browser timezone. Swiftly.io is single-region; deriving "today" from the
 * *local* clock (as this used to) put the client (browser tz) and the server
 * (Node's UTC getters) a day apart for part of every day, silently dropping a
 * same-day transaction from the dashboard curve / cron / budget-month math.
 */
export function todayISO(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + BENIN_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Loc = "fr" | "en";
const INTL: Record<Loc, string> = { fr: "fr-FR", en: "en-GB" };

/** "27 août 2026" / "27 August 2026". */
export function formatLongDate(iso: string, locale: Loc = "fr"): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(INTL[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** "septembre 2026" / "September 2026" from a "YYYY-MM" key. */
export function formatMonthYear(ym: string, locale: Loc = "fr"): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  const s = new Intl.DateTimeFormat(INTL[locale], {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Report period label: "Juin 2026" from "2026-06", "2026" stays "2026". */
export function reportPeriodLabel(key: string, locale: Loc = "fr"): string {
  return /^\d{4}$/.test(key) ? key : formatMonthYear(key, locale);
}

/** "9 h 37" (fr) / "09:37" (en) from an ISO timestamp. */
export function formatClock(isoTimestamp: string, locale: Loc = "fr"): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  return locale === "fr" ? `${h} h ${mm}` : `${String(h).padStart(2, "0")}:${mm}`;
}

/**
 * Row timestamp (SCREEN-6 § 6): "Aujourd'hui, 9 h 37" / "Hier, 19 h 07" /
 * "27 août 2026, 9 h 37".
 */
export function formatRowMoment(
  occurredOn: string,
  createdAt: string,
  todayIso: string,
  locale: Loc = "fr",
  labels: { today: string; yesterday: string },
): string {
  const time = formatClock(createdAt, locale);
  let day: string;
  if (occurredOn === todayIso) day = labels.today;
  else if (occurredOn === addDaysISO(todayIso, -1)) day = labels.yesterday;
  else day = formatLongDate(occurredOn, locale);
  return time ? `${day}, ${time}` : day;
}
