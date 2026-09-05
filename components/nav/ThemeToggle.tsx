"use client";

import { useEffect, useSyncExternalStore } from "react";

import { setThemePreference } from "@/lib/settings/preferences";
import {
  applyThemeChoice,
  readThemeChoice,
  subscribeTheme,
  THEME_ORDER,
  type ThemeChoice,
} from "@/lib/settings/theme";

/**
 * Quick theme switch in the drawer foot (DESIGN-HANDOFF § "Tiroir latéral":
 * "bascule de thème en pied"). Cycles Système → Clair → Sombre — it is the only
 * control that can reach "Système", which is why the row has to be able to
 * hold it (migration 0006).
 *
 * Both this and SCREEN-22's switch write through `lib/settings/preferences`, so
 * they cannot disagree and neither can leave the account row behind.
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

  // Through `setThemePreference`, not `setThemeChoice`: this used to write
  // localStorage alone, so the account row never learned about it and the next
  // device silently undid the choice.
  const next = () =>
    setThemePreference(THEME_ORDER[(THEME_ORDER.indexOf(choice) + 1) % THEME_ORDER.length]!);

  return (
    <button type="button" onClick={next} className={className} aria-label={LABEL[choice]}>
      {LABEL[choice]}
    </button>
  );
}
