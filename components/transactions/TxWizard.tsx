"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountTypeIcon, ChevronLeftIcon, InfoIcon } from "@/components/nav/icons";
import { AmountField } from "@/components/transactions/AmountField";
import { ChoiceGrid } from "@/components/transactions/ChoiceGrid";
import { LinkedToField } from "@/components/transactions/LinkedToField";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { StepDots } from "@/components/transactions/StepDots";
import { TxSheet } from "@/components/transactions/TxSheet";
import { TxSuccess } from "@/components/transactions/TxSuccess";
import { apiJson } from "@/lib/http/api";
import { todayISO } from "@/lib/format/date";
import type { CurrencyCode } from "@/lib/format/money";
import {
  canAdvance,
  draftToPayload,
  emptyDraft,
  RECURRENCES,
  STATUS_BY_TYPE,
  stepErrors,
  TX_STEP_COUNT,
  type LinkedToType,
  type TxDetail,
  type TxDraft,
  type TxType,
} from "@/lib/transactions/model";
import { useTxRefData } from "@/lib/transactions/useTxRefData";
import { markTemplateUsed } from "@/lib/templates/useTemplates";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";

export function TxWizard({
  type,
  transactionId,
  initialDraft,
  launchedTemplateId,
}: {
  type: TxType;
  transactionId?: string;
  initialDraft?: TxDraft;
  /** set when this wizard was opened by tapping a template (SCREEN-14 § 6) */
  launchedTemplateId?: string;
}) {
  const m = useMessages();
  const t = m.transactions;
  const router = useRouter();
  const isEdit = Boolean(transactionId);
  const today = todayISO();

  const ref = useTxRefData(type);
  const [draft, setDraft] = useState<TxDraft>(() => initialDraft ?? emptyDraft(type));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{
    transaction: TxDetail;
    warning: { balance: number } | null;
  } | null>(null);

  const defaultAccountId =
    ref.accounts.find((a) => a.is_primary)?.id ?? ref.accounts[0]?.id ?? null;

  // Pre-select the primary account without a set-state-in-effect.
  const eff: TxDraft = useMemo(() => {
    const d = { ...draft };
    if (type === "income") {
      d.destinationAccountId = draft.destinationAccountId ?? defaultAccountId;
    } else {
      d.sourceAccountId = draft.sourceAccountId ?? defaultAccountId;
    }
    return d;
  }, [draft, defaultAccountId, type]);

  const currency = (ref.accounts[0]?.currency ?? "XOF") as CurrencyCode;
  const heading = isEdit
    ? type === "expense"
      ? t.new.editExpense
      : type === "income"
        ? t.new.editIncome
        : t.new.editTransfer
    : type === "expense"
      ? t.new.headingExpense
      : type === "income"
        ? t.new.headingIncome
        : t.new.headingTransfer;

  const patch = (p: Partial<TxDraft>) => {
    setSaveError(null);
    setDraft((d) => ({ ...d, ...p }));
  };

  const goBack = () => {
    if (step === 1) router.back();
    else setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const goNext = async () => {
    if (!canAdvance(eff, step)) return;
    if (step < TX_STEP_COUNT) {
      setStep((s) => (s + 1) as 1 | 2 | 3);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = draftToPayload(eff, today);
      const res = await apiJson<{
        transaction: TxDetail;
        warning: { code: string; balance: number } | null;
      }>(isEdit ? `/api/transactions/${transactionId}` : "/api/transactions", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved({
        transaction: res.transaction,
        warning: res.warning ? { balance: res.warning.balance } : null,
      });
      if (launchedTemplateId && !isEdit) void markTemplateUsed(launchedTemplateId);
    } catch {
      setSaveError(t.errors.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <TxSuccess
        type={type}
        transaction={saved.transaction}
        warning={saved.warning}
        currency={currency}
        canSaveTemplate={!isEdit}
        draft={eff}
      />
    );
  }

  const errs = stepErrors(eff, step);
  const dateOptions = [
    { value: "today", label: t.date.today },
    { value: "yesterday", label: t.date.yesterday },
    { value: "custom", label: t.date.custom },
  ];
  const accountChoices = ref.accounts.map((a) => ({
    value: a.id,
    label: a.name,
    icon: <AccountTypeIcon type={a.type} width={16} height={16} />,
  }));

  return (
    <TxSheet>
      <div className="flex items-center justify-between">
        <span className="t-label text-text-tertiary">{heading}</span>
        <span className="text-[12px] font-semibold tabular text-text-tertiary">
          {interpolate(t.new.stepOf, { current: step, total: TX_STEP_COUNT })}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {step === 1 ? (
          <>
            <Field label={t.fields.date}>
              <SelectField
                ariaLabel={t.fields.date}
                value={eff.datePreset}
                placeholder={t.date.today}
                options={dateOptions}
                onSelect={(v) =>
                  patch({
                    datePreset: v as TxDraft["datePreset"],
                    customDate: v === "custom" ? eff.customDate : null,
                  })
                }
              />
              {eff.datePreset === "custom" ? (
                <input
                  type="date"
                  max={today}
                  value={eff.customDate ?? ""}
                  onChange={(e) => patch({ customDate: e.target.value || null })}
                  className="mt-2 h-[52px] w-full rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-4 text-[15px] outline-none focus:border-brand-accent"
                />
              ) : null}
            </Field>

            <Field label={t.fields.amount}>
              <AmountField
                ariaLabel={t.fields.amount}
                raw={eff.amount}
                onChange={(raw) => patch({ amount: raw })}
                currency={currency}
                direction={type === "income" ? "in" : "neutral"}
              />
            </Field>

            <div className="h-px bg-surface-divider" />

            <Field
              label={
                type === "income"
                  ? t.fields.destinationAccount
                  : t.fields.sourceAccount
              }
            >
              <ChoiceGrid
                ariaLabel={
                  type === "income"
                    ? t.fields.destinationAccount
                    : t.fields.sourceAccount
                }
                columns={2}
                options={accountChoices}
                value={
                  type === "income"
                    ? eff.destinationAccountId
                    : eff.sourceAccountId
                }
                onChange={(id) =>
                  patch(
                    type === "income"
                      ? { destinationAccountId: id }
                      : { sourceAccountId: id },
                  )
                }
              />
            </Field>
          </>
        ) : null}

        {step === 2 && type === "transfer" ? (
          <>
            <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
              <span className="grid size-10 flex-none place-items-center rounded-[12px] bg-action-primary text-action-on-primary">
                <AccountTypeIcon
                  type={sourceAccount(ref.accounts, eff.sourceAccountId)?.type ?? "cash"}
                  width={18}
                  height={18}
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="t-secondary text-text-tertiary">
                  {t.fields.sourceAccount}
                </span>
                <span className="t-body font-semibold">
                  {sourceAccount(ref.accounts, eff.sourceAccountId)?.name ?? "—"}
                </span>
              </span>
            </div>
            <Field label={t.fields.destinationAccount}>
              <SelectField
                ariaLabel={t.fields.destinationAccount}
                value={eff.destinationAccountId}
                placeholder={t.fields.selectAccount}
                invalid={errs.includes("same-account")}
                options={ref.accounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                  disabled: a.id === eff.sourceAccountId,
                  disabledLabel:
                    a.id === eff.sourceAccountId ? t.fields.sourceAccount : undefined,
                }))}
                onSelect={(id) => patch({ destinationAccountId: id })}
              />
              {errs.includes("same-account") ? (
                <span className="t-secondary text-semantic-out">
                  {t.errors.sameAccount}
                </span>
              ) : null}
            </Field>
          </>
        ) : null}

        {step === 2 && type !== "transfer" ? (
          <>
            <Field label={t.fields.category}>
              <SelectField
                ariaLabel={t.fields.category}
                value={eff.categoryId}
                placeholder={t.fields.selectCategory}
                invalid={type === "income" && errs.includes("category")}
                options={ref.categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                onSelect={(id) => patch({ categoryId: id })}
              />
            </Field>
            <div className="h-px bg-surface-divider" />
            <LinkedToField
              m={m}
              linkedToType={eff.linkedToType}
              linkedToId={eff.linkedToId}
              onChange={(lt: LinkedToType | null, id) =>
                patch({ linkedToType: lt, linkedToId: id })
              }
              people={ref.people}
              projects={ref.projects}
              createPerson={ref.createPerson}
              required={type === "income"}
              invalid={type === "income" && errs.includes("linked-to")}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label={t.fields.notes} hint={t.fields.optional}>
              <textarea
                value={eff.note}
                maxLength={500}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder={t.fields.notesPlaceholder}
                className="h-24 w-full resize-none rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card p-4 text-[15px] outline-none focus:border-brand-accent"
              />
            </Field>

            {type !== "transfer" ? (
              <>
                <div className="h-px bg-surface-divider" />
                <Field label={t.fields.recurrence}>
                  <ChoiceGrid
                    ariaLabel={t.fields.recurrence}
                    columns={3}
                    options={RECURRENCES.map((r) => ({
                      value: r,
                      label: t.recurrence[r],
                    }))}
                    value={eff.recurrence}
                    onChange={(r) =>
                      patch({ recurrence: r as TxDraft["recurrence"] })
                    }
                  />
                </Field>
                <div className="h-px bg-surface-divider" />
                <Field label={t.fields.status}>
                  <ChoiceGrid
                    ariaLabel={t.fields.status}
                    columns={3}
                    options={STATUS_BY_TYPE[type].map((s) => ({
                      value: s,
                      label:
                        t.status[s as keyof typeof t.status] ?? s,
                    }))}
                    value={eff.status}
                    onChange={(s) => patch({ status: s })}
                  />
                </Field>
              </>
            ) : (
              <div className="flex items-start gap-2.5 rounded-[var(--radius-icon)] bg-brand-accent/[0.07] p-3.5">
                <span className="mt-0.5 flex-none text-brand-accent">
                  <InfoIcon width={18} height={18} />
                </span>
                <span className="t-secondary text-brand-accent">
                  {t.transferNote}
                </span>
              </div>
            )}
          </>
        ) : null}

        {saveError ? (
          <p className="t-secondary text-semantic-out">{saveError}</p>
        ) : null}

        <StepDots count={TX_STEP_COUNT} current={step} />

        <div className="flex gap-3">
          <SheetButton
            variant="ghost"
            className="flex-1"
            onClick={goBack}
            disabled={saving}
          >
            {step === 1 ? (
              t.buttons.cancel
            ) : (
              <>
                <ChevronLeftIcon width={14} height={14} />
                {t.buttons.back}
              </>
            )}
          </SheetButton>
          <SheetButton
            variant="primary"
            className="flex-1"
            onClick={goNext}
            disabled={saving || errs.length > 0 || (step === 1 && !ref.ready)}
          >
            {step < TX_STEP_COUNT
              ? t.buttons.next
              : saving
                ? `${t.buttons.save}…`
                : t.buttons.save}
          </SheetButton>
        </div>
      </div>
    </TxSheet>
  );
}

function sourceAccount(
  accounts: { id: string; name: string; type: string }[],
  id: string | null,
) {
  return accounts.find((a) => a.id === id) ?? null;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint ? (
          <span className="text-[12px] text-text-tertiary">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
