"use client";

import { useRef, useState, type ReactNode } from "react";

import { TrashIcon } from "@/components/nav/icons";

const REVEAL = 88;

/**
 * Swipe a row left to reveal a delete zone (the Lot 3 `TxListRow` mechanic,
 * reused across Templates / Budgets / Projets / Comptes). Tapping the surface
 * while it is open just closes it; `onOpen` fires only on a clean tap.
 */
export function SwipeToDelete({
  children,
  deleteLabel,
  onDelete,
  onOpen,
  disabled = false,
}: {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
  onOpen?: () => void;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const baseDx = useRef(0);
  const moved = useRef(false);

  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    baseDx.current = dx;
    moved.current = false;
    setDragging(true);
  };
  const move = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 6) moved.current = true;
    setDx(Math.max(-REVEAL, Math.min(0, baseDx.current + delta)));
  };
  const settle = () => {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    setDx((d) => (d < -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-semantic-out">
      <button
        type="button"
        aria-label={deleteLabel}
        onClick={onDelete}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 text-ink-on-surface"
      >
        <TrashIcon width={20} height={20} />
        <span className="text-[12px] font-semibold">{deleteLabel}</span>
      </button>

      <div
        className="relative bg-surface-card"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 180ms var(--ease-standard)",
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClick={(e) => {
          if (moved.current || dx !== 0) {
            e.preventDefault();
            setDx(0);
          } else if (onOpen && !e.defaultPrevented) {
            onOpen();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
