"use client";

import { useRef, useState } from "react";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  TransferIcon,
  TrashIcon,
} from "@/components/nav/icons";
import { formatBalance, formatMoney, type CurrencyCode } from "@/lib/format/money";
import { formatRowMoment } from "@/lib/format/date";
import { directionOf, type TxListItem } from "@/lib/transactions/model";
import { interpolate, type Locale } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";

const REVEAL = 88;

export function TxListRow({
  tx,
  today,
  locale,
  m,
  onOpen,
  onDelete,
}: {
  tx: TxListItem;
  today: string;
  locale: Locale;
  m: Messages;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const t = m.transactions;
  const dir = directionOf(tx.type);
  const currency: CurrencyCode = "XOF"; // per-account currency is a display label only (D1)

  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const baseDx = useRef(0);
  const swiping = useRef(false);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    baseDx.current = dx;
    swiping.current = false;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 6) swiping.current = true;
    setDx(Math.max(-REVEAL, Math.min(0, baseDx.current + delta)));
  };
  const settle = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    setDx((d) => (d < -REVEAL / 2 ? -REVEAL : 0));
  };

  const label =
    tx.category?.name ??
    (tx.type === "transfer"
      ? `${tx.source_account?.name ?? "—"} → ${tx.destination_account?.name ?? "—"}`
      : (tx.source_account?.name ?? tx.destination_account?.name ?? "—"));

  const secondLine =
    tx.note ??
    (tx.linked_to
      ? interpolate(m.dashboard.history.linkedTo, { name: tx.linked_to.name })
      : tx.type === "transfer" && tx.category
        ? `${tx.source_account?.name} → ${tx.destination_account?.name}`
        : null);

  const amountText =
    dir === "neutral"
      ? formatBalance(tx.amount, currency)
      : formatMoney(tx.amount, { currency, sign: dir });
  const amountColor =
    dir === "in"
      ? "text-semantic-in"
      : dir === "out"
        ? "text-semantic-out"
        : "text-text-primary";
  const badge =
    tx.type === "expense"
      ? t.detail.kindExpense
      : tx.type === "income"
        ? t.detail.kindIncome
        : t.detail.kindTransfer;

  const Icon =
    dir === "in" ? ArrowUpRightIcon : dir === "out" ? ArrowDownLeftIcon : TransferIcon;

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-block)] bg-semantic-out">
      <button
        type="button"
        aria-label={t.list.delete}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 text-ink-on-surface"
      >
        <TrashIcon width={20} height={20} />
        <span className="text-[12px] font-semibold">{t.list.delete}</span>
      </button>

      <div
        className="relative bg-surface-card"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 180ms var(--ease-standard)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
      >
        <button
          type="button"
          onClick={() => {
            if (swiping.current || dx !== 0) {
              setDx(0);
              return;
            }
            onOpen();
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
        >
          <span
            className={`grid size-11 flex-none place-items-center rounded-[var(--radius-icon)] ${
              dir === "in"
                ? "bg-semantic-in-bg text-semantic-in"
                : dir === "out"
                  ? "bg-semantic-out-bg text-semantic-out"
                  : "bg-surface-field text-text-secondary"
            }`}
          >
            <Icon width={20} height={20} />
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="t-body truncate font-semibold">{label}</span>
            <span className="t-secondary truncate text-text-tertiary">
              {formatRowMoment(tx.occurred_on, tx.created_at, today, locale, {
                today: t.groups.today,
                yesterday: t.groups.yesterday,
              })}
            </span>
            {secondLine ? (
              <span className="t-secondary truncate text-text-tertiary">
                {secondLine}
              </span>
            ) : null}
          </span>

          <span className="flex flex-none flex-col items-end">
            <span className={`t-body font-bold tabular ${amountColor}`}>
              {amountText}
            </span>
            <span className="t-label text-text-tertiary">{badge}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
