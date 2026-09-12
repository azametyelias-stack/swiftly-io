"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { MenuDrawer } from "@/components/nav/MenuDrawer";
import {
  NAV_BOUNCE_AT,
  NAV_BOUNCE_HAPTIC_MS,
  NAV_EDGE_BAND,
  NAV_INTENT,
  NAV_OPEN_ZONE,
  NAV_SETTLE_AT,
  navCardShape,
  navProgress,
  navStackShape,
  shouldBlockSystemSwipe,
} from "@/lib/nav/gesture";
import { haptic, primeHaptics } from "@/lib/ui/haptics";
import { OfflineBanner } from "@/components/offline/OfflineBanner";
import { NavShellContext, type NavShellValue } from "@/components/nav/useNavShell";

/**
 * The swipe-in menu (SCREEN-05). The menu sits underneath; the current screen is
 * a layer that slides to the right to reveal it, leaving a band on screen. Open
 * with a left-edge swipe (or the header menu button, via `useNavShell`), close
 * with a right-to-left swipe or by tapping the visible band. Honours
 * `prefers-reduced-motion` (instant, no slide).
 *
 * Depuis le 2026-09-11 le calque écran ne fait plus que glisser : il RÉTRÉCIT et
 * s'arrondit en même temps, jusqu'à devenir une carte posée sur le menu — qui
 * est lui-même la photo de nuit du reste de l'app. Trois choses s'ajoutent au
 * geste, dans cet ordre :
 *
 *  1. la carte arrive en butée avec `--ease-bounce`, qui dépasse sa cible d'un
 *     cheveu avant d'y retomber : le petit choc du bout de course ;
 *  2. un tic haptique tombe AU contact (`NAV_BOUNCE_AT`), pas à la fin de
 *     l'animation — le doigt doit sentir l'impact, pas le repos ;
 *  3. le rebond retombé (`NAV_SETTLE_AT`), le second calque — le « paquet de
 *     cartes » — se détache de derrière la carte.
 *
 * D'où l'unique état ajouté, `stage` : le geste seul ne suffit plus à décrire
 * l'écran, il y a désormais un après-geste.
 */

/*
 * Les trois seuils du geste vivent dans `lib/nav/gesture.ts`, avec la règle qui
 * neutralise le « retour arrière » du système — elle s'en sert des mêmes, et un
 * module pur se teste sous `node --test`.
 */
const EDGE_BAND = NAV_EDGE_BAND;
const OPEN_ZONE = NAV_OPEN_ZONE;
const INTENT = NAV_INTENT;

/**
 * Où en est le calque écran, au-delà de « ouvert / fermé ».
 *
 *  - `idle`    : posé à plat, plein cadre. Ni coins arrondis ni rognage — c'est
 *                l'état de tous les jours, celui qu'on ne doit surtout pas
 *                altérer (un `overflow` posé en permanence couperait les menus
 *                déroulants qui débordent légitimement de leur écran).
 *  - `moving`  : tiré au doigt, ou en train de rejoindre sa place dans un sens
 *                ou dans l'autre. Le paquet de cartes reste rangé dessous.
 *  - `settled` : ouvert, rebond retombé. Le paquet sort.
 */
type Stage = "idle" | "moving" | "settled";

/*
 * Le gel doit tomber AVANT la peinture — c'est tout son intérêt : rendre la
 * carte à sa place sans qu'une seule image ne montre la page revenue en haut.
 * `useLayoutEffect` ne tourne pas au rendu serveur et React le dit en console ;
 * l'alias évite l'avertissement sans rien changer dans le navigateur.
 */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function NavShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null); // px, during a drag
  const [stage, setStage] = useState<Stage>("idle");
  const pathname = usePathname();

  /*
   * ---- le gel de la carte ----
   *
   * Une carte, c'est quatre coins visibles. Le calque écran fait la hauteur de
   * son CONTENU : sur le dashboard ou les statistiques, deux ou trois mille
   * pixels. Réduit de 16 % autour de son propre centre, il dépasse encore très
   * largement en haut comme en bas — on ne voyait donc qu'une page décalée,
   * jamais une carte (retour d'Elias, 2026-09-12), alors que les écrans courts
   * en formaient une parfaitement.
   *
   * Pendant que le menu se montre, le calque est donc ramené à la hauteur de
   * l'écran et devient son propre conteneur de défilement, calé à l'endroit
   * exact où la page en était (`scrollTop`). Ce qui dépasse est tronqué —
   * c'est le choix d'Elias, et c'est de toute façon ce que fait une carte.
   *
   * Le prix à payer est le défilement de la PAGE, qui retombe à zéro quand le
   * document se raccourcit. D'où les deux repères ci-dessous : la position
   * d'avant le gel, et la route sur laquelle elle a été prise — on ne rend pas
   * un défilement à un écran qui a changé entre-temps.
   */
  const cardRef = useRef<HTMLDivElement>(null);
  const restY = useRef(0);
  const frozen = useRef<{ y: number; path: string } | null>(null);

  /*
   * À n'appeler que depuis un gestionnaire d'évènement : une fois le rendu du
   * gel passé, le document s'est déjà raccourci et `scrollY` ne vaut plus rien.
   */
  const rememberScroll = useCallback(() => {
    if (!frozen.current) restY.current = window.scrollY;
  }, []);

  const openMenu = useCallback(() => {
    rememberScroll();
    setOpen(true);
  }, [rememberScroll]);
  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => {
    rememberScroll();
    setOpen((v) => !v);
  }, [rememberScroll]);

  // Close on navigation, without a setState-in-effect: React's "adjust state when
  // a prop changes during render" pattern. The menu's links also call closeMenu()
  // on click; this additionally covers programmatic navigation while it is open.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  // Le contrôle qui joue les tics sur iOS est monté ici, au repos : le créer
  // pendant le geste revenait à perdre le premier retour (voir lib/ui/haptics).
  useEffect(() => {
    primeHaptics();
  }, []);

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
    // Le doigt vient de se poser : c'est le dernier instant où l'on peut lire
    // le défilement de la page avant que le geste ne la gèle.
    rememberScroll();
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

  /*
   * ---- l'après-geste : rebond, tic, paquet de cartes ----
   *
   * Rien ici n'est observable autrement qu'au chronomètre. `transitionend` ne
   * tombe qu'à la FIN de la course — trop tard pour un tic censé coïncider avec
   * le contact — et ne tombe pas du tout si le doigt reprend la main en cours de
   * route, ce qui laisserait le paquet de cartes dehors pour toujours. Deux
   * minuteries, donc, annulées ensemble : reprendre le geste rembobine
   * l'après-geste.
   *
   * Le montage est sauté : au premier rendu le menu est fermé et immobile, et
   * traverser `moving` arrondirait les coins de l'écran d'accueil pendant un
   * tiers de seconde, sans que rien n'ait bougé.
   */
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
    setStage("moving");
    if (dragging) return; // le doigt conduit : il n'y a pas d'arrivée à programmer

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!open) {
      // La carte rentre. On garde le cadre — rognage et coins — jusqu'à ce
      // qu'elle soit vraiment à plat, sinon les angles sautent en fin de course.
      const home = setTimeout(() => setStage("idle"), reduced ? 0 : NAV_SETTLE_AT);
      return () => clearTimeout(home);
    }

    const impact = setTimeout(
      () => haptic(NAV_BOUNCE_HAPTIC_MS),
      reduced ? 0 : NAV_BOUNCE_AT,
    );
    const settle = setTimeout(() => setStage("settled"), reduced ? 0 : NAV_SETTLE_AT);
    return () => {
      clearTimeout(impact);
      clearTimeout(settle);
    };
  }, [open, dragging]);

  /** Le menu se montre : la carte est gelée au format de l'écran. */
  const showing = stage !== "idle";

  /*
   * Geler, dégeler. Les deux mouvements sont l'exact inverse l'un de l'autre et
   * doivent tomber avant la peinture, sinon on voit la page sauter en haut.
   *
   * `behavior: "instant"` n'est pas un détail : `<html>` porte `scroll-smooth`,
   * et sans lui la remise en place s'ANIMERAIT — la page se remettrait à
   * défiler toute seule sous les yeux, une demi-seconde après la fermeture.
   */
  useBeforePaint(() => {
    const card = cardRef.current;
    if (!card) return;

    if (showing) {
      const before = frozen.current;
      // Une navigation sous la carte gelée (on tape une entrée du menu) : le
      // nouvel écran se lit depuis son début, pas au défilement de l'ancien.
      const y = before ? (before.path === pathname ? before.y : 0) : restY.current;
      frozen.current = { y, path: pathname };
      card.scrollTop = y;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      return;
    }

    const was = frozen.current;
    frozen.current = null;
    card.scrollTop = 0;
    if (was && was.path === pathname && was.y > 0) {
      window.scrollTo({ top: was.y, left: 0, behavior: "instant" });
    }
  }, [showing, pathname]);

  /*
   * La translation reste une expression CSS (`calc(100vw − bande)`) au repos :
   * une valeur en pixels figée au rendu ne survivrait pas à une rotation
   * d'écran, menu ouvert. L'échelle et le rayon, eux, se déduisent de
   * l'avancement — qui vaut exactement 1 dans cet état, sans lire aucune largeur.
   */
  const progress = dragging
    ? navProgress(dragX, typeof window === "undefined" ? 0 : window.innerWidth)
    : open
      ? 1
      : 0;
  const card = navCardShape(progress);
  const stack = navStackShape(progress, stage === "settled");

  const shiftedBy = (peek: number) =>
    dragging
      ? `${dragX - peek}px`
      : open
        ? `calc(100vw - ${EDGE_BAND + peek}px)`
        : `${-peek}px`;

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

        {/*
          Le paquet de cartes : un second calque qui ne sert qu'à suggérer une
          pile. Tant qu'il n'est pas sorti il porte EXACTEMENT la transformation
          de la carte, opacité nulle — donc rien à masquer pendant le glissement,
          et pas un cheveu qui dépasse au mauvais moment. Il ne prend jamais le
          doigt.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-full bg-surface-page"
          style={{
            transform: `translate3d(${shiftedBy(stack.peek)}, 0, 0) scale(${stack.scale})`,
            transformOrigin: "0 50%",
            borderRadius: `${stack.radius}px`,
            opacity: stack.opacity,
            transition: dragging
              ? "none"
              : "transform var(--dur-sheet, 280ms) var(--ease-emphasized, ease), opacity var(--dur-toggle, 180ms) var(--ease-out, ease-out)",
          }}
        />

        <div
          ref={cardRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
          style={{
            transform: `translate3d(${shiftedBy(0)}, 0, 0) scale(${card.scale})`,
            // Origine au bord GAUCHE : la carte rétrécit sans que ce bord ne
            // bouge, donc la bande visible vaut toujours `100vw − EDGE_BAND` et
            // le calcul de course du geste reste valable tel quel. Le 50 %
            // vertical, lui, donne les marges haute et basse.
            transformOrigin: "0 50%",
            borderRadius: `${card.radius}px`,
            // Les deux lignes qui font une CARTE et non une page décalée : la
            // hauteur de l'écran, et le rognage de tout ce qui dépasse.
            //
            // `hidden` et non `clip`, à l'inverse de la coquille ci-dessus, et
            // c'est voulu : `hidden` fait de la carte un conteneur de
            // défilement, donc une boîte dont on peut poser le `scrollTop` —
            // c'est ce qui la cale sur ce qu'on regardait au lieu de la
            // ramener en haut de page. Les `sticky` des écrans n'y perdent
            // rien, au contraire : ils s'accrochent alors au haut de la carte,
            // c'est-à-dire exactement là où on les voyait.
            //
            // Rien de tout cela au repos : une carte figée à la hauteur de
            // l'écran ne défilerait plus, et un `overflow` permanent couperait
            // ce qui déborde légitimement d'un écran (les menus déroulants
            // ouverts par-dessus le contenu, règle du 2026-09-04).
            height: showing ? "100dvh" : undefined,
            overflow: showing ? "hidden" : undefined,
            transition: dragging
              ? "none"
              : [
                  `transform var(--dur-sheet, 280ms) ${
                    open ? "var(--ease-bounce, ease)" : "var(--ease-emphasized, ease)"
                  }`,
                  "border-radius var(--dur-sheet, 280ms) var(--ease-emphasized, ease)",
                ].join(", "),
            touchAction: "pan-y",
          }}
          className="relative z-10 min-h-dvh bg-surface-page shadow-[0_0_40px_rgba(4,6,30,0.28)] motion-reduce:transition-none"
        >
          {open && (
            // Toute la carte referme, plus seulement le liseré : c'est le geste
            // naturel une fois qu'on reconnaît la page qu'on a quittée, et ça
            // évite d'appuyer par mégarde sur un bouton de l'écran d'en dessous.
            //
            // `fixed` et non `absolute` : la carte est alors un conteneur de
            // défilement calé plus bas dans son contenu, et un `absolute
            // inset-0` se poserait sur le HAUT de ce contenu — donc hors de
            // l'écran. La carte étant transformée, elle est le cadre de
            // référence de ce `fixed`, et elle fait exactement la taille de
            // l'écran pendant tout le temps où ce bouton existe : les deux
            // coïncident au pixel.
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={closeMenu}
              className="fixed inset-0 z-20 cursor-pointer bg-transparent"
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
