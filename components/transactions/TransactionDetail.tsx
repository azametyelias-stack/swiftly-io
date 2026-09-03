"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronLeftIcon } from "@/components/nav/icons";
import { DeleteConfirmSheet } from "@/components/transactions/DeleteConfirmSheet";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatClock, formatLongDate } from "@/lib/format/date";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { directionOf, type TxDetail } from "@/lib/transactions/model";
import { useTransaction } from "@/lib/transactions/useTransaction";
import { type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

export function TransactionDetail({ id }: { id: string }) {
  const m = useMessages();
  const t = m.transactions;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const { transaction, status, reload, remove } = useTransaction(id);

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const back = () =>
    window.history.length > 1 ? router.back() : router.push("/historiques");

  const doDelete = async () => {
    setDeleting(true);
    const ok = await remove();
    setDeleting(false);
    setConfirming(false);
    if (ok) {
      router.push("/historiques");
      router.refresh();
    } else {
      toast.show(t.errors.saveFailed);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-brand-deep">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            status === "error"
              ? "linear-gradient(180deg, rgba(52,6,16,0.55) 0%, rgba(10,8,44,0.78) 100%)"
              : "linear-gradient(180deg, rgba(6,10,60,0.5) 0%, rgba(6,10,60,0.72) 100%)",
        }}
      />

      <div className="relative flex flex-none items-center justify-between px-2 py-2 text-ink-on-surface">
        <button
          type="button"
          aria-label={m.common.back}
          onClick={back}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <span className="t-screen-title">{t.detail.title}</span>
        <span className="size-10" />
      </div>

      {status !== "error" ? (
        <div className="relative flex flex-col items-center gap-2 px-4 pb-7 pt-2 text-ink-on-surface">
          {status === "loading" || !transaction ? (
            <>
              <Skeleton className="h-3 w-20" rounded="rounded-full" />
              <Skeleton className="h-9 w-48" rounded="rounded-[12px]" />
              <Skeleton className="h-3 w-36" rounded="rounded-full" />
            </>
          ) : (
            <>
              <span className="t-label text-ink-on-surface/60">
                {kindLabel(transaction, t)}
              </span>
              <span className="text-[38px] font-bold tabular leading-none tracking-[-0.032em]">
                <HeadAmount type={transaction.type} amount={transaction.amount} />
              </span>
              <span className="text-[14px] text-ink-on-surface/70">
                {[
                  transaction.category?.name,
                  formatLongDate(transaction.occurred_on, locale),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </>
          )}
        </div>
      ) : null}

      <div className="relative flex flex-1 flex-col gap-3 rounded-t-[var(--radius-content-top)] bg-surface-page p-4">
        {status === "loading" ? (
          <Skeleton className="h-64 w-full" rounded="rounded-[20px]" />
        ) : status === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 pb-16 text-center">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
              {t.detail.loadErrorTitle}
            </h1>
            <p className="max-w-[280px] t-body text-text-secondary">
              {t.detail.loadErrorBody}
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <SheetButton variant="primary" onClick={reload}>
                {m.common.retry}
              </SheetButton>
              <button
                type="button"
                onClick={() => router.push("/historiques")}
                className="h-[52px] text-[15px] font-semibold text-text-secondary"
              >
                {t.detail.backToHistory}
              </button>
            </div>
          </div>
        ) : transaction ? (
          <>
            <dl className="flex flex-col rounded-[var(--radius-card)] bg-surface-card px-4">
              <Row label={t.detail.type}>{kindLabel(transaction, t)}</Row>
              {transaction.category ? (
                <Row label={t.detail.category}>{transaction.category.name}</Row>
              ) : null}
              {transaction.scoring_axis ? (
                <Row label={t.detail.nature}>
                  {natureLabel(transaction.scoring_axis, t)}
                </Row>
              ) : null}
              {transaction.type !== "transfer" ? (
                <Row label={t.detail.linkedTo}>
                  {transaction.linked_to?.name ?? t.detail.self}
                </Row>
              ) : null}
              {transaction.source_account ? (
                <Row label={t.detail.sourceAccount}>
                  {transaction.source_account.name}
                </Row>
              ) : null}
              {transaction.destination_account ? (
                <Row label={t.detail.destinationAccount}>
                  {transaction.destination_account.name}
                </Row>
              ) : null}
              <Row label={t.detail.dateTime}>
                {`${formatLongDate(transaction.occurred_on, locale)}, ${formatClock(
                  transaction.created_at,
                  locale,
                )}`}
              </Row>
              <Row label={t.detail.recurrence}>
                {t.recurrence[transaction.recurrence as keyof typeof t.recurrence] ??
                  transaction.recurrence}
              </Row>
              <Row label={t.detail.status} last>
                <span className="rounded-full bg-semantic-in-bg px-2.5 py-1 text-[13px] font-semibold text-semantic-in">
                  {t.status[transaction.status as keyof typeof t.status] ??
                    transaction.status}
                </span>
              </Row>
            </dl>

            {transaction.note ? (
              <div className="flex flex-col gap-1.5 rounded-[var(--radius-card)] bg-surface-card p-4">
                <span className="t-label text-text-tertiary">{t.detail.note}</span>
                <span className="t-body">{transaction.note}</span>
              </div>
            ) : null}

            <div className="flex-1" />

            <div className="flex flex-col gap-2">
              <Link href={`/transactions/${transaction.id}/modifier`} className="w-full">
                <SheetButton variant="primary">{t.detail.edit}</SheetButton>
              </Link>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="h-[52px] text-[15px] font-semibold text-semantic-out"
              >
                {t.detail.delete}
              </button>
            </div>
          </>
        ) : null}
      </div>

      {toast.node}
      {confirming && transaction ? (
        <DeleteConfirmSheet
          label={
            transaction.category?.name ??
            (transaction.type === "transfer"
              ? `${transaction.source_account?.name} → ${transaction.destination_account?.name}`
              : (transaction.source_account?.name ??
                transaction.destination_account?.name ??
                t.detail.title))
          }
          amount={formatBalance(transaction.amount, "XOF")}
          busy={deleting}
          onCancel={() => setConfirming(false)}
          onConfirm={doDelete}
        />
      ) : null}
    </div>
  );
}

function HeadAmount({
  type,
  amount,
}: {
  type: TxDetail["type"];
  amount: number;
}) {
  const dir = directionOf(type);
  if (dir === "neutral") return <>{formatBalance(amount, "XOF")}</>;
  return <>{formatMoney(amount, { currency: "XOF", sign: dir })}</>;
}

function kindLabel(
  tx: TxDetail,
  t: ReturnType<typeof useMessages>["transactions"],
) {
  return tx.type === "expense"
    ? t.detail.kindExpense
    : tx.type === "income"
      ? t.detail.kindIncome
      : t.detail.kindTransfer;
}

function natureLabel(
  axis: string,
  t: ReturnType<typeof useMessages>["transactions"],
) {
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
      className={`flex items-center justify-between gap-4 py-2.5 ${
        last ? "" : "border-b border-surface-hairline"
      }`}
    >
      <dt className="t-secondary flex-none text-text-secondary">{label}</dt>
      <dd className="t-body text-right font-semibold">{children}</dd>
    </div>
  );
}
