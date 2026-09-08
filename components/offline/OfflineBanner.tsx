"use client";

import { useEffect } from "react";

import { useLocale, useMessages } from "@/lib/i18n/useMessages";
import { interpolate } from "@/lib/i18n/format";
import { useOfflineState } from "@/lib/offline/status";

/**
 * Le bandeau « Hors ligne — données du … ».
 *
 * C'est la contrepartie du cache de `lib/offline/*` : à partir du moment où
 * l'app peut afficher un solde qui ne vient pas du réseau, elle doit dire à
 * quand il remonte. Sans ce bandeau, le mode hors ligne serait un mensonge sur
 * l'argent de quelqu'un ; avec lui, c'est un relevé daté.
 *
 * Placement — rendu par `NavShell`, en tête du calque qui porte l'écran :
 *  - `sticky top-0` : il occupe une vraie place dans le flux (donc il ne
 *    recouvre rien) et reste visible au défilement ;
 *  - il peint lui-même `--sf-safe-top` (la hauteur de la barre d'état, nommée
 *    dans globals.css), puisqu'il devient le haut de
 *    l'écran, statut iOS translucide compris ;
 *  - il publie sa hauteur dans `--sf-offline-bar`, que `AppHeader` lit pour se
 *    coller juste en dessous au lieu de passer derrière.
 *
 * z-40 : au-dessus de l'en-tête (z-30), en dessous des feuilles modales
 * (z-50/55/60) — hors ligne, une modale ouverte a son propre message d'échec.
 */

/** Hauteur de la ligne de texte, hors encoche. Doit rester en phase avec le CSS. */
const BAR_ROW_PX = 30;
const BAR_HEIGHT = `calc(var(--sf-safe-top) + ${BAR_ROW_PX}px)`;

export function OfflineBanner() {
  const { online, staleAt } = useOfflineState();
  const m = useMessages();
  const locale = useLocale();
  const visible = !online || staleAt !== null;

  // `AppHeader` colle à `top: var(--sf-offline-bar)`. La variable n'existe que
  // tant que le bandeau est là — la nettoyer au démontage évite un en-tête
  // décalé de 30 px une fois le réseau revenu.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    root.style.setProperty("--sf-offline-bar", BAR_HEIGHT);
    return () => {
      root.style.removeProperty("--sf-offline-bar");
    };
  }, [visible]);

  if (!visible) return null;

  // Trois cas, et le troisieme est le plus facile a bacler : le reseau est
  // revenu mais l'ecran affiche encore une valeur du cache, parce que la route
  // qui la porte n'a pas encore repondu. Dire « Hors ligne » serait faux ; ne
  // rien dire le serait davantage.
  const label =
    staleAt === null
      ? m.offline.banner
      : interpolate(online ? m.offline.staleDated : m.offline.bannerDated, {
          date: formatMoment(staleAt, locale),
        });

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 bg-brand-deep text-ink-on-surface"
      style={{ paddingTop: "var(--sf-safe-top)" }}
    >
      <p
        className="flex items-center justify-center gap-2 px-4 text-[12px] font-semibold tracking-[0.01em]"
        style={{ height: `${BAR_ROW_PX}px` }}
      >
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-semantic-warn"
        />
        <span className="truncate">{label}</span>
      </p>
    </div>
  );
}

/** « 7 sept., 08:24 » — jour et heure, parce que « il y a 3 h » se périme tout seul. */
function formatMoment(at: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(at));
  } catch {
    return new Date(at).toISOString().slice(0, 16).replace("T", " ");
  }
}
