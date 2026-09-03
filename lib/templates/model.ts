/**
 * Templates domain model (SCREEN-14). Pure + import-free so
 * `tests/templates/model.test.ts` runs it under `node --test`.
 *
 * A template is a pre-filled transaction; a recurring template (`recurrence` ≠
 * "once") also drives the daily cron (D2 — `lib/recurrence`).
 */

import type { LinkedToType, Recurrence, TxDraft } from "@/lib/transactions/model";

export type TemplateKind = "expense" | "income";
export type TemplateKindFilter = "all" | TemplateKind;

export interface TemplateRef {
  name: string;
  color?: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  description: string;
  kind: TemplateKind;
  amount: number;
  category: TemplateRef | null;
  account: TemplateRef | null;
  linked_to: { type: LinkedToType; name: string } | null;
  recurrence: Recurrence;
  usage_count: number;
  is_favorite: boolean;
  next_run_on: string | null;
  category_id: string | null;
  account_id: string | null;
  linked_to_type: LinkedToType | null;
  linked_to_id: string | null;
  created_at: string;
}

export function matchesKindFilter(
  kind: TemplateKind,
  filter: TemplateKindFilter,
): boolean {
  return filter === "all" || filter === kind;
}

// ── sort (SCREEN-14 § 4) ─────────────────────────────────────────────────
export const TEMPLATE_SORTS = [
  "recent",
  "frequent",
  "alpha",
  "amount",
  "favorite",
] as const;
export type TemplateSort = (typeof TEMPLATE_SORTS)[number];

export function sortTemplates<T extends TemplateListItem>(
  rows: T[],
  mode: TemplateSort,
): T[] {
  const out = [...rows];
  const recent = (a: T, b: T) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  if (mode === "frequent") {
    out.sort((a, b) => b.usage_count - a.usage_count || recent(a, b));
  } else if (mode === "alpha") {
    out.sort((a, b) => a.name.localeCompare(b.name, "fr") || recent(a, b));
  } else if (mode === "amount") {
    out.sort((a, b) => b.amount - a.amount || recent(a, b));
  } else if (mode === "favorite") {
    out.sort(
      (a, b) => Number(b.is_favorite) - Number(a.is_favorite) || recent(a, b),
    );
  } else {
    out.sort(recent);
  }
  return out;
}

// ── launch (tap = prefill the transaction wizard) ────────────────────────

/** Build a wizard draft from a template (SCREEN-14 § 6 "tap simple"). */
export function templateToDraft(tpl: TemplateListItem): TxDraft {
  const isExpense = tpl.kind === "expense";
  return {
    type: tpl.kind,
    datePreset: "today",
    customDate: null,
    amount: String(tpl.amount),
    sourceAccountId: isExpense ? tpl.account_id : null,
    destinationAccountId: isExpense ? null : tpl.account_id,
    categoryId: tpl.category_id,
    linkedToType: tpl.linked_to_type,
    linkedToId: tpl.linked_to_id,
    note: "",
    recurrence: tpl.recurrence,
    status: "done",
  };
}

// ── form (SCREEN-14 § 7) ─────────────────────────────────────────────────

export interface TemplateDraft {
  name: string;
  description: string;
  kind: TemplateKind;
  amount: string;
  categoryId: string | null;
  linkedToType: LinkedToType | null;
  linkedToId: string | null;
  accountId: string | null;
  recurrence: Recurrence;
  isFavorite: boolean;
}

export function emptyTemplateDraft(kind: TemplateKind = "expense"): TemplateDraft {
  return {
    name: "",
    description: "",
    kind,
    amount: "",
    categoryId: null,
    linkedToType: null,
    linkedToId: null,
    accountId: null,
    recurrence: "once",
    isFavorite: false,
  };
}

export function templateToFormDraft(tpl: TemplateListItem): TemplateDraft {
  return {
    name: tpl.name,
    description: tpl.description,
    kind: tpl.kind,
    amount: String(tpl.amount),
    categoryId: tpl.category_id,
    linkedToType: tpl.linked_to_type,
    linkedToId: tpl.linked_to_id,
    accountId: tpl.account_id,
    recurrence: tpl.recurrence,
    isFavorite: tpl.is_favorite,
  };
}

function parsePositive(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function templateFormErrors(draft: TemplateDraft): string[] {
  const errs: string[] = [];
  if (draft.name.trim().length < 1) errs.push("name");
  if (parsePositive(draft.amount) === null) errs.push("amount");
  if ((draft.linkedToType == null) !== (draft.linkedToId == null))
    errs.push("linkedTo");
  return errs;
}

export function isTemplateDraftValid(draft: TemplateDraft): boolean {
  return templateFormErrors(draft).length === 0;
}

export interface TemplatePayload {
  name: string;
  description: string;
  kind: TemplateKind;
  amount: number;
  category_id: string | null;
  linked_to_type: LinkedToType | null;
  linked_to_id: string | null;
  account_id: string | null;
  recurrence: Recurrence;
  is_favorite: boolean;
}

export function templateDraftToPayload(draft: TemplateDraft): TemplatePayload {
  const amount = parsePositive(draft.amount);
  if (amount === null) throw new Error("template amount invalid");
  const hasLink = Boolean(draft.linkedToType && draft.linkedToId);
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    kind: draft.kind,
    amount,
    category_id: draft.categoryId,
    linked_to_type: hasLink ? draft.linkedToType : null,
    linked_to_id: hasLink ? draft.linkedToId : null,
    account_id: draft.accountId,
    recurrence: draft.recurrence,
    is_favorite: draft.isFavorite,
  };
}
