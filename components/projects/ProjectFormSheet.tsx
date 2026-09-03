"use client";

import { useEffect, useMemo, useState } from "react";

import { AmountField } from "@/components/transactions/AmountField";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FieldRow, FormSheet, TextField } from "@/components/ui/FormSheet";
import { apiJson } from "@/lib/http/api";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  emptyProjectDraft,
  projectDraftToPayload,
  projectFormErrors,
  projectToDraft,
  type ProjectCategory,
  type ProjectDraft,
  type ProjectListItem,
  type ProjectStatus,
} from "@/lib/projects/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function ProjectFormSheet({
  project,
  onClose,
  onSubmit,
}: {
  project?: ProjectListItem;
  onClose: () => void;
  onSubmit: (payload: ReturnType<typeof projectDraftToPayload>) => Promise<void>;
}) {
  const m = useMessages();
  const t = m.projects.form;
  const pt = m.projects;
  const [draft, setDraft] = useState<ProjectDraft>(() =>
    project ? projectToDraft(project) : emptyProjectDraft(),
  );
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ accounts: { id: string; name: string }[] }>("/api/accounts")
      .then((r) => setAccounts(r.accounts))
      .catch(() => {});
  }, []);

  const errs = useMemo(() => projectFormErrors(draft), [draft]);
  const set = (p: Partial<ProjectDraft>) => setDraft((d) => ({ ...d, ...p }));
  const show = (k: string) => touched && errs.includes(k);

  const submit = async () => {
    setTouched(true);
    if (errs.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(projectDraftToPayload(draft));
      onClose();
    } catch {
      setError(m.common.genericError);
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={project ? t.editTitle : t.createTitle}
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

      <FieldRow label={t.description} error={show("description") ? t.descriptionRequired : null}>
        <TextField
          ariaLabel={t.description}
          value={draft.description}
          onChange={(v) => set({ description: v })}
          placeholder={t.descriptionPlaceholder}
          invalid={show("description")}
          multiline
        />
      </FieldRow>

      <FieldRow label={t.category}>
        <SelectField
          ariaLabel={t.category}
          value={draft.category}
          placeholder={pt.categories.other}
          options={PROJECT_CATEGORIES.map((c) => ({ value: c, label: pt.categories[c] }))}
          onSelect={(v) => set({ category: v as ProjectCategory })}
        />
      </FieldRow>

      <FieldRow label={t.targetAmount} hint={m.common.optional} error={show("targetAmount") ? t.amountInvalid : null}>
        <AmountField
          ariaLabel={t.targetAmount}
          raw={draft.targetAmount}
          onChange={(raw) => set({ targetAmount: raw })}
          currency="XOF"
        />
      </FieldRow>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <FieldRow label={t.startDate} hint={m.common.optional}>
          <input
            type="date"
            aria-label={t.startDate}
            value={draft.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
            className="h-[52px] w-full rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-3 text-[14px] outline-none focus:border-brand-accent"
          />
        </FieldRow>
        <FieldRow label={t.endDate} hint={m.common.optional} error={show("dateOrder") ? t.dateOrder : null}>
          <input
            type="date"
            aria-label={t.endDate}
            value={draft.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
            className="h-[52px] w-full rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-3 text-[14px] outline-none focus:border-brand-accent"
          />
        </FieldRow>
      </div>

      <FieldRow label={t.status}>
        <SelectField
          ariaLabel={t.status}
          value={draft.status}
          placeholder={pt.statuses.active}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: pt.statuses[s] }))}
          onSelect={(v) => set({ status: v as ProjectStatus })}
        />
      </FieldRow>

      <FieldRow label={t.account} hint={m.common.optional}>
        <SelectField
          ariaLabel={t.account}
          value={draft.accountId}
          placeholder={t.accountAll}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
          onSelect={(id) => set({ accountId: id })}
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
