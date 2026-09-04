"use client";

import { useMemo, useState } from "react";

import { AmountField } from "@/components/transactions/AmountField";
import { ChoiceGrid } from "@/components/transactions/ChoiceGrid";
import { LinkedToField } from "@/components/transactions/LinkedToField";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FieldRow, FormSheet, TextField } from "@/components/ui/FormSheet";
import { RECURRENCES, type LinkedToType } from "@/lib/transactions/model";
import { useTxRefData } from "@/lib/transactions/useTxRefData";
import {
  emptyTemplateDraft,
  templateDraftToPayload,
  templateFormErrors,
  templateToFormDraft,
  type TemplateDraft,
  type TemplateKind,
  type TemplateListItem,
} from "@/lib/templates/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function TemplateFormSheet({
  template,
  onClose,
  onSubmit,
}: {
  template?: TemplateListItem;
  onClose: () => void;
  onSubmit: (payload: ReturnType<typeof templateDraftToPayload>) => Promise<void>;
}) {
  const m = useMessages();
  const t = m.templates.form;
  const [draft, setDraft] = useState<TemplateDraft>(() =>
    template ? templateToFormDraft(template) : emptyTemplateDraft(),
  );
  const ref = useTxRefData(draft.kind);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errs = useMemo(() => templateFormErrors(draft), [draft]);
  const set = (p: Partial<TemplateDraft>) => setDraft((d) => ({ ...d, ...p }));
  const show = (k: string) => touched && errs.includes(k);

  const submit = async () => {
    setTouched(true);
    if (errs.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(templateDraftToPayload(draft));
      onClose();
    } catch {
      setError(m.common.genericError);
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={template ? t.editTitle : t.createTitle}
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
      <FieldRow label={t.name} error={show("name") ? t.nameRequired : null}>
        <TextField
          ariaLabel={t.name}
          value={draft.name}
          onChange={(v) => set({ name: v })}
          placeholder={t.namePlaceholder}
          invalid={show("name")}
        />
      </FieldRow>

      <FieldRow label={t.description} hint={m.common.optional}>
        <TextField
          ariaLabel={t.description}
          value={draft.description}
          onChange={(v) => set({ description: v })}
          placeholder={t.descriptionPlaceholder}
        />
      </FieldRow>

      {!template ? (
        <FieldRow label={t.kind}>
          <ChoiceGrid
            ariaLabel={t.kind}
            columns={2}
            value={draft.kind}
            onChange={(v) =>
              set({
                kind: v as TemplateKind,
                categoryId: null,
                linkedToType: null,
                linkedToId: null,
              })
            }
            options={[
              { value: "expense", label: t.kindExpense },
              { value: "income", label: t.kindIncome },
            ]}
          />
        </FieldRow>
      ) : null}

      <FieldRow label={t.amount} error={show("amount") ? t.amountRequired : null}>
        <AmountField
          ariaLabel={t.amount}
          raw={draft.amount}
          onChange={(raw) => set({ amount: raw })}
          currency="XOF"
          direction={draft.kind === "income" ? "in" : "neutral"}
        />
      </FieldRow>

      <FieldRow label={t.category} hint={m.common.optional}>
        <SelectField
          ariaLabel={t.category}
          value={draft.categoryId}
          placeholder={t.categoryPlaceholder}
          options={ref.categories.map((c) => ({ value: c.id, label: c.name }))}
          onSelect={(id) => set({ categoryId: id })}
        />
      </FieldRow>

      <FieldRow label={t.account} hint={m.common.optional}>
        <SelectField
          ariaLabel={t.account}
          value={draft.accountId}
          placeholder={t.accountPlaceholder}
          options={ref.accounts.map((a) => ({ value: a.id, label: a.name }))}
          onSelect={(id) => set({ accountId: id })}
        />
      </FieldRow>

      <div className="mb-4">
        <LinkedToField
          m={m}
          linkedToType={draft.linkedToType}
          linkedToId={draft.linkedToId}
          onChange={(lt: LinkedToType | null, id) =>
            set({ linkedToType: lt, linkedToId: id })
          }
          people={ref.people}
          projects={ref.projects}
          createPerson={ref.createPerson}
          createProject={ref.createProject}
          required={false}
          invalid={show("linkedTo")}
        />
      </div>

      <FieldRow label={t.recurrence}>
        <ChoiceGrid
          ariaLabel={t.recurrence}
          columns={3}
          value={draft.recurrence}
          onChange={(v) => set({ recurrence: v as TemplateDraft["recurrence"] })}
          options={RECURRENCES.map((r) => ({ value: r, label: m.transactions.recurrence[r] }))}
        />
        {draft.recurrence !== "once" ? (
          <span className="t-secondary text-text-tertiary">{t.recurrenceHint}</span>
        ) : null}
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
