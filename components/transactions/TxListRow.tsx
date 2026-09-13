"use client";

import { useRef, useState } from "react";

import { TrashIcon } from "@/components/nav/icons";
import { TxRowContent } from "@/components/transactions/TxRowContent";
import { type TxListItem } from "@/lib/transactions/model";
import type { Locale } from "@/lib/i18n";
import type { Messages } from "@/lib/i18n";

const REVEAL = 88;

/**
 * Une ligne de l'écran Historiques : le contenu commun (`TxRowContent`) dans son
 * swipe-supprimer (SCREEN-6 § 7). Le Dashboard réutilise le même contenu, mais
 * pas le balayage — là-bas l'horizontale appartient au menu de navigation.
 */
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

  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const swiping = useRef(false);
  const baseDx = useRef(0);
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
          <TxRowContent tx={tx} today={today} locale={locale} m={m} />
        </button>
      </div>
    </div>
  );
}
