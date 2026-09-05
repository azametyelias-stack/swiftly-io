"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  applyThemeChoice,
  readThemeChoice,
  setThemeChoice,
  subscribeTheme,
  THEME_ORDER,
  type ThemeChoice,
} from "@/lib/settings/theme";

/**
 * Quick theme switch in the drawer foot (DESIGN-HANDOFF § "Tiroir latéral":
 * "bascule de thème en pied"). Cycles Système → Clair → Sombre. SCREEN-22 owns
 * the full setting (and persists it to `users.theme`); this is the shortcut, and
 * both go through `lib/settings/theme` so they can never disagree.
 *
 * State is read straight from localStorage via useSyncExternalStore (same idiom
 * as ConsentProvider) so there is no setState-in-effect and no hydration flash
 * of the wrong label.
 */

const LABEL: Record<ThemeChoice, string> = {
  system: "Thème : système",
  light: "Thème : clair",
  dark: "Thème : sombre",
};

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribeTheme,
    readThemeChoice,
    () => "system",
  );

  // Keep <html data-theme> in sync with the stored choice (external-system
  // update, not setState).
  useEffect(() => {
    applyThemeChoice(choice);
  }, [choice]);

  const next = () =>
    setThemeChoice(THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length]!);

  return (
    <button type="button" onClick={next} className={className} aria-label={LABEL[choice]}>
      {LABEL[choice]}
    </button>
  );
}
