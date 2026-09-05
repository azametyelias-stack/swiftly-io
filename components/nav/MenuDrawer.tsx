"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, activeNavItem } from "@/lib/nav/items";
import { MarqueeText } from "@/components/nav/MarqueeText";
import { NavGlyph, UserIcon } from "@/components/nav/icons";
import { useNavShell } from "@/components/nav/useNavShell";
import { useUnreadAlerts } from "@/components/nav/useUnreadAlerts";

/**
 * The menu that lives under the current screen (SCREEN-05, design
 * `05-menu-navigation.png`). Light surface, dark text/icons: title "Menu", a
 * profile shortcut, the ~10 sections as pills — the active one is a filled white
 * pill with a shadow, the others are outlined — and a theme switch at the foot.
 */
export function MenuDrawer() {
  const pathname = usePathname();
  const { open, closeMenu } = useNavShell();
  const active = activeNavItem(pathname);
  const unread = useUnreadAlerts(pathname);

  return (
    <nav
      aria-label="Navigation principale"
      aria-hidden={!open}
      className="absolute inset-y-0 left-0 z-0 flex w-full flex-col bg-surface-page text-text-primary"
      style={{ paddingRight: "calc(52px + var(--margin-screen, 16px))" }}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="t-screen-title">Menu</span>
        <Link
          href="/parametres"
          onClick={closeMenu}
          aria-label="Profil et paramètres"
          className="grid size-11 place-items-center rounded-[var(--radius-pill)] bg-surface-card text-text-primary shadow-[0_2px_8px_rgba(10,10,12,0.1)]"
        >
          <UserIcon />
        </Link>
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive = active?.id === item.id;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-[var(--gap-icon-text,16px)] rounded-[var(--radius-pill)] px-4",
                  "min-h-[var(--size-list-button,52px)] transition-colors",
                  isActive
                    ? "bg-surface-card text-text-primary shadow-[0_2px_8px_rgba(10,10,12,0.1)]"
                    : "border border-surface-divider text-text-secondary",
                ].join(" ")}
              >
                <NavGlyph
                  id={item.id}
                  className={`shrink-0 ${isActive ? "text-text-primary" : "text-text-secondary"}`}
                />
                <MarqueeText
                  text={item.label}
                  className="min-w-0 flex-1 t-body font-semibold"
                />
                {item.id === "alerts" && unread > 0 ? (
                  <span
                    className="grid min-w-5 flex-none place-items-center rounded-full bg-semantic-out px-1.5 text-[11px] font-bold text-white tabular"
                    aria-label={`${unread} non lues`}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Le pied portait la bascule de theme, retiree avec le mode sombre
          (2026-09-06). La marge basse reste : elle degage l'indicateur
          d'accueil iOS sous la derniere entree du menu. */}
      <div aria-hidden className="pb-[calc(env(safe-area-inset-bottom)+16px)]" />
    </nav>
  );
}
