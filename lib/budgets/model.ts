/**
 * Budgets domain model (SCREEN-15). Pure + import-free so
 * `tests/budgets/model.test.ts` runs it under `node --test`.
 *
 * Monthly, one per category. "Dépensé" = this month's settled expenses in the
 * category. Colour thresholds (SCREEN-15 § 5): green 0-50 %, orange 51-91 %,
 * red 92 %+ (the 92 % line also drives the Dashboard alert — cron, D2).
 */

export type BudgetTone = "green" | "orange" | "red";

export function budgetTone(ratio: number): BudgetTone {
  if (ratio >= 0.92) return "red";
  if (ratio > 0.5) return "orange";
  return "green";
}

export interface BudgetStatus {
  ratio: number;
  /** rounded percent, not capped (can read > 100) */
  percent: number;
  tone: BudgetTone;
  over: boolean;
}

export function budgetStatus(spent: number, allocated: number): BudgetStatus {
  const ratio = allocated > 0 ? spent / allocated : spent > 0 ? 1 : 0;
  return {
    ratio,
    percent: Math.round(ratio * 100),
    tone: budgetTone(ratio),
    over: spent > allocated,
  };
}

export interface BudgetListItem {
  id: string;
  category: { id: string; name: string; color: string };
  allocated_amount: number;
  spent: number;
  is_favorite: boolean;
  tx_count: number;
  created_at: string;
}

// ── sort (SCREEN-15 § 4) ─────────────────────────────────────────────────
export const BUDGET_SORTS = [
  "recent",
  "frequent",
  "alpha",
  "amount",
  "favorite",
] as const;
export type BudgetSort = (typeof BUDGET_SORTS)[number];

export function sortBudgets<T extends BudgetListItem>(
  rows: T[],
  mode: BudgetSort,
): T[] {
  const out = [...rows];
  const recent = (a: T, b: T) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  if (mode === "frequent") {
    out.sort((a, b) => b.tx_count - a.tx_count || recent(a, b));
  } else if (mode === "alpha") {
    out.sort(
      (a, b) => a.category.name.localeCompare(b.category.name, "fr") || recent(a, b),
    );
  } else if (mode === "amount") {
    out.sort((a, b) => b.allocated_amount - a.allocated_amount || recent(a, b));
  } else if (mode === "favorite") {
    out.sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || recent(a, b),
    );
  } else {
    out.sort(recent);
  }
  return out;
}

// ── form (SCREEN-15 § 8) ─────────────────────────────────────────────────

export interface BudgetDraft {
  categoryId: string | null;
  allocated: string;
  isFavorite: boolean;
}

export function emptyBudgetDraft(): BudgetDraft {
  return { categoryId: null, allocated: "", isFavorite: false };
}

export function budgetToDraft(b: BudgetListItem): BudgetDraft {
  return {
    categoryId: b.category.id,
    allocated: String(b.allocated_amount),
    isFavorite: b.is_favorite,
  };
}

function parsePositive(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function budgetFormErrors(
  draft: BudgetDraft,
  isEdit: boolean,
): string[] {
  const errs: string[] = [];
  if (!isEdit && !draft.categoryId) errs.push("category");
  if (parsePositive(draft.allocated) === null) errs.push("allocated");
  return errs;
}

export interface BudgetPayload {
  category_id?: string;
  allocated_amount: number;
  is_favorite: boolean;
}

export function budgetDraftToPayload(
  draft: BudgetDraft,
  isEdit: boolean,
): BudgetPayload {
  const allocated = parsePositive(draft.allocated);
  if (allocated === null) throw new Error("allocated invalid");
  const payload: BudgetPayload = {
    allocated_amount: allocated,
    is_favorite: draft.isFavorite,
  };
  if (!isEdit && draft.categoryId) payload.category_id = draft.categoryId;
  return payload;
}
