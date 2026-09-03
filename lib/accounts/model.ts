/**
 * Accounts domain model (SCREEN-17 — Gestion des comptes). Pure + import-free so
 * `tests/accounts/model.test.ts` runs it under `node --test`.
 *
 * Balance is always derived (D3) — never in a draft or payload. `currency` is a
 * display label only (D1). Monthly fees: `fixed` = whole francs, `percent` =
 * basis points (50 = 0.50 %), charged by the daily cron (D2).
 */

export const ACCOUNT_TYPES = ["cash", "mobile", "bank", "card"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(v: unknown): v is AccountType {
  return (
    typeof v === "string" && (ACCOUNT_TYPES as readonly string[]).includes(v)
  );
}

export const MOBILE_PROVIDERS = [
  "Wave",
  "Orange Money",
  "Moov Money",
  "MTN MoMo",
  "Free Money",
  "Autre",
] as const;

export const CARD_NETWORKS = ["visa", "mastercard", "amex", "other"] as const;
export type CardNetwork = (typeof CARD_NETWORKS)[number];

export const FEE_MODES = ["fixed", "percent"] as const;
export type FeeMode = (typeof FEE_MODES)[number];

/** Fee types are offered on bank + card accounts only (SCREEN-17 § 7). */
export function feesAllowed(type: AccountType): boolean {
  return type === "bank" || type === "card";
}

// ── sort (SCREEN-17 § 4) ──────────────────────────────────────────────────
export const ACCOUNT_SORTS = ["recent", "type", "balance", "favorite"] as const;
export type AccountSort = (typeof ACCOUNT_SORTS)[number];

export interface AccountCardData {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  initial_balance: number;
  monthly_fee: number | null;
  fee_type: FeeMode | null;
  provider: string | null;
  card_network: string | null;
  account_number: string | null;
  notes: string | null;
  is_primary: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  /** count of transactions touching this account — gates hard delete */
  tx_count?: number;
}

const TYPE_ORDER: Record<AccountType, number> = {
  cash: 0,
  mobile: 1,
  bank: 2,
  card: 3,
};

export function sortAccounts<T extends AccountCardData>(
  rows: T[],
  mode: AccountSort,
): T[] {
  const out = [...rows];
  const byRecent = (a: T, b: T) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  if (mode === "type") {
    out.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || byRecent(a, b));
  } else if (mode === "balance") {
    out.sort((a, b) => b.balance - a.balance || byRecent(a, b));
  } else if (mode === "favorite") {
    out.sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || byRecent(a, b),
    );
  } else {
    // "recent" — primary always leads (SCREEN-4/17)
    out.sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || byRecent(a, b),
    );
  }
  return out;
}

/** basis points → percent number, e.g. 50 → 0.5. */
export function bpToPercent(bp: number): number {
  return bp / 100;
}
/** percent number → basis points, e.g. 0.5 → 50. */
export function percentToBp(pct: number): number {
  return Math.round(pct * 100);
}

// ── form (SCREEN-17 § 7) ──────────────────────────────────────────────────

export interface AccountDraft {
  name: string;
  type: AccountType;
  /** whole-unit amount as typed; "" = 0 */
  initialBalance: string;
  currency: string;
  provider: string | null;
  cardNetwork: CardNetwork | null;
  accountNumber: string;
  /** whether a monthly fee is configured */
  hasFee: boolean;
  feeMode: FeeMode;
  /** raw fee value as typed: francs (fixed) or a percent like "0.5" (percent) */
  feeValue: string;
  notes: string;
  isFavorite: boolean;
}

export function emptyAccountDraft(): AccountDraft {
  return {
    name: "",
    type: "cash",
    initialBalance: "",
    currency: "XOF",
    provider: null,
    cardNetwork: null,
    accountNumber: "",
    hasFee: false,
    feeMode: "fixed",
    feeValue: "",
    notes: "",
    isFavorite: false,
  };
}

export function accountToDraft(a: AccountCardData): AccountDraft {
  return {
    name: a.name,
    type: a.type,
    initialBalance: String(a.initial_balance),
    currency: a.currency,
    provider: a.provider,
    cardNetwork: (a.card_network as CardNetwork | null) ?? null,
    accountNumber: a.account_number ?? "",
    hasFee: a.monthly_fee !== null,
    feeMode: a.fee_type ?? "fixed",
    feeValue:
      a.monthly_fee === null
        ? ""
        : a.fee_type === "percent"
          ? String(bpToPercent(a.monthly_fee))
          : String(a.monthly_fee),
    notes: a.notes ?? "",
    isFavorite: a.is_favorite,
  };
}

/** Parse a whole-unit amount that may be zero. `null` ⇒ invalid. */
export function parseWholeAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function parseFeeValue(raw: string, mode: FeeMode): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "") return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return mode === "percent" ? percentToBp(n) : Math.round(n);
}

export function accountFormErrors(draft: AccountDraft): string[] {
  const errs: string[] = [];
  if (draft.name.trim().length < 1) errs.push("name");
  if (parseWholeAmount(draft.initialBalance) === null) errs.push("initialBalance");
  if (draft.type === "mobile" && !draft.provider) errs.push("provider");
  if (draft.type === "card" && !draft.cardNetwork) errs.push("cardNetwork");
  if (draft.hasFee && feesAllowed(draft.type)) {
    const v = parseFeeValue(draft.feeValue, draft.feeMode);
    if (v === null || v <= 0) errs.push("feeValue");
  }
  return errs;
}

export function isAccountDraftValid(draft: AccountDraft): boolean {
  return accountFormErrors(draft).length === 0;
}

export interface AccountPayload {
  name: string;
  type: AccountType;
  initial_balance: number;
  currency: string;
  provider?: string | null;
  card_network?: string | null;
  account_number?: string | null;
  monthly_fee?: number | null;
  fee_type?: FeeMode | null;
  is_favorite: boolean;
  notes?: string | null;
}

export function draftToAccountPayload(draft: AccountDraft): AccountPayload {
  const balance = parseWholeAmount(draft.initialBalance);
  if (balance === null) throw new Error("initial balance invalid");

  const withFee =
    draft.hasFee && feesAllowed(draft.type)
      ? parseFeeValue(draft.feeValue, draft.feeMode)
      : null;

  const payload: AccountPayload = {
    name: draft.name.trim(),
    type: draft.type,
    initial_balance: balance,
    currency: draft.currency,
    is_favorite: draft.isFavorite,
    provider: draft.type === "mobile" ? draft.provider : null,
    card_network: draft.type === "card" ? draft.cardNetwork : null,
    account_number:
      draft.type === "bank" && draft.accountNumber.trim()
        ? draft.accountNumber.trim()
        : null,
    monthly_fee: withFee,
    fee_type: withFee !== null ? draft.feeMode : null,
    notes: draft.notes.trim() ? draft.notes.trim() : null,
  };
  return payload;
}
