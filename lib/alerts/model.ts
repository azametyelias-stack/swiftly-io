/**
 * SCREEN-18 (Alertes & Notifications) — the shapes and the ordering rules of the
 * inbox, kept pure so `node --test` can pin them down.
 *
 * The screen doc's § 2 is the whole point of this file: three kinds of
 * notification exist, and only two of them are records. Alerts (reactive:
 * a budget went over) and scheduled notifications (proactive: the daily score)
 * are rows in `public.alerts` and appear here. Transient toasts
 * ("Transaction enregistrée ✓") are neither stored nor listed — the artboard:
 * "c'est ce qui garde cette boîte crédible : tout ce qui s'y trouve méritait
 * d'être gardé". Nothing in this module can represent a toast, on purpose.
 *
 * Import-free like every other tested model in `lib/` (`stats/model`,
 * `budgets/model`, `transactions/model`), so it loads under `node --test`.
 */

/** § 2 — the two persisted kinds. A toast is not one of them. */
export const ALERT_KINDS = ["alert", "scheduled"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

/**
 * § 6 gives three colours (red = incident, amber = approaching, green = good
 * news); the artboard adds the neutral grey and says why: without it a
 * "Rapport de juillet disponible" would have to render green and dilute what
 * green means. Four tones, and the fourth is load-bearing.
 */
export const ALERT_TONES = ["danger", "warn", "success", "neutral"] as const;
export type AlertTone = (typeof ALERT_TONES)[number];

/** One labelled line of the detail screen ("Limite du mois" / "30 000 F"). */
export interface AlertFact {
  label: string;
  value: string;
}

export type AlertLinkType = "budget" | "report" | "project" | "transaction";

export interface AlertItem {
  id: string;
  kind: AlertKind;
  /** The message. The artboard promotes it to the row's title, 16/700. */
  title: string;
  /** "Ce qui s'est passé" on the detail screen; "" when there is nothing to add. */
  body: string;
  /** The chip at the right of the row ("+16 %", "70/1000"); null = no chip. */
  value: string | null;
  tone: AlertTone;
  /** Snapshot taken when the alert fired — never re-derived from live rows. */
  facts: AlertFact[];
  link_type: AlertLinkType | null;
  link_id: string | null;
  read: boolean;
  created_at: string;
}

// ── filtering (§ 4, the "Tout" dropdown) ───────────────────────────────────

export const KIND_FILTERS = ["all", ...ALERT_KINDS] as const;
export type KindFilter = (typeof KIND_FILTERS)[number];

export function matchesKind(kind: AlertKind, filter: KindFilter): boolean {
  return filter === "all" || filter === kind;
}

// ── sorting (§ 4, the "Récent" dropdown) ───────────────────────────────────

/**
 * § 4 lists four, and marks "par urgence" optional for the MVP. It is cheap
 * here (the tone already ranks the rows) and it is the one sort that answers
 * the question an inbox is actually opened with, so it ships.
 *
 * "Plus utilisé" in § 4 means "déclenchée le plus souvent" — the same alert
 * recurring month after month. Grouping is by title, since that is what
 * identifies a repeating alert across months.
 */
export const ALERT_SORTS = ["recent", "urgency", "frequent", "alpha"] as const;
export type AlertSort = (typeof ALERT_SORTS)[number];

/** Rank for "par urgence": an incident outranks a warning outranks good news. */
const TONE_RANK: Record<AlertTone, number> = {
  danger: 0,
  warn: 1,
  success: 2,
  neutral: 3,
};

const newestFirst = (a: AlertItem, b: AlertItem) =>
  a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;

export function sortAlerts(items: AlertItem[], mode: AlertSort): AlertItem[] {
  const out = [...items];
  if (mode === "urgency") {
    out.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone] || newestFirst(a, b));
  } else if (mode === "alpha") {
    out.sort((a, b) => a.title.localeCompare(b.title, "fr") || newestFirst(a, b));
  } else if (mode === "frequent") {
    const seen = new Map<string, number>();
    for (const it of items) seen.set(it.title, (seen.get(it.title) ?? 0) + 1);
    out.sort(
      (a, b) =>
        (seen.get(b.title) ?? 0) - (seen.get(a.title) ?? 0) || newestFirst(a, b),
    );
  } else {
    out.sort(newestFirst);
  }
  return out;
}

// ── grouping (§ 5, "Aujourd'hui / Hier / Cette semaine / …") ────────────────

/**
 * The inbox is grouped with `lib/transactions/model`'s `groupByPeriod`, not a
 * second bucketing function — the two lists sit one swipe apart in the menu,
 * and a day that read "Hier" in one and "Cette semaine" in the other would be a
 * bug the user cannot articulate. That function keys off `occurred_on`, so an
 * alert is adapted with this, which is the only conversion involved:
 * `alerts.created_at` is a timestamp, and near midnight its UTC date is the
 * previous Bénin day (hence `beninDayOf`, not `slice(0, 10)`).
 */
export type DatedAlert = AlertItem & { occurred_on: string };

export function asDated(item: AlertItem, beninDay: string): DatedAlert {
  return { ...item, occurred_on: beninDay };
}

// ── unread ─────────────────────────────────────────────────────────────────

export function unreadCount(items: AlertItem[]): number {
  return items.reduce((n, it) => n + (it.read ? 0 : 1), 0);
}

/** Where the detail screen's contextual action button points. Null = no action. */
export function linkHref(item: AlertItem): string | null {
  if (!item.link_type || !item.link_id) return null;
  switch (item.link_type) {
    case "budget":
      return `/budgets/${item.link_id}`;
    case "project":
      return `/projets/${item.link_id}`;
    case "transaction":
      return `/historiques/${item.link_id}`;
    case "report":
      return "/rapport";
  }
}

// ── budget thresholds (what the daily cron turns into rows) ────────────────

/**
 * BUILD-PLAN § LOT 5 / SCREEN-15: the bar warns at 92 %. Past 100 % it is no
 * longer a warning but an incident, and the artboard draws the two as distinct
 * rows with distinct tones — "Budget Alimentation approche sa limite · 92 %" in
 * amber, "Dépassement Budget Shopping · +16 %" in red.
 */
export const BUDGET_WARN_RATIO = 0.92;

export type BudgetAlertLevel = "warn" | "over";

export function budgetAlertLevel(
  spent: number,
  allocated: number,
): BudgetAlertLevel | null {
  // An allocation of 0 has no meaningful ratio — every spend would be "over",
  // including a spend of nothing. Such a budget simply never alerts.
  if (!(allocated > 0) || !Number.isFinite(spent)) return null;
  const ratio = spent / allocated;
  if (ratio >= 1) return "over";
  if (ratio >= BUDGET_WARN_RATIO) return "warn";
  return null;
}

export const BUDGET_ALERT_TONE: Record<BudgetAlertLevel, AlertTone> = {
  over: "danger",
  warn: "warn",
};

/**
 * The chip's text. Over the limit the artboard shows the *excess* ("+16 %"),
 * not the total (116 %) — the number the reader wants is how far past they
 * went. Below it, the plain share consumed ("92 %").
 */
export function budgetAlertValue(
  spent: number,
  allocated: number,
  level: BudgetAlertLevel,
): string {
  const ratio = spent / allocated;
  return level === "over"
    ? `+${Math.round((ratio - 1) * 100)} %`
    : `${Math.floor(ratio * 100)} %`;
}

/**
 * The idempotency key written to `alerts.dedup_key` (unique per user, see
 * migration 0005). Keyed by month AND level so a budget that crosses 92 % and
 * later goes over its limit produces both rows — once each, however many times
 * the daily cron re-examines it.
 */
export function budgetDedupKey(
  budgetId: string,
  yearMonth: string,
  level: BudgetAlertLevel,
): string {
  return `budget:${budgetId}:${yearMonth}:${level}`;
}
