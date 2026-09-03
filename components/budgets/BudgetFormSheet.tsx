"use client";

import { useEffect, useMemo, useState } from "react";

import { AmountField } from "@/components/transactions/AmountField";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FieldRow, FormSheet } from "@/components/ui/FormSheet";
import { apiJson } from "@/lib/http/api";
import {
  budgetDraftToPayload,
  budgetFormErrors,
  budgetToDraft,
  emptyBudgetDraft,
  type BudgetDraft,
  type BudgetListItem,
} from "@/lib/budgets/model";
import { useMessages } from "@/lib/i18n/useMessages";

interface Category {
  id: string;
  name: string;
}

export function BudgetFormSheet({
  budget,
  usedCategoryIds,
  onClose,
  onSubmit,
}: {
  budget?: BudgetListItem;
  usedCategoryIds: string[];
  onClose: () => void;
  onSubmit: (payload: ReturnType<typeof budgetDraftToPayload>) => Promise<void>;
}) {
  const m = useMessages();
  const t = m.budgets.form;
  const isEdit = Boolean(budget);
  const [draft, setDraft] = useState<BudgetDraft>(() =>
    budget ? budgetToDraft(budget) : emptyBudgetDraft(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) return;
    apiJson<{ categories: Category[] }>("/api/categories?kind=expense")
      .then((r) => setCategories(r.categories))
      .catch(() => {});
  }, [isEdit]);

  const available = useMemo(
    () => categories.filter((c) => !usedCategoryIds.includes(c.id)),
    [categories, usedCategoryIds],
  );
  const errs = budgetFormErrors(draft, isEdit);
  const set = (p: Partial<BudgetDraft>) => setDraft((d) => ({ ...d, ...p }));
  const show = (k: string) => touched && errs.includes(k);

  const submit = async () => {
    setTouched(true);
    if (errs.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(budgetDraftToPayload(draft, isEdit));
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? m.common.genericError);
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={isEdit ? t.editTitle : t.createTitle}
      onClose={onClose}
      closeLabel={m.common.cancel}
      footer={
        <>
          <SheetButton variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
            {m.common.cancel}
          </SheetButton>
          <SheetButton variant="primary" className="flex-1" onClick={submit} disabled={saving}>
            {saving ? `${m.common.confirm}…` : m.common.confirm}
          </SheetButton>
        </>
      }
    >
      <FieldRow label={t.category} error={show("category") ? t.categoryRequired : null}>
        {isEdit ? (
          <div className="flex h-[52px] items-center rounded-[var(--radius-icon)] border border-surface-rail bg-surface-field px-4 text-[15px] font-medium text-text-secondary">
            {budget!.category.name}
          </div>
        ) : (
          <SelectField
            ariaLabel={t.category}
            value={draft.categoryId}
            placeholder={t.categoryPlaceholder}
            invalid={show("category")}
            options={available.map((c) => ({ value: c.id, label: c.name }))}
            onSelect={(id) => set({ categoryId: id })}
          />
        )}
        {!isEdit && available.length === 0 && categories.length > 0 ? (
          <span className="t-secondary text-text-tertiary">{t.allCategoriesUsed}</span>
        ) : null}
      </FieldRow>

      <FieldRow label={t.allocated} error={show("allocated") ? t.allocatedRequired : null}>
        <AmountField
          ariaLabel={t.allocated}
          raw={draft.allocated}
          onChange={(raw) => set({ allocated: raw })}
          currency="XOF"
        />
      </FieldRow>

      <label className="flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={draft.isFavorite}
          onChange={(e) => set({ isFavorite: e.target.checked })}
        />
        {t.markFavorite}
      </label>

      {error ? <p className="mt-3 t-secondary text-semantic-out">{error}</p> : null}
    </FormSheet>
  );
}
