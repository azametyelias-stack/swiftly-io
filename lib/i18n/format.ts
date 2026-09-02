/**
 * Self-contained i18n primitives — no imports, so `tests/i18n/*` can load this
 * directly under `node --test` (the dictionaries + `getMessages` live in
 * `./index`, which uses `@/` alias imports and isn't runtime-unit-tested).
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Fill `{name}`-style placeholders in a message.
 *
 *   interpolate(m.auth.name.welcome, { name: "Elias" })  // "Bienvenue, Elias"
 *
 * A placeholder with no matching value is left untouched.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
