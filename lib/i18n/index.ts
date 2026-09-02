/**
 * Light i18n layer — BUILD-PLAN.md § 3 ("prévoir une couche i18n légère dès le
 * Lot 1 : clés, pas de texte en dur").
 *
 * FR is the default and the only language the product ships in at MVP; EN is a
 * setting on SCREEN-22. The point of this layer NOW is that screens never carry
 * hard-coded strings, so turning EN on later is a translation pass, not a
 * refactor.
 *
 * `en` is typed `Messages` (= `typeof fr`), so `tsc` fails the build if the two
 * dictionaries drift apart; `tests/i18n/messages.test.ts` re-checks at runtime.
 *
 * Client code reads this through `./useMessages`. The primitives (`Locale`,
 * `isLocale`, `interpolate`, …) are re-exported from `./format`, which is
 * import-free so tests can load it under `node --test`.
 */

import { fr } from "@/lib/i18n/fr";
import { en } from "@/lib/i18n/en";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/format";

export * from "@/lib/i18n/format";

export type Messages = typeof fr;

const DICTIONARIES: Record<Locale, Messages> = { fr, en };

/** The message tree for `locale`, falling back to the default. */
export function getMessages(locale: Locale): Messages {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}
