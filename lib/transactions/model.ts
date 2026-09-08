/**
 * Transaction domain model (SCREEN-6/7/8/9/10). Pure + import-free so
 * `tests/transactions/model.test.ts` runs it under `node --test`.
 *
 * Balance is always derived (DESIGN-RECONCILIATION D3). "Counts toward a
 * balance" rules mirror `public.account_balance()` and `lib/dashboard/aggregates`
 * exactly:
 *   income   → status in (done, received)
 *   expense  → status = done
 *   transfer → always
 */

export const TX_TYPES = ["expense", "income", "transfer"] as const;
export type TxType = (typeof TX_TYPES)[number];

export function isTxType(v: unknown): v is TxType {
  return typeof v === "string" && (TX_TYPES as readonly string[]).includes(v);
}

/** How the amount reads in a list / detail: red −, green +, or neutral. */
export type TxDirection = "in" | "out" | "neutral";

export function directionOf(type: TxType): TxDirection {
  if (type === "income") return "in";
  if (type === "expense") return "out";
  return "neutral";
}

// ── status ─────────────────────────────────────────────────────────────────
export const STATUS_BY_TYPE: Record<TxType, readonly string[]> = {
  expense: ["done", "planned", "refunded"],
  income: ["done", "planned", "received"],
  transfer: ["done"],
};

export function defaultStatus(): "done" {
  return "done";
}

/** Whether a row at this (type, status) moves the derived balance. */
export function countsTowardBalance(type: TxType, status: string): boolean {
  if (type === "income") return status === "done" || status === "received";
  if (type === "expense") return status === "done";
  return true; // transfer
}

// ── recurrence ─────────────────────────────────────────────────────────────
export const RECURRENCES = ["once", "daily", "monthly"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

// ── "Lié à" ────────────────────────────────────────────────────────────────
export type LinkedToType = "person" | "project";

/**
 * Scoring axis hint (D6 — the definitive model is finalised at Lot 4). Resolved
 * server-side at write time, never taken from the client.
 *   expense  → the category's own axis (investment / consumption), else null
 *   income   → linked to a project ⇒ passive, otherwise active (SCREEN-9 § 7)
 *   transfer → null (no scoring)
 */
export function resolveScoringAxis(input: {
  type: TxType;
  categoryAxis?: string | null;
  linkedToType?: LinkedToType | null;
}): "investment" | "consumption" | "active" | "passive" | null {
  if (input.type === "transfer") return null;
  if (input.type === "income") {
    return input.linkedToType === "project" ? "passive" : "active";
  }
  const a = input.categoryAxis;
  return a === "investment" || a === "consumption" ? a : null;
}

// ── shared API row shapes (list + detail) ─────────────────────────────────

export interface TxAccountRef {
  id: string;
  name: string;
  type: string;
}
export interface TxCategoryRef {
  id: string;
  name: string;
  color: string;
}
export interface TxLinkedRef {
  type: LinkedToType;
  id: string;
  name: string;
}

export interface TxListItem {
  id: string;
  type: TxType;
  amount: number;
  occurred_on: string;
  status: string;
  note: string | null;
  scoring_axis: string | null;
  recurrence: string;
  created_at: string;
  category: TxCategoryRef | null;
  source_account: TxAccountRef | null;
  destination_account: TxAccountRef | null;
  linked_to: TxLinkedRef | null;
}

export interface TxDetail extends TxListItem {
  updated_at: string;
  template_id: string | null;
}

// ── history grouping (SCREEN-6 § 5) ────────────────────────────────────────

export interface DatedRow {
  /** YYYY-MM-DD */
  occurred_on: string;
}

export type HistoryBucketId =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | string; // "2026-07" for older months

export interface HistoryGroup<T extends DatedRow> {
  id: HistoryBucketId;
  /** first day of the group, for sorting groups newest-first */
  sortKey: string;
  rows: T[];
}

function parseISO(d: string): Date {
  return new Date(`${d}T00:00:00Z`);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}
/** Monday-based week start. */
function weekStart(d: Date): Date {
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

/**
 * Bucket a single date relative to `today` (SCREEN-6 § 5). "Cette semaine" only
 * covers days in the current ISO week that are not already today/yesterday.
 */
export function bucketFor(occurredOn: string, today: string): {
  id: HistoryBucketId;
  sortKey: string;
} {
  const d = parseISO(occurredOn);
  const t = parseISO(today);

  if (occurredOn === today) return { id: "today", sortKey: today };
  if (occurredOn === iso(addDays(t, -1)))
    return { id: "yesterday", sortKey: occurredOn };

  const thisWeek = weekStart(t);
  const lastWeek = addDays(thisWeek, -7);
  if (d >= thisWeek && d < t) return { id: "this-week", sortKey: iso(thisWeek) };
  if (d >= lastWeek && d < thisWeek)
    return { id: "last-week", sortKey: iso(lastWeek) };

  const sameMonth =
    d.getUTCFullYear() === t.getUTCFullYear() &&
    d.getUTCMonth() === t.getUTCMonth();
  if (sameMonth) {
    return { id: "this-month", sortKey: `${today.slice(0, 7)}-01` };
  }

  const prevMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
  if (
    d.getUTCFullYear() === prevMonth.getUTCFullYear() &&
    d.getUTCMonth() === prevMonth.getUTCMonth()
  ) {
    return { id: "last-month", sortKey: `${iso(prevMonth).slice(0, 7)}-01` };
  }

  const ym = occurredOn.slice(0, 7);
  return { id: ym, sortKey: `${ym}-01` };
}

/**
 * Group already-sorted-by-date-desc rows into period sections, newest first.
 * Rows inside a group keep the order they came in.
 */
export function groupByPeriod<T extends DatedRow>(
  rows: T[],
  today: string,
): HistoryGroup<T>[] {
  const groups = new Map<string, HistoryGroup<T>>();
  for (const row of rows) {
    const b = bucketFor(row.occurred_on, today);
    let g = groups.get(b.id);
    if (!g) {
      g = { id: b.id, sortKey: b.sortKey, rows: [] };
      groups.set(b.id, g);
    }
    g.rows.push(row);
  }
  return [...groups.values()].sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
}

// ── filter + sort (SCREEN-6 § 4) ──────────────────────────────────────────

export type TypeFilter = "all" | TxType;

export function matchesTypeFilter(type: TxType, filter: TypeFilter): boolean {
  return filter === "all" || filter === type;
}

export const SORTS = ["recent", "amount", "alpha", "frequent"] as const;
export type SortMode = (typeof SORTS)[number];

export interface SortableRow extends DatedRow {
  id: string;
  amount: number;
  created_at?: string;
  /** category name, else account name, else "" — the alpha/frequency key */
  label: string;
}

export function sortRows<T extends SortableRow>(rows: T[], mode: SortMode): T[] {
  const out = [...rows];
  if (mode === "amount") {
    out.sort((a, b) => b.amount - a.amount || cmpRecent(a, b));
  } else if (mode === "alpha") {
    out.sort(
      (a, b) => a.label.localeCompare(b.label, "fr") || cmpRecent(a, b),
    );
  } else if (mode === "frequent") {
    const freq = new Map<string, number>();
    for (const r of rows) freq.set(r.label, (freq.get(r.label) ?? 0) + 1);
    out.sort(
      (a, b) =>
        (freq.get(b.label) ?? 0) - (freq.get(a.label) ?? 0) ||
        a.label.localeCompare(b.label, "fr") ||
        cmpRecent(a, b),
    );
  } else {
    out.sort(cmpRecent);
  }
  return out;
}

function cmpRecent(a: SortableRow, b: SortableRow): number {
  if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? 1 : -1;
  const ca = a.created_at ?? "";
  const cb = b.created_at ?? "";
  if (ca !== cb) return ca < cb ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

// ════════════════════════════════════════════════════════════════════════════
// Multi-step form (SCREEN-8 / 9 / 10) — "une seule feuille, trois formulaires".
// 3 input steps + a success screen. Transfer's step 2 is destination-only, its
// step 3 note-only. The wizard state and per-step validation are pure so
// `tests/transactions/model.test.ts` covers them.
// ════════════════════════════════════════════════════════════════════════════

export type DatePreset = "today" | "yesterday" | "custom";

export interface TxDraft {
  type: TxType;
  datePreset: DatePreset;
  /** YYYY-MM-DD — set when datePreset === "custom" */
  customDate: string | null;
  /** raw whole-unit amount as the user typed it; "" = empty */
  amount: string;
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  categoryId: string | null;
  linkedToType: LinkedToType | null;
  linkedToId: string | null;
  note: string;
  recurrence: Recurrence;
  status: string;
}

export function emptyDraft(type: TxType): TxDraft {
  return {
    type,
    datePreset: "today",
    customDate: null,
    amount: "",
    sourceAccountId: null,
    destinationAccountId: null,
    categoryId: null,
    linkedToType: null,
    linkedToId: null,
    note: "",
    recurrence: "once",
    status: defaultStatus(),
  };
}

/** Total input steps before the success screen. Always 3 in this design. */
export const TX_STEP_COUNT = 3;

/** Resolve `datePreset` → an actual YYYY-MM-DD, given "today". */
export function resolveDraftDate(draft: TxDraft, today: string): string {
  if (draft.datePreset === "yesterday") return iso(addDays(parseISO(today), -1));
  if (draft.datePreset === "custom" && draft.customDate) return draft.customDate;
  return today;
}

/** Parse the typed amount to a positive integer, or null if invalid/empty. */
export function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Which fields on the current step are missing/invalid. Empty array ⇒ the
 * "Suivant" button is enabled.
 */
export function stepErrors(draft: TxDraft, step: number): string[] {
  const errs: string[] = [];
  if (step === 1) {
    if (draft.datePreset === "custom" && !draft.customDate) errs.push("date");
    if (parseAmount(draft.amount) === null) errs.push("amount");
    const acct =
      draft.type === "income" ? draft.destinationAccountId : draft.sourceAccountId;
    if (!acct) errs.push("account");
    return errs;
  }
  if (step === 2) {
    if (draft.type === "transfer") {
      if (!draft.destinationAccountId) errs.push("destination");
      else if (draft.destinationAccountId === draft.sourceAccountId)
        errs.push("same-account");
      return errs;
    }
    // La catégorie est exigée des deux côtés (décision d'Elias, 2026-09-08) :
    // une dépense sans catégorie ne pèse dans aucune statistique et n'entre
    // dans aucun budget — elle disparaît de tout ce que l'app sait raconter.
    if (!draft.categoryId) errs.push("category");
    if (draft.type === "income") {
      if (!draft.linkedToType || !draft.linkedToId) errs.push("linked-to");
      return errs;
    }
    // expense — "lié à" reste facultatif, mais doit être complet
    if ((draft.linkedToType == null) !== (draft.linkedToId == null))
      errs.push("linked-to");
    return errs;
  }
  // step 3 — note optional, recurrence/status always have a value
  if (draft.note.length > 500) errs.push("note");
  return errs;
}

export function canAdvance(draft: TxDraft, step: number): boolean {
  return stepErrors(draft, step).length === 0;
}

export function isDraftComplete(draft: TxDraft): boolean {
  return [1, 2, 3].every((s) => canAdvance(draft, s));
}

/** Shape matching `transactionCreateSchema` (snake_case = DB columns). */
export interface TxPayload {
  type: TxType;
  amount: number;
  occurred_on: string;
  source_account_id?: string;
  destination_account_id?: string;
  category_id?: string | null;
  linked_to_type?: LinkedToType | null;
  linked_to_id?: string | null;
  note?: string;
  status?: string;
  recurrence?: Recurrence;
}

export function draftToPayload(draft: TxDraft, today: string): TxPayload {
  const amount = parseAmount(draft.amount);
  if (amount === null) throw new Error("draft amount is not valid");
  const base: TxPayload = {
    type: draft.type,
    amount,
    occurred_on: resolveDraftDate(draft, today),
  };
  const note = draft.note.trim();
  if (note) base.note = note;

  if (draft.type === "transfer") {
    base.source_account_id = draft.sourceAccountId ?? undefined;
    base.destination_account_id = draft.destinationAccountId ?? undefined;
    return base;
  }

  if (draft.type === "income") {
    base.destination_account_id = draft.destinationAccountId ?? undefined;
    base.category_id = draft.categoryId ?? undefined;
    base.linked_to_type = draft.linkedToType ?? undefined;
    base.linked_to_id = draft.linkedToId ?? undefined;
    base.status = draft.status;
    base.recurrence = draft.recurrence;
    return base;
  }

  // expense
  base.source_account_id = draft.sourceAccountId ?? undefined;
  base.category_id = draft.categoryId ?? null;
  if (draft.linkedToType && draft.linkedToId) {
    base.linked_to_type = draft.linkedToType;
    base.linked_to_id = draft.linkedToId;
  }
  base.status = draft.status;
  base.recurrence = draft.recurrence;
  return base;
}

export interface TxDetailForEdit {
  type: TxType;
  amount: number;
  occurred_on: string;
  source_account_id: string | null;
  destination_account_id: string | null;
  category_id: string | null;
  linked_to_type: LinkedToType | null;
  linked_to_id: string | null;
  note: string | null;
  status: string;
  recurrence: string;
}

/** Rehydrate a draft from an existing transaction (edit — SCREEN-8 § 7). */
export function transactionToDraft(tx: TxDetailForEdit, today: string): TxDraft {
  const yesterday = iso(addDays(parseISO(today), -1));
  const datePreset: DatePreset =
    tx.occurred_on === today
      ? "today"
      : tx.occurred_on === yesterday
        ? "yesterday"
        : "custom";
  return {
    type: tx.type,
    datePreset,
    customDate: datePreset === "custom" ? tx.occurred_on : null,
    amount: String(tx.amount),
    sourceAccountId: tx.source_account_id,
    destinationAccountId: tx.destination_account_id,
    categoryId: tx.category_id,
    linkedToType: tx.linked_to_type,
    linkedToId: tx.linked_to_id,
    note: tx.note ?? "",
    recurrence: (RECURRENCES as readonly string[]).includes(tx.recurrence)
      ? (tx.recurrence as Recurrence)
      : "once",
    status: tx.status,
  };
}
