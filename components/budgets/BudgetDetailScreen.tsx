"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BudgetFormSheet } from "@/components/budgets/BudgetFormSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NightScreen } from "@/components/ui/NightScreen";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatLongDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { budgetStatus } from "@/lib/budgets/model";
import {
  deleteBudgetRequest,
  fetchBudget,
  updateBudgetRequest,
  type BudgetDetail,
} from "@/lib/budgets/useBudgets";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";
import type { Locale } from "@/lib/i18n";

export function BudgetDetailScreen({ id }: { id: string }) {
  const m = useMessages();
  const t = m.budgets;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();

  const [data, setData] = useState<BudgetDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchBudget(id)
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(load, [load]);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteBudgetRequest(id);
      toast.show(t.deletedToast);
      router.push("/budgets");
    } catch {
      toast.show(m.common.genericError);
      setBusy(false);
      setConfirming(false);
    }
  };

  const s = data ? budgetStatus(data.budget.spent, data.budget.allocated_amount) : null;

  return (
    <NightScreen title={t.detailTitle}>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 pb-16">
        {status === "loading" ? (
          <Skeleton className="h-40 w-full" rounded="rounded-[20px]" />
        ) : status === "error" || !data || !s ? (
          <div className="py-16 text-center">
            <p className="t-body text-text-secondary">{t.loadErrorBody}</p>
            <button
              onClick={() => {
                setStatus("loading");
                load();
              }}
              className="mt-3 text-[13px] font-semibold text-brand-accent"
            >
              {m.common.retry}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
              <div className="flex items-center gap-3">
                <span
                  className="size-10 flex-none rounded-[var(--radius-icon)]"
                  style={{ background: data.budget.category.color }}
                />
                <span className="t-section-title">{data.budget.category.name}</span>
              </div>
              <p className="t-balance tabular">
                {formatMoney(data.budget.spent, { sign: "none" })}
                <span className="t-secondary text-text-tertiary">
                  {" "}
                  / {formatMoney(data.budget.allocated_amount, { sign: "none" })}
                </span>
              </p>
              <ProgressBar ratio={s.ratio} tone={s.tone} height={10} />
              <span
                className={`t-secondary ${s.tone === "red" ? "text-semantic-out" : "text-text-tertiary"}`}
              >
                {s.percent} % · {s.over ? t.over : t.remaining.replace(
                  "{amount}",
                  formatMoney(Math.max(0, data.budget.allocated_amount - data.budget.spent), {
                    sign: "none",
                  }),
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SheetButton variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
                {m.common.edit}
              </SheetButton>
              <SheetButton variant="danger" onClick={() => setConfirming(true)} disabled={busy}>
                {m.common.delete}
              </SheetButton>
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="t-section-title">{t.thisMonthTitle}</h2>
              {data.transactions.length === 0 ? (
                <p className="t-secondary text-text-tertiary">{t.noTransactions}</p>
              ) : (
                <ul className="flex flex-col rounded-[var(--radius-card)] bg-surface-card">
                  {data.transactions.map((tx, i) => (
                    <li key={tx.id}>
                      <button
                        onClick={() => router.push(`/historiques/${tx.id}`)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                          i < data.transactions.length - 1
                            ? "border-b border-surface-hairline"
                            : ""
                        }`}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="t-body truncate">
                            {tx.note ?? t.expenseFallback}
                          </span>
                          <span className="t-secondary text-text-tertiary">
                            {formatLongDate(tx.occurred_on, locale)}
                          </span>
                        </span>
                        <span className="t-body flex-none font-bold tabular">
                          {formatMoney(tx.amount, { sign: "none" })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {toast.node}

      {editing && data ? (
        <BudgetFormSheet
          budget={data.budget}
          // Was `[]`, so the sheet happily offered a category another budget
          // already owned; the unique constraint then rejected the save.
          usedCategoryIds={data.usedCategoryIds}
          onClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            const updated = await updateBudgetRequest(id, payload);
            setData(updated);
            toast.show(m.common.savedToast);
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={t.deleteBody}
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      ) : null}
    </NightScreen>
  );
}
