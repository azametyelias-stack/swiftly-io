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
  const btn =
    "relative grid size-10 place-items-center rounded-[var(--radius-pill)] " +
    "transition-transform active:scale-[0.975] motion-reduce:active:scale-100 " +
    "after:absolute after:-inset-1 after:content-['']"; // extends the tap target to 44

  return (
    <header
      className={`sticky top-0 z-30 ${tone === "onDark" ? "" : "bg-surface-page"} ${text}`}
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
            <MenuIcon />
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
            <ChevronLeftIcon />
          </button>
        )}

        <h1 className="t-screen-title flex-1 truncate text-center">{title}</h1>

        <Link href="/alertes" aria-label="Alertes et notifications" className={btn}>
          <BellIcon />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-semantic-out ring-2 ring-[var(--surface-page)]"
            />
          )}
        </Link>
      </div>
    </header>
  );
}
