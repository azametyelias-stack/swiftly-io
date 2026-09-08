"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { TrashIcon } from "@/components/nav/icons";
import { haptic } from "@/lib/ui/haptics";

const REVEAL = 88;

/**
 * Durée d'un appui long. 450 ms : au-dessus du seuil où un tap devient hésitant,
 * en dessous des 500 ms où iOS déclenche sa propre sélection de texte.
 */
const LONG_PRESS_MS = 450;

/** Déplacement au-delà duquel ce n'est plus un appui mais un glissement. */
const LONG_PRESS_SLOP = 6;

/**
 * Swipe a row left to reveal a delete zone (the Lot 3 `TxListRow` mechanic,
 * reused across Templates / Budgets / Projets / Comptes). Tapping the surface
 * while it is open just closes it; `onOpen` fires only on a clean tap.
 *
 * `onLongPress` ajoute le menu contextuel de SCREEN-14 § 6. Il n'est armé que
 * si l'appelant le fournit : les écrans qui n'en ont pas gardent exactement le
 * comportement d'avant, sélection de texte comprise.
 */
export function SwipeToDelete({
  children,
  deleteLabel,
  onDelete,
  onOpen,
  onLongPress,
  disabled = false,
}: {
  children: ReactNode;
  deleteLabel: string;
  onDelete: () => void;
  onOpen?: () => void;
  /** Appui long — ouvre le menu d'actions de la ligne. */
  onLongPress?: () => void;
  disabled?: boolean;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef(0);
  const baseDx = useRef(0);
  const moved = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelLongPress = () => {
    if (longPressTimer.current === null) return;
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  // Un appui long en cours ne doit pas survivre au démontage de la ligne (une
  // suppression, un changement de filtre) : le menu s'ouvrirait sur du vide.
  useEffect(() => cancelLongPress, []);

  const down = (e: React.PointerEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    baseDx.current = dx;
    moved.current = false;
    setDragging(true);

    if (!onLongPress) return;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      // `moved` neutralise le clic qui suivra la levée du doigt : sans ça, un
      // appui long ouvrirait le menu ET lancerait la transaction derrière.
      moved.current = true;
      haptic();
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const move = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    // Le doigt bouge — dans un sens ou dans l'autre — ce n'est plus un appui.
    if (
      Math.abs(delta) > LONG_PRESS_SLOP ||
      Math.abs(e.clientY - startY.current) > LONG_PRESS_SLOP
    ) {
      cancelLongPress();
    }
    if (Math.abs(delta) > 6) moved.current = true;
    setDx(Math.max(-REVEAL, Math.min(0, baseDx.current + delta)));
  };
  const settle = () => {
    cancelLongPress();
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
        /*
         * `select-none` + `-webkit-touch-callout` seulement quand l'appui long
         * est armé : sinon iOS répond au maintien du doigt par sa propre
         * sélection de texte — les deux poignées bleues sur la capture d'Elias
         * du 2026-09-08 — et notre menu ne voit jamais le geste.
         */
        className={`relative bg-surface-card ${
          onLongPress ? "select-none [-webkit-touch-callout:none]" : ""
        }`}
        onContextMenu={onLongPress ? (e) => e.preventDefault() : undefined}
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
