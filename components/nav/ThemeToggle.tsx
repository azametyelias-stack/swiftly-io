"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Quick theme switch in the drawer foot (DESIGN-HANDOFF § "Tiroir latéral":
 * "bascule de thème en pied"). Cycles Système → Clair → Sombre and writes
 * `data-theme` on <html> (globals.css: absent = follow the OS). SCREEN-22 owns
 * the full setting; this is the shortcut.
 *
 * State is read straight from localStorage via useSyncExternalStore (same idiom
 * as ConsentProvider) so there is no setState-in-effect and no hydration flash
 * of the wrong label. A non-"system" choice can still flash the wrong *colours*
 * for one frame on a hard reload until this mounts — a blocking <head> script is
 * a follow-up for SCREEN-22.
 */

type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "sf-theme";
const CHANGE_EVENT = "sf:theme-change";
const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const LABEL: Record<ThemeChoice, string> = {
  system: "Thème : système",
  light: "Thème : clair",
  dark: "Thème : sombre",
};

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage may be unavailable */
  }
  return "system";
}

function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    readChoice,
    () => "system",
  );

  // Keep <html data-theme> in sync with the stored choice (external-system
  // update, not setState).
  useEffect(() => {
    applyChoice(choice);
  }, [choice]);

  const next = () => {
    const value = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    applyChoice(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <button type="button" onClick={next} className={className} aria-label={LABEL[choice]}>
      {LABEL[choice]}
    </button>
  );
}
