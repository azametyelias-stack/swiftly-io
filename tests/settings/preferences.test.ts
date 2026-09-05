import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { LANG_BOOT_SCRIPT } from "../../lib/settings/boot-script.ts";

// Audit 2026-09-05, point 3 — la langue doit suivre le COMPTE, et la première
// peinture doit déjà être juste.
//
// Le volet « thème » de cet audit est caduc depuis le 2026-09-06 : le mode
// sombre a été retiré, il n'y a plus qu'une palette. Ce qui le remplace en bas
// de fichier, c'est un garde-fou : que le sombre ne revienne pas par accident.
//
// Le script d'amorce s'exécute avant React, avant tout bundle, à chaque
// chargement. Il ne peut pas être exercé par un rendu : on l'assert comme texte.

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

/* ── le script d'avant-peinture ──────────────────────────────────────────── */

test("the boot script reads the same storage key the app writes", () => {
  // Une faute de frappe ici est invisible : la page clignote, indéfiniment.
  assert.match(LANG_BOOT_SCRIPT, /'sf-lang'/);
  assert.match(read("lib/i18n/useMessages.ts"), /LOCALE_STORAGE_KEY = "sf-lang"/);
});

test("every storage access is inside try/catch", () => {
  // `localStorage` LÈVE à l'accès dans une fenêtre privée ou avec les données
  // de site bloquées. Ce script tourne avant tout affichage : une exception ici
  // donne une page blanche, pas une page dégradée.
  assert.match(LANG_BOOT_SCRIPT, /try\s*\{/);
  assert.match(LANG_BOOT_SCRIPT, /catch\s*\(\s*e\s*\)\s*\{\s*\}/);
  const beforeTry = LANG_BOOT_SCRIPT.slice(0, LANG_BOOT_SCRIPT.indexOf("try"));
  assert.doesNotMatch(beforeTry, /localStorage/);
});

test("the boot script applies only the two locales that exist", () => {
  assert.match(LANG_BOOT_SCRIPT, /l==='fr'\|\|l==='en'/);
});

test("the boot script validates what it read instead of trusting it", () => {
  // localStorage est inscriptible par n'importe quel XSS. Les valeurs sont
  // comparées à des littéraux et jamais injectées dans le DOM comme balisage.
  assert.doesNotMatch(LANG_BOOT_SCRIPT, /innerHTML|document\.write|eval|Function\(/);
});

test("the boot script runs immediately and defines no globals", () => {
  assert.match(LANG_BOOT_SCRIPT, /^\(function\(\)\{/);
  assert.match(LANG_BOOT_SCRIPT, /\}\)\(\)$/);
});

/* ── la langue suit le compte ────────────────────────────────────────────── */

test("SCREEN-22 persists the language to the account, not just the device", () => {
  // La ligne gagne au chargement ; ce n'est correct que si tout contrôle écrit
  // aussi la ligne, sinon adopter la ligne au chargement suivant annulerait
  // silencieusement le choix de l'utilisateur.
  assert.match(read("components/settings/SettingsScreen.tsx"), /commit\(\{ language \}/);
});

test("the sync component is mounted behind the session gate", () => {
  // `/privacy` est lisible déconnecté ; y appeler /api/me est un 401 garanti à
  // chaque visite.
  assert.match(read("app/(app)/layout.tsx"), /<PreferencesSync \/>/);
  assert.doesNotMatch(read("app/layout.tsx"), /PreferencesSync/);
});

test("the root layout ships the boot script and allows it to differ from SSR", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /LANG_BOOT_SCRIPT/);
  // Sans ceci, React signale l'attribut que le script vient de poser comme une
  // divergence d'hydratation à chaque chargement.
  assert.match(layout, /suppressHydrationWarning/);
});

/* ── garde-fou : une seule palette (décision Elias, 2026-09-06) ──────────── */

test("no dark palette survives in the stylesheet", () => {
  const css = read("app/globals.css");
  // Les deux mécanismes qui peignaient en sombre. Les réintroduire, c'est
  // ramener un thème que SCREEN-22 n'a plus aucun moyen de désactiver.
  assert.doesNotMatch(css, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.doesNotMatch(css, /:root\[data-theme="dark"\]/);
  // `color-scheme: light` dit au navigateur de ne pas assombrir les widgets
  // natifs quand l'OS est en mode nuit.
  assert.match(css, /color-scheme:\s*light/);
});

test("nothing writes a theme any more", () => {
  for (const f of [
    "app/layout.tsx",
    "components/nav/MenuDrawer.tsx",
    "components/settings/SettingsScreen.tsx",
    "lib/settings/preferences.ts",
  ]) {
    assert.doesNotMatch(read(f), /setThemeChoice|setThemePreference|data-theme/, `${f} still writes a theme`);
  }
});

test("the theme-color meta is a single static value, and it is the painted one", () => {
  // Il valait `--surface-page` jusqu'au 2026-09-06 — la couleur d'AppHeader,
  // qui n'est rendu que par SCREEN-22. Les 21 autres écrans laissent voir le
  // `--brand-deep` de NavShell, d'où un bandeau clair au-dessus d'un en-tête
  // navy sur l'app installée.
  const config = read("lib/pwa/config.ts");
  assert.match(config, /export const THEME_COLOR = "#0A1466"/);
  assert.match(read("app/globals.css"), /--brand-deep:\s*#0a1466/i);
  // Émis statiquement par l'export `viewport`, plus par un script.
  assert.match(read("app/layout.tsx"), /themeColor: THEME_COLOR/);
  assert.doesNotMatch(LANG_BOOT_SCRIPT, /theme-color/);
});
