/**
 * Projects domain model (SCREEN-16). Pure + import-free so
 * `tests/projects/model.test.ts` runs it under `node --test`.
 *
 * "Dépensé" = Σ settled expenses "Lié à" the project (SCREEN-16 § 10).
 * "Alloué" = money reserved via "Affecter au solde" (D4) — moves the account
 * balance without a transaction; the daily balance function nets it against the
 * spent amount so nothing is double-counted.
 * Progress bar (§ 5) shows only when a `target_amount` was set.
 */

export const PROJECT_CATEGORIES = [
  "construction",
  "acquisition",
  "investment",
  "education",
  "health",
  "travel",
  "event",
  "business",
  "equipment",
  "leisure",
  "savings",
  "other",
] as const;
export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export function isProjectCategory(v: unknown): v is ProjectCategory {
  return (
    typeof v === "string" &&
    (PROJECT_CATEGORIES as readonly string[]).includes(v)
  );
}

export const PROJECT_STATUSES = ["active", "done", "paused", "onhold"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type ProjectTone = "green" | "orange" | "red";

export interface ProjectProgress {
  ratio: number;
  percent: number;
  tone: ProjectTone;
}

/** Progress against the target (SCREEN-16 § 5). Null when there is no target. */
export function projectProgress(
  funded: number,
  target: number | null,
): ProjectProgress | null {
  if (!target || target <= 0) return null;
  const ratio = funded / target;
  const tone: ProjectTone =
    ratio >= 0.92 ? "red" : ratio > 0.5 ? "orange" : "green";
  return { ratio, percent: Math.round(ratio * 100), tone };
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory | string;
  target_amount: number | null;
  allocated_amount: number;
  spent: number;
  status: ProjectStatus;
  account_id: string | null;
  is_favorite: boolean;
  start_date: string | null;
  end_date: string | null;
  tx_count: number;
  created_at: string;
}

// ── sort (SCREEN-16 § 4) ─────────────────────────────────────────────────
export const PROJECT_SORTS = [
  "recent",
  "frequent",
  "alpha",
  "amount",
  "favorite",
] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

export function sortProjects<T extends ProjectListItem>(
  rows: T[],
  mode: ProjectSort,
): T[] {
  const out = [...rows];
  const recent = (a: T, b: T) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  if (mode === "frequent") {
    out.sort((a, b) => b.tx_count - a.tx_count || recent(a, b));
  } else if (mode === "alpha") {
    out.sort((a, b) => a.name.localeCompare(b.name, "fr") || recent(a, b));
  } else if (mode === "amount") {
    out.sort(
      (a, b) => (b.target_amount ?? 0) - (a.target_amount ?? 0) || recent(a, b),
    );
  } else if (mode === "favorite") {
    out.sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || recent(a, b),
    );
  } else {
    out.sort(recent);
  }
  return out;
}

// ── form (SCREEN-16 § 8) ─────────────────────────────────────────────────

export interface ProjectDraft {
  name: string;
  description: string;
  category: ProjectCategory;
  targetAmount: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  accountId: string | null;
  isFavorite: boolean;
}

export function emptyProjectDraft(): ProjectDraft {
  return {
    name: "",
    description: "",
    category: "other",
    targetAmount: "",
    startDate: "",
    endDate: "",
    status: "active",
    accountId: null,
    isFavorite: false,
  };
}

export function projectToDraft(p: ProjectListItem): ProjectDraft {
  return {
    name: p.name,
    description: p.description,
    category: isProjectCategory(p.category) ? p.category : "other",
    targetAmount: p.target_amount ? String(p.target_amount) : "",
    startDate: p.start_date ?? "",
    endDate: p.end_date ?? "",
    status: p.status,
    accountId: p.account_id,
    isFavorite: p.is_favorite,
  };
}

function parsePositive(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function projectFormErrors(draft: ProjectDraft): string[] {
  const errs: string[] = [];
  if (draft.name.trim().length < 1) errs.push("name");
  if (draft.description.trim().length < 1) errs.push("description");
  if (draft.targetAmount.trim() !== "" && parsePositive(draft.targetAmount) === null)
    errs.push("targetAmount");
  if (
    draft.startDate &&
    draft.endDate &&
    draft.endDate < draft.startDate
  )
    errs.push("dateOrder");
  return errs;
}

export function isProjectDraftValid(draft: ProjectDraft): boolean {
  return projectFormErrors(draft).length === 0;
}

export interface ProjectPayload {
  name: string;
  description: string;
  category: string;
  target_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: ProjectStatus;
  account_id: string | null;
  is_favorite: boolean;
}

export function projectDraftToPayload(draft: ProjectDraft): ProjectPayload {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    target_amount: draft.targetAmount.trim()
      ? parsePositive(draft.targetAmount)
      : null,
    start_date: draft.startDate || null,
    end_date: draft.endDate || null,
    status: draft.status,
    account_id: draft.accountId,
    is_favorite: draft.isFavorite,
  };
}

// ── allocation (D4) ──────────────────────────────────────────────────────
export function parseAllocationAmount(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
