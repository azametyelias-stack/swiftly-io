"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

import { isRootPath } from "@/lib/nav/items";
import { useNavShell } from "@/components/nav/useNavShell";
import { BellIcon, ChevronLeftIcon, MenuIcon } from "@/components/nav/icons";

/**
 * The nav bar (DESIGN-HANDOFF § "Barre de navigation"). Height 56, centred
 * title, a 40 px circular button left, the bell right with an alert pastille.
 * Left button = menu at root level (opens the drawer), back chevron on a
 * sub-screen. Each screen renders its own — the title and badge vary.
 */
export function AppHeader({
  title,
  unreadCount = 0,
  tone = "default",
}: {
  title: string;
  /** Unread alerts — a dot shows on the bell when > 0. */
  unreadCount?: number;
  /** `onDark` = sitting over the night gradient (e.g. the dashboard header). */
  tone?: "default" | "onDark";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { openMenu } = useNavShell();
  const atRoot = isRootPath(pathname);

  const text = tone === "onDark" ? "text-ink-on-surface" : "text-text-primary";
  /*
   * 44 px, glyphe de 26. Le handoff décrivait des boutons de 40 « à zone d'appui
   * étendue » : la cible était bonne, le dessin restait petit — et un pseudo-
   * élément n'agrandit pas ce qu'on voit. Retour terrain du 2026-09-08 : on ne
   * les distingue pas assez. Le bouton porte donc ses 44 pour de vrai, ce qui
   * rend l'`after` inutile (à 44 + inset-1 il mordrait sur le titre).
   */
  const btn =
    "relative grid size-11 place-items-center rounded-[var(--radius-pill)] " +
    "transition-transform active:scale-[0.975] motion-reduce:active:scale-100";

  return (
    <header
      className={`sticky z-30 ${tone === "onDark" ? "" : "bg-surface-page"} ${text}`}
      // `--sf-offline-bar` n'est posée que pendant que le bandeau hors ligne est
      // affiché (components/offline/OfflineBanner). Sans elle : top: 0, soit le
      // comportement d'origine.
      style={{ top: "var(--sf-offline-bar, 0px)" }}
    >
      {/*
        The status bar is translucent (`black-translucent`), which forces the
        clock and battery to WHITE and lets the page run under them. Every other
        screen is on the night gradient there, so white reads fine. This header
        is the one light top in the app — Paramètres — so it paints the safe area
        `--brand-deep` rather than letting `bg-surface-page` reach up: white on
        #EBEBEF would be invisible. On `onDark` the band stays transparent and
        the gradient flows through, seamlessly.
      */}
      <div
        aria-hidden="true"
        className={`h-[env(safe-area-inset-top)] ${tone === "onDark" ? "" : "bg-brand-deep"}`}
      />

      <div className="flex h-14 items-center gap-1 px-2">
        {atRoot ? (
          <button type="button" onClick={openMenu} aria-label="Ouvrir le menu" className={btn}>
            <MenuIcon width={26} height={26} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/dashboard")
            }
            aria-label="Retour"
            className={btn}
          >
            <ChevronLeftIcon width={26} height={26} />
          </button>
        )}

        <h1 className="t-screen-title flex-1 truncate text-center">{title}</h1>

        <Link href="/alertes" aria-label="Alertes et notifications" className={btn}>
          <BellIcon width={26} height={26} />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-2 top-2 size-2 rounded-full bg-semantic-out ring-2 ring-[var(--surface-page)]"
            />
          )}
        </Link>
      </div>
    </header>
  );
}
