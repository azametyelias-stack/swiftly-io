/**
 * SCREEN-22 (Paramètres) — the option lists and the small rules the screen
 * obeys, kept pure so `node --test` can check them and the screen itself stays
 * a rendering of this data rather than a pile of branches.
 *
 * The artboard's central rule (`Lot 9 Paramètres utilisateur.dc.html`,
 * "Chevron = je pars, valeur = je choisis") is encoded as `SettingRowKind`:
 * four variants, never mixed, so a column of identical rows reads at a glance.
 *
 * Import-free on purpose (no React, no Zod) — the API's own guard is
 * `profileUpdateSchema`, this is the UI's side of the same contract.
 */

/** Currencies the whole stack accepts — `users.preferred_currency`'s CHECK, */
/*  `schemas.ts::currency` and `money.ts::CurrencyCode` all list exactly these. */
export const CURRENCIES = ["XOF", "USD", "EUR"] as const;
export type SettingsCurrency = (typeof CURRENCIES)[number];

export const LANGUAGES = ["fr", "en"] as const;
export type SettingsLanguage = (typeof LANGUAGES)[number];

// Mirrors `users.theme` and `schemas.ts::theme`. "system" is not offered as a
// third position on SCREEN-22's switch — the artboard is explicit that the
// theme is "un interrupteur, pas deux boutons" — it is what the drawer's cycle
// can set and what a fresh account starts on.
export const THEMES = ["system", "light", "dark"] as const;
export type SettingsTheme = (typeof THEMES)[number];

export function isCurrency(v: unknown): v is SettingsCurrency {
  return typeof v === "string" && (CURRENCIES as readonly string[]).includes(v);
}
export function isLanguage(v: unknown): v is SettingsLanguage {
  return typeof v === "string" && (LANGUAGES as readonly string[]).includes(v);
}

/**
 * The four row shapes of the artboard's "La rangée de paramètre" system:
 *  - `value`    — a value on the right + chevron; tap opens a picker in place;
 *  - `nav`      — chevron alone; tap leaves for another screen in the app;
 *  - `external` — the oblique arrow; tap leaves Swiftly entirely (the artboard's
 *                 one deliberate exception, justified by a real difference of
 *                 destination);
 *  - `toggle`   — a switch; the state is readable without reading a word.
 */
export type SettingRowKind = "value" | "nav" | "external" | "toggle";

/**
 * When a change is written (artboard "Écriture immédiate ou différée").
 * Currency / language / theme are picked from a closed list, so the tap *is* the
 * decision and it saves at once. A name is free text, so it needs an explicit
 * "Enregistrer" — the user must be able to be half-way through typing without
 * the app saving "Ko".
 */
export type WriteMode = "immediate" | "deferred" | "confirmed";

export function writeModeFor(
  field: "name" | "avatar_url" | "preferred_currency" | "language" | "theme" | "logout",
): WriteMode {
  if (field === "name" || field === "avatar_url") return "deferred";
  if (field === "logout") return "confirmed";
  return "immediate";
}

/** `users.name`'s rule, mirrored from `schemas.ts::personName` for inline feedback. */
export const NAME_MIN = 2;
export const NAME_MAX = 120;

export function nameError(raw: string): "tooShort" | "tooLong" | null {
  const name = raw.trim();
  if (name.length < NAME_MIN) return "tooShort";
  if (name.length > NAME_MAX) return "tooLong";
  return null;
}

/**
 * Up to two initials for the avatar placeholder ("Kossi Adjo" → "KA"). Falls
 * back to a single character, and to "" for an empty name — the caller renders
 * a neutral glyph rather than an empty circle in that case.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = [...words[0]!][0] ?? "";
  const last = words.length > 1 ? ([...words.at(-1)!][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** The profile the settings screen reads and writes (`GET`/`PATCH /api/me`). */
export interface SettingsProfile {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  preferred_currency: SettingsCurrency;
  theme: SettingsTheme;
  language: SettingsLanguage;
}

/** Fields `PATCH /api/me` accepts — a subset, all optional (email is read-only). */
export type ProfilePatch = Partial<
  Pick<SettingsProfile, "name" | "avatar_url" | "preferred_currency" | "theme" | "language">
>;

// ── the two rows that leave the app ────────────────────────────────────────

/** Same domain as the privacy contact already published on SCREEN-20. */
export const SUPPORT_EMAIL = "support@swiftly.io";

/** The public site's terms page — SCREEN-22's only row that leaves Swiftly. */
export const TERMS_URL = "https://swiftly.io/conditions-generales";

/**
 * Shown in the screen's foot. Mirrors `package.json`'s `version` — a client
 * component cannot read that file, so the value is duplicated here and
 * `tests/settings/model.test.ts` fails the build if the two ever drift.
 */
export const APP_VERSION = "0.1.0";
