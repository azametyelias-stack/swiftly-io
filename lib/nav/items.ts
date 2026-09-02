/**
 * The app's primary navigation — the entries of the swipe-in menu (SCREEN-05)
 * and the two-level root/sub-screen rule that decides the header's left button
 * (DESIGN-HANDOFF § "Barre de navigation": menu icon at root, back chevron
 * everywhere else).
 *
 * Pure and dependency-free — unit-tested in `tests/nav/items.test.ts`.
 */

export type NavIcon =
  | "dashboard"
  | "stats"
  | "accounts"
  | "templates"
  | "budgets"
  | "projects"
  | "alerts"
  | "history"
  | "help"
  | "report";

export interface NavItem {
  /** Stable key + icon selector. */
  readonly id: NavIcon;
  /** Exact label (SCREEN-05 § 2). Long ones marquee in the drawer. */
  readonly label: string;
  /** Root route for the section. */
  readonly href: string;
}

/**
 * SCREEN-05 § 1/2 + DESIGN-RECONCILIATION § 5 ("~10 entrées"). Order is the
 * display order in the drawer. "Compte & Cartes" === the Gestion des comptes
 * screen (17).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "stats", label: "Statistiques", href: "/statistiques" },
  { id: "accounts", label: "Compte & Cartes", href: "/comptes" },
  { id: "templates", label: "Templates", href: "/templates" },
  { id: "budgets", label: "Budgets", href: "/budgets" },
  { id: "projects", label: "Projet", href: "/projets" },
  { id: "alerts", label: "Alertes & Notifications", href: "/alertes" },
  { id: "history", label: "Historiques", href: "/historiques" },
  { id: "help", label: "Aides", href: "/aides" },
  { id: "report", label: "Rapport", href: "/rapport" },
] as const;

/** The route each nav item points at. A pathname equal to one of these is "root". */
export const ROOT_PATHS: readonly string[] = NAV_ITEMS.map((i) => i.href);

/** Strip a trailing slash (but keep "/"). */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Root level ⇒ the header shows the menu button. A root path is exactly one of
 * the section routes; anything deeper (`/historiques/abc`, a detail or a wizard)
 * is a sub-screen and shows the back chevron.
 */
export function isRootPath(pathname: string): boolean {
  return ROOT_PATHS.includes(normalize(pathname));
}

/**
 * The nav item to highlight for the current pathname — the one whose href is the
 * longest prefix of the path (so `/historiques/abc` still highlights
 * "Historiques"). `null` outside the app sections.
 */
export function activeNavItem(pathname: string): NavItem | null {
  const path = normalize(pathname);
  let best: NavItem | null = null;
  for (const item of NAV_ITEMS) {
    if (path === item.href || path.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}
