"use client";

import { apiJson } from "@/lib/http/api";
import { isLocale, type Locale } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY, setLocale } from "@/lib/i18n/useMessages";
import { readThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/settings/theme";

/**
 * Reconciles the two places a preference lives — audit 2026-09-05, point 3.
 *
 * Before this, `users.theme` and `users.language` were written by SCREEN-22 and
 * read by nobody. The app ran entirely off localStorage, so the account setting
 * was decorative: a new phone started in French on the light theme however the
 * profile was set, and SCREEN-22 displayed the stored row while the app applied
 * something else.
 *
 * ── Who wins ───────────────────────────────────────────────────────────────
 *
 * The row wins on load. It is the only value that follows the person across
 * devices, so a fresh browser must adopt it rather than impose its own default.
 *
 * That is only coherent if every writer persists. The drawer's quick switch
 * used to write localStorage alone; with the row winning at the next load, that
 * change would have been silently reverted — a worse bug than the one being
 * fixed. So `setThemePreference` below is now the single entry point for both
 * writers, and it does both halves.
 *
 * ── Why the write is fire-and-forget ───────────────────────────────────────
 *
 * The local half has already applied when the request goes out. Blocking the
 * switch on a round-trip would make it feel broken offline, and a failed write
 * costs the user one preference on their next device — not their session, not
 * their money. It is logged, not surfaced.
 */

/** The shape `PreferencesSync` needs out of `/api/me`. */
export interface StoredPreferences {
  theme: ThemeChoice;
  language: Locale;
}

function isThemeChoice(v: unknown): v is ThemeChoice {
  return v === "system" || v === "light" || v === "dark";
}

/** Persist to `users.*`, best-effort. Never throws — see the header. */
async function persist(patch: Partial<StoredPreferences>): Promise<void> {
  try {
    await apiJson("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    /* the local half already applied; the row catches up on the next change */
  }
}

/**
 * Apply a theme everywhere: DOM, localStorage, every subscriber, and the row.
 *
 * Both the drawer cycle and SCREEN-22's switch call this, which is what keeps
 * them from disagreeing.
 */
export function setThemePreference(choice: ThemeChoice): void {
  setThemeChoice(choice);
  void persist({ theme: choice });
}

/** The language counterpart. */
export function setLanguagePreference(locale: Locale): void {
  setLocale(locale);
  void persist({ language: locale });
}

/**
 * Adopt the account's stored preferences on load.
 *
 * Called once per session by `PreferencesSync`. Writes only when the row and
 * the device actually differ, so the common case — same phone as last time —
 * dispatches no events and re-renders nothing.
 */
export function adoptStoredPreferences(prefs: Partial<StoredPreferences>): void {
  if (isThemeChoice(prefs.theme) && prefs.theme !== readThemeChoice()) {
    setThemeChoice(prefs.theme);
  }
  if (isLocale(prefs.language)) {
    let current: string | null = null;
    try {
      current = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      /* storage unavailable — treat as "nothing stored" and adopt the row */
    }
    if (current !== prefs.language) setLocale(prefs.language);
  }
}
