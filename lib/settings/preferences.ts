"use client";

import { apiJson } from "@/lib/http/api";
import { isLocale, type Locale } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY, setLocale } from "@/lib/i18n/useMessages";

/**
 * Reconciles the two places a preference lives — audit 2026-09-05, point 3.
 *
 * Il ne reste que la langue. Le thème a été retiré le 2026-09-06 : une seule
 * palette, plus rien à choisir ni à synchroniser. La colonne `users.theme`
 * survit en base — la retirer demanderait une migration irréversible sur une
 * base de production pour un gain nul — mais plus personne ne l'écrit ni ne la
 * lit.
 *
 * Avant ce module, `users.language` était écrit par SCREEN-22 et lu par
 * personne. L'app tournait entièrement sur localStorage, donc le réglage du
 * compte était décoratif : un nouveau téléphone démarrait en français quel que
 * soit le profil, et SCREEN-22 affichait la ligne stockée pendant que l'app
 * appliquait autre chose.
 *
 * ── Qui gagne ──────────────────────────────────────────────────────────────
 *
 * La ligne gagne au chargement. C'est la seule valeur qui suit la personne d'un
 * appareil à l'autre, donc un navigateur neuf doit l'adopter plutôt qu'imposer
 * son propre défaut. Cela n'est cohérent que si tout écrivain persiste, d'où le
 * point d'entrée unique ci-dessous.
 *
 * ── Pourquoi l'écriture est sans attente ───────────────────────────────────
 *
 * La moitié locale est déjà appliquée quand la requête part. Bloquer le
 * basculement sur un aller-retour le ferait paraître cassé hors ligne, et une
 * écriture ratée coûte une préférence sur le prochain appareil — pas la
 * session, pas l'argent. C'est journalisé, pas remonté à l'écran.
 */

/** The shape `PreferencesSync` needs out of `/api/me`. */
export interface StoredPreferences {
  language: Locale;
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

/** Apply a language everywhere: DOM, localStorage, every subscriber, and the row. */
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
