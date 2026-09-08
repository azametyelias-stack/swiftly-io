"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { MenuDrawer } from "@/components/nav/MenuDrawer";
import {
  NAV_EDGE_BAND,
  NAV_INTENT,
  NAV_OPEN_ZONE,
  shouldBlockSystemSwipe,
} from "@/lib/nav/gesture";
import { haptic } from "@/lib/ui/haptics";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { NavShellContext, type NavShellValue } from "@/components/nav/useNavShell";

/**
 * The swipe-in menu (SCREEN-05). The menu sits underneath; the current screen is
 * a layer that slides to the right to reveal it, leaving a band on screen. Open
 * with a left-edge swipe (or the header menu button, via `useNavShell`), close
 * with a right-to-left swipe or by tapping the visible band. Honours
 * `prefers-reduced-motion` (instant, no slide).
 */

/*
 * Les trois seuils du geste vivent dans `lib/nav/gesture.ts`, avec la règle qui
 * neutralise le « retour arrière » du système — elle s'en sert des mêmes, et un
 * module pur se teste sous `node --test`.
 */
const EDGE_BAND = NAV_EDGE_BAND;
const OPEN_ZONE = NAV_OPEN_ZONE;
const INTENT = NAV_INTENT;

export function NavShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null); // px, during a drag
  const pathname = usePathname();

  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => setOpen((v) => !v), []);

  // Close on navigation, without a setState-in-effect: React's "adjust state when
  // a prop changes during render" pattern. The menu's links also call closeMenu()
  // on click; this additionally covers programmatic navigation while it is open.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const maxShift = useCallback(
    () => (typeof window === "undefined" ? 320 : window.innerWidth - EDGE_BAND),
    [],
  );

  /*
   * ---- garde contre le geste système ----
   *
   * Le balayage « retour arrière » depuis le bord (iOS ≥ 16, app installée
   * comprise ; Chrome Android) part du même endroit que l'ouverture du menu, et
   * c'est lui qui gagne : le navigateur reconnaît son geste avant que nos
   * évènements pointeur ne servent à quoi que ce soit. Le seul moyen de le lui
   * retirer est un `preventDefault()` sur `touchmove`, donc un écouteur non
   * passif — que React ne sait pas poser en JSX (`onTouchMove` est passif).
   *
   * `preventDefault()` doit tomber sur le PREMIER mouvement : après, iOS a
   * engagé sa transition et ne la rend plus. D'où la décision précoce de
   * `shouldBlockSystemSwipe`, qui rend la main au défilement dès que le vertical
   * domine de quelques pixels.
   */
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    let touch: { id: number; x: number; y: number } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      const first = e.changedTouches[0];
      if (!first || e.touches.length > 1) {
        touch = null; // pincement, zoom : ce n'est pas notre geste
        return;
      }
      touch = { id: first.identifier, x: first.clientX, y: first.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touch) return;
      const current = Array.from(e.touches).find((t) => t.identifier === touch!.id);
      if (!current) return;
      const block = shouldBlockSystemSwipe({
        startX: touch.x,
        dx: current.clientX - touch.x,
        dy: current.clientY - touch.y,
        open,
      });
      // `cancelable` retombe à false une fois que le navigateur s'est engagé —
      // appeler quand même ne ferait qu'un avertissement en console.
      if (block && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      touch = null;
    };

    surface.addEventListener("touchstart", onTouchStart, { passive: true });
    surface.addEventListener("touchmove", onTouchMove, { passive: false });
    surface.addEventListener("touchend", onTouchEnd, { passive: true });
    surface.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      surface.removeEventListener("touchstart", onTouchStart);
      surface.removeEventListener("touchmove", onTouchMove);
      surface.removeEventListener("touchend", onTouchEnd);
      surface.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open]);

  // ---- gesture ----
  const gesture = useRef<{
    id: number;
    startX: number;
    startY: number;
    active: boolean; // horizontal intent confirmed
    fromEdge: boolean;
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gesture.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      fromEdge: e.clientX <= OPEN_ZONE,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (!g.active) {
      if (Math.abs(dx) < INTENT || Math.abs(dx) <= Math.abs(dy)) {
        if (Math.abs(dy) > INTENT) gesture.current = null; // it's a scroll
        return;
      }
      // Only start opening from the left edge; closing can start anywhere.
      if (!open && !g.fromEdge) {
        gesture.current = null;
        return;
      }
      g.active = true;
      // Le geste est reconnu : un tic, pour que la main sache que le tiroir a
      // pris le doigt — y compris si on le relâche avant d'aller au bout.
      haptic();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }

    const base = open ? maxShift() : 0;
    setDragX(Math.max(0, Math.min(maxShift(), base + dx)));
  };

  const endGesture = (e: ReactPointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.active) {
      setDragX(null);
      return;
    }
    const shift = dragX ?? (open ? maxShift() : 0);
    setOpen(shift > maxShift() / 2);
    setDragX(null);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
  };

  const dragging = dragX !== null;
  const translateX = dragging
    ? `${dragX}px`
    : open
      ? `calc(100vw - ${EDGE_BAND}px)`
      : "0px";

  const value = useMemo<NavShellValue>(
    () => ({ open, openMenu, closeMenu, toggleMenu }),
    [open, openMenu, closeMenu, toggleMenu],
  );

  return (
    <NavShellContext.Provider value={value}>
      {/* `overflow-x-clip`, NOT `overflow-hidden`: we only ever need to hide the
          pushed layer sideways, and `hidden` would make this box the nearest
          scroll container for every descendant — which silently kills
          `position: sticky` inside the screens (the dashboard's pinned
          "+ Nouvelle transaction" button just scrolled away). `clip` hides the
          same overflow without creating a scroll container. */}
      <div ref={surfaceRef} className="relative min-h-dvh overflow-x-clip bg-brand-deep">
        <MenuDrawer />

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          style={{
            transform: `translate3d(${translateX}, 0, 0)`,
            transition: dragging
              ? "none"
              : "transform var(--dur-sheet, 280ms) var(--ease-emphasized, ease)",
            touchAction: "pan-y",
          }}
          className="relative z-10 min-h-dvh bg-surface-page shadow-[0_0_40px_rgba(4,6,30,0.28)] motion-reduce:transition-none"
        >
          {open && (
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={closeMenu}
              className="absolute inset-y-0 left-0 z-20 w-14 cursor-pointer bg-transparent"
            />
          )}
          {/* En tête du flux, pas en `fixed` : hors ligne le bandeau prend une
              vraie place au lieu de recouvrir le titre de l'écran. Il ne rend
              rien tant que tout est frais. */}
          <OfflineBanner />
          {children}
        </div>
      </div>
    </NavShellContext.Provider>
  );
}
