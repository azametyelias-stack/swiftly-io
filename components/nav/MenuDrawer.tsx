"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, activeNavItem } from "@/lib/nav/items";
import { MarqueeText } from "@/components/nav/MarqueeText";
import { ThemeToggle } from "@/components/nav/ThemeToggle";
import { NavGlyph, UserIcon } from "@/components/nav/icons";
import { useNavShell } from "@/components/nav/useNavShell";

/**
 * The menu that lives under the current screen (SCREEN-05). Title "Menu", a
 * profile shortcut, the ~10 sections with the active one highlighted, and a
 * theme switch at the foot. It shares the app's night background; the active row
 * carries the card surface (DESIGN-HANDOFF § "Tiroir latéral").
 */
export function MenuDrawer() {
  const pathname = usePathname();
  const { open, closeMenu } = useNavShell();
  const active = activeNavItem(pathname);

  return (
    <nav
      aria-label="Navigation principale"
      aria-hidden={!open}
      className="absolute inset-y-0 left-0 z-0 flex w-full flex-col text-ink-on-surface"
      style={{ paddingRight: "calc(52px + var(--margin-screen, 16px))" }}
    >
      <div className="flex items-center justify-between px-5 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <span className="t-screen-title">Menu</span>
        <Link
          href="/parametres"
          onClick={closeMenu}
          aria-label="Profil et paramètres"
          className="grid size-11 place-items-center rounded-[var(--radius-pill)] bg-white/10"
        >
          <UserIcon />
        </Link>
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive = active?.id === item.id;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-[var(--gap-icon-text,16px)] rounded-[var(--radius-block,18px)] px-3",
                  "min-h-[var(--size-list-button,52px)] transition-colors",
                  isActive
                    ? "bg-surface-card text-text-primary"
                    : "text-ink-on-surface/85 hover:bg-white/10",
                ].join(" ")}
              >
                <NavGlyph id={item.id} className="shrink-0 opacity-90" />
                <MarqueeText text={item.label} className="min-w-0 flex-1 t-body font-semibold" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2">
        <ThemeToggle className="t-secondary rounded-[var(--radius-pill)] bg-white/10 px-4 py-2.5 text-ink-on-surface/90" />
      </div>
    </nav>
  );
}
