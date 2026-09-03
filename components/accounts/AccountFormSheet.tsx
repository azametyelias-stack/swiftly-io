"use client";

import { useMemo, useState } from "react";

import { ChoiceGrid } from "@/components/transactions/ChoiceGrid";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FieldRow, FormSheet, TextField } from "@/components/ui/FormSheet";
import {
  ACCOUNT_TYPES,
  CARD_NETWORKS,
  MOBILE_PROVIDERS,
  accountFormErrors,
  draftToAccountPayload,
  emptyAccountDraft,
  feesAllowed,
  type AccountCardData,
  type AccountDraft,
} from "@/lib/accounts/model";
import { accountToDraft } from "@/lib/accounts/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function AccountFormSheet({
  account,
  onClose,
  onSubmit,
}: {
  account?: AccountCardData;
  onClose: () => void;
  onSubmit: (payload: ReturnType<typeof draftToAccountPayload>) => Promise<void>;
}) {
  const m = useMessages();
  const t = m.accounts.form;
  const [draft, setDraft] = useState<AccountDraft>(() =>
    account ? accountToDraft(account) : emptyAccountDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const errs = useMemo(() => accountFormErrors(draft), [draft]);
  const set = (p: Partial<AccountDraft>) => setDraft((d) => ({ ...d, ...p }));
  const show = (k: string) => touched && errs.includes(k);

  const submit = async () => {
    setTouched(true);
    if (errs.length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(draftToAccountPayload(draft));
      onClose();
    } catch {
      setError(m.common.genericError);
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={account ? t.editTitle : t.createTitle}
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

      <FieldRow label={t.type}>
        <ChoiceGrid
          ariaLabel={t.type}
          columns={2}
          value={draft.type}
          onChange={(v) =>
            set({
              type: v as AccountDraft["type"],
              provider: null,
              cardNetwork: null,
              hasFee: feesAllowed(v as AccountDraft["type"]) ? draft.hasFee : false,
            })
          }
          options={ACCOUNT_TYPES.map((ty) => ({ value: ty, label: t.types[ty] }))}
        />
      </FieldRow>

      <FieldRow label={t.initialBalance} error={show("initialBalance") ? t.amountInvalid : null}>
        <TextField
          ariaLabel={t.initialBalance}
          value={draft.initialBalance}
          inputMode="numeric"
          onChange={(v) => set({ initialBalance: v.replace(/[^\d]/g, "") })}
          placeholder="0"
          invalid={show("initialBalance")}
        />
      </FieldRow>

      {draft.type === "mobile" ? (
        <FieldRow label={t.provider} error={show("provider") ? t.providerRequired : null}>
          <SelectField
            ariaLabel={t.provider}
            value={draft.provider}
            placeholder={t.providerPlaceholder}
            invalid={show("provider")}
            options={MOBILE_PROVIDERS.map((p) => ({ value: p, label: p }))}
            onSelect={(v) => set({ provider: v })}
          />
        </FieldRow>
      ) : null}

      {draft.type === "card" ? (
        <FieldRow label={t.network} error={show("cardNetwork") ? t.networkRequired : null}>
          <SelectField
            ariaLabel={t.network}
            value={draft.cardNetwork}
            placeholder={t.networkPlaceholder}
            invalid={show("cardNetwork")}
            options={CARD_NETWORKS.map((n) => ({ value: n, label: t.networks[n] }))}
            onSelect={(v) => set({ cardNetwork: v as AccountDraft["cardNetwork"] })}
          />
        </FieldRow>
      ) : null}

      {draft.type === "bank" ? (
        <FieldRow label={t.accountNumber} hint={m.common.optional}>
          <TextField
            ariaLabel={t.accountNumber}
            value={draft.accountNumber}
            onChange={(v) => set({ accountNumber: v })}
            placeholder={t.accountNumberPlaceholder}
          />
        </FieldRow>
      ) : null}

      {feesAllowed(draft.type) ? (
        <FieldRow label={t.monthlyFee} hint={m.common.optional}>
          <label className="mb-2 flex items-center gap-2 text-[14px]">
            <input
              type="checkbox"
              checked={draft.hasFee}
              onChange={(e) => set({ hasFee: e.target.checked })}
            />
            {t.hasFee}
          </label>
          {draft.hasFee ? (
            <div className="flex flex-col gap-2">
              <ChoiceGrid
                ariaLabel={t.feeMode}
                columns={2}
                value={draft.feeMode}
                onChange={(v) => set({ feeMode: v as AccountDraft["feeMode"] })}
                options={[
                  { value: "fixed", label: t.feeFixed },
                  { value: "percent", label: t.feePercent },
                ]}
              />
              <TextField
                ariaLabel={t.feeValue}
                value={draft.feeValue}
                inputMode="decimal"
                onChange={(v) => set({ feeValue: v })}
                placeholder={draft.feeMode === "percent" ? "0,5" : "800"}
                invalid={show("feeValue")}
              />
            </div>
          ) : null}
        </FieldRow>
      ) : null}

      <FieldRow label={t.notes} hint={m.common.optional}>
        <TextField
          ariaLabel={t.notes}
          value={draft.notes}
          onChange={(v) => set({ notes: v })}
          placeholder={t.notesPlaceholder}
          multiline
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
