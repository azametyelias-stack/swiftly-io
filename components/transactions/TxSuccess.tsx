"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AlertTriangleIcon, CheckIcon } from "@/components/nav/icons";
import { SheetButton } from "@/components/transactions/SheetButton";
import { TxSheet } from "@/components/transactions/TxSheet";
import { useToast } from "@/components/ui/Toast";
import { apiJson } from "@/lib/http/api";
import { formatLongDate } from "@/lib/format/date";
import {
  formatBalance,
  formatMoney,
  type CurrencyCode,
} from "@/lib/format/money";
import {
  parseAmount,
  type TxDetail,
  type TxDraft,
  type TxType,
} from "@/lib/transactions/model";
import { interpolate, type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

export function TxSuccess({
  type,
  transaction,
  warning,
  currency,
  canSaveTemplate,
  draft,
}: {
  type: TxType;
  transaction: TxDetail;
  warning: { balance: number } | null;
  currency: CurrencyCode;
  canSaveTemplate: boolean;
  draft: TxDraft;
}) {
  const m = useMessages();
  const t = m.transactions;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();

  const [templating, setTemplating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTpl, setSavingTpl] = useState(false);
  const [templateDone, setTemplateDone] = useState(false);

  const heading =
    type === "expense" ? t.success.expense : type === "income" ? t.success.income : t.success.transfer;

  const finish = () => {
    router.push("/historiques");
    router.refresh();
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    const amount = parseAmount(draft.amount);
    if (name.length < 1 || amount === null || savingTpl) return;
    setSavingTpl(true);
    try {
      await apiJson("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          kind: type === "income" ? "income" : "expense",
          amount,
          category_id: draft.categoryId ?? undefined,
          linked_to_type: draft.linkedToType ?? undefined,
          linked_to_id: draft.linkedToId ?? undefined,
          account_id:
            (type === "income"
              ? draft.destinationAccountId
              : draft.sourceAccountId) ?? undefined,
          recurrence: draft.recurrence,
        }),
      });
      setTemplateDone(true);
      toast.show(t.success.templateSaved);
    } catch {
      toast.show(t.errors.saveFailed);
    } finally {
      setSavingTpl(false);
    }
  };

  return (
    <TxSheet>
      {toast.node}
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="grid size-[52px] place-items-center rounded-full bg-semantic-in text-ink-on-surface">
          <CheckIcon width={26} height={26} />
        </span>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{heading}</h1>
      </div>

      <dl className="mt-6 flex flex-col rounded-[var(--radius-card)] bg-surface-card px-4">
        <Row label={t.success.amount}>
          <span
            className={`font-bold tabular ${
              type === "income"
                ? "text-semantic-in"
                : type === "expense"
                  ? "text-semantic-out"
                  : "text-text-primary"
            }`}
          >
            {type === "transfer"
              ? formatBalance(transaction.amount, currency)
              : formatMoney(transaction.amount, {
                  currency,
                  sign: type === "income" ? "in" : "out",
                })}
          </span>
        </Row>

        {type !== "transfer" && transaction.category ? (
          <Row label={t.success.category}>{transaction.category.name}</Row>
        ) : null}

        {type === "income" && transaction.linked_to ? (
          <Row label={t.success.linkedTo}>{transaction.linked_to.name}</Row>
        ) : null}

        {type === "income" && transaction.scoring_axis ? (
          <Row label={t.success.nature}>
            <span className="rounded-full bg-brand-accent/10 px-2.5 py-1 text-[13px] font-semibold text-brand-accent">
              {natureLabel(transaction.scoring_axis, t)}
            </span>
          </Row>
        ) : null}

        {type === "transfer" ? (
          <Row label={t.success.accounts}>
            {transaction.source_account?.name} →{" "}
            {transaction.destination_account?.name}
          </Row>
        ) : null}

        <Row label={t.success.date} last>
          {formatLongDate(transaction.occurred_on, locale)}
        </Row>
      </dl>

      {warning ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-icon)] bg-semantic-out-bg p-3.5">
          <span className="mt-0.5 flex-none text-semantic-out">
            <AlertTriangleIcon width={18} height={18} />
          </span>
          <span className="t-secondary text-semantic-out">
            {interpolate(t.warning.negativeBalance, {
              balance: formatBalance(warning.balance, currency),
            })}
          </span>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col items-center gap-3">
        <SheetButton variant="primary" onClick={finish}>
          {t.buttons.finish}
        </SheetButton>

        {canSaveTemplate && !templateDone ? (
          templating ? (
            <div className="flex w-full gap-2">
              <input
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveTemplate()}
                placeholder={t.success.templateNamePlaceholder}
                className="h-11 flex-1 rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-3 text-[15px] outline-none focus:border-brand-accent"
              />
              <button
                type="button"
                onClick={saveTemplate}
                disabled={savingTpl || templateName.trim().length < 1}
                className="h-11 rounded-[var(--radius-pill)] bg-brand-accent px-4 text-[14px] font-semibold text-ink-on-surface disabled:opacity-50"
              >
                {m.common.confirm}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setTemplating(true)}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-[14px] text-text-secondary">
                {t.success.saveAsTemplate}
              </span>
              <span className="text-[16px] font-semibold text-brand-accent">
                {t.success.templateLink}
              </span>
            </button>
          )
        ) : null}
      </div>
    </TxSheet>
  );
}

function natureLabel(axis: string, t: ReturnType<typeof useMessages>["transactions"]) {
  if (axis === "investment") return t.nature.investment;
  if (axis === "consumption") return t.nature.consumption;
  if (axis === "passive") return t.nature.passive;
  return t.nature.active;
}

function Row({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3.5 ${
        last ? "" : "border-b border-surface-hairline"
      }`}
    >
      <dt className="text-[14px] text-text-secondary">{label}</dt>
      <dd className="text-[15px] font-semibold">{children}</dd>
    </div>
  );
}
