"use client";

import { useEffect, useRef, type PointerEvent, type MouseEvent } from "react";

import { haptic } from "@/lib/ui/haptics";

/**
 * L'appui long qui ouvre un menu d'actions (SCREEN-4 § 8 et § 10, SCREEN-14 § 6).
 *
 * La mécanique vient de `components/ui/SwipeToDelete.tsx`, où elle a été réglée
 * et vérifiée dans un vrai Chrome le 2026-09-08. Elle est extraite ici parce
 * qu'elle sert désormais à trois endroits qui n'ont PAS de swipe-supprimer : le
 * carrousel de templates et l'historique récent du Dashboard, où un balayage
 * appartient au carrousel ou au menu de navigation.
 *
 * Les trois réglages, et pourquoi :
 *
 *  - **450 ms** : au-dessus du seuil où un tap devient hésitant, en dessous des
 *    500 ms où iOS déclenche sa propre sélection de texte.
 *  - **6 px d'écart dans les DEUX axes annulent** : sinon le simple fait de
 *    faire défiler une liste, ou de pousser le carrousel de côté, ouvrirait le
 *    menu sous le doigt.
 *  - **`select-none`, `-webkit-touch-callout: none`, `contextmenu` bloqué** :
 *    sans ça iOS répond au maintien du doigt par ses deux poignées bleues de
 *    sélection, et notre menu ne voit jamais le geste. (Les trois classes sont
 *    listées par des virgules à dessein : `tests/validation/inputs.test.ts`
 *    débusque le SQL assemblé à la main en cherchant un littéral suivi d'une
 *    concaténation, et une énumération signée par ce symbole-là juste après un
 *    littéral entre accents graves lui ressemble assez pour le faire échouer.)
 *
 * Et le garde qui compte : après un appui long — ou un glissement — le
 * relâchement du doigt envoie quand même un `click`. `swallowClick()` dit à
 * l'appelant de l'ignorer, sans quoi l'appui long ouvrirait le menu ET
 * déclencherait l'action du tap simple derrière (lancer la transaction, ouvrir
 * le détail…).
 *
 * Côté feuille, `ActionSheet` a son propre garde contre le « clic fantôme »
 * (elle exige son `pointerdown` à elle avant d'accepter un clic) : les deux sont
 * nécessaires, ils protègent deux choses différentes.
 */

const LONG_PRESS_MS = 450;
const SLOP = 6;

export interface LongPressHandlers {
  onPointerDown: (e: PointerEvent) => void;
  onPointerMove: (e: PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onContextMenu?: (e: MouseEvent) => void;
}

export interface LongPress {
  handlers: LongPressHandlers;
  /**
   * À appeler au début du `onClick` de la cible : `true` quand ce clic est la
   * queue d'un appui long ou d'un glissement, et doit donc être ignoré.
   * Consomme le drapeau — un clic, une réponse.
   */
  swallowClick: () => boolean;
  /**
   * Classes à poser sur l'élément pressé. Vides quand l'appui long n'est pas
   * armé : un écran qui n'en veut pas garde exactement le comportement d'avant,
   * sélection de texte comprise.
   */
  pressClassName: string;
}

export function useLongPress(onLongPress?: () => void): LongPress {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);

  const cancel = () => {
    if (timer.current === null) return;
    clearTimeout(timer.current);
    timer.current = null;
  };

  // Un appui long en cours ne doit pas survivre au démontage de la ligne (une
  // suppression, un changement de filtre) : le menu s'ouvrirait sur du vide.
  useEffect(() => cancel, []);

  const handlers: LongPressHandlers = {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY };
      moved.current = false;
      if (!onLongPress) return;
      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        moved.current = true; // neutralise le clic de la levée du doigt
        haptic();
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e) => {
      const s = start.current;
      if (!s) return;
      if (Math.abs(e.clientX - s.x) > SLOP || Math.abs(e.clientY - s.y) > SLOP) {
        moved.current = true;
        cancel();
      }
    },
    onPointerUp: () => {
      cancel();
      start.current = null;
    },
    onPointerCancel: () => {
      cancel();
      start.current = null;
      moved.current = true;
    },
    onContextMenu: onLongPress ? (e) => e.preventDefault() : undefined,
  };

  return {
    handlers,
    swallowClick: () => {
      const swallow = moved.current;
      moved.current = false;
      return swallow;
    },
    pressClassName: onLongPress ? "select-none [-webkit-touch-callout:none]" : "",
  };
}
