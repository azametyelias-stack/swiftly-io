import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { THEME_BOOT_SCRIPT } from "../../lib/settings/boot-script.ts";
import { THEMES } from "../../lib/settings/model.ts";

// Audit 2026-09-05, point 3 — the theme and language must follow the ACCOUNT,
// and the first paint must already be right.
//
// The boot script runs before React, before any bundle, on every page load. It
// cannot be exercised by rendering, so it is asserted as text.

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

// ---------------------------------------------------------------------------
// The pre-paint script
// ---------------------------------------------------------------------------

test("the boot script reads the same storage keys the app writes", () => {
  // A typo here is invisible: the page just flashes, forever.
  assert.match(THEME_BOOT_SCRIPT, /'sf-theme'/);
  assert.match(THEME_BOOT_SCRIPT, /'sf-lang'/);
  assert.match(read("lib/settings/theme.ts"), /THEME_STORAGE_KEY = "sf-theme"/);
  assert.match(read("lib/i18n/useMessages.ts"), /LOCALE_STORAGE_KEY = "sf-lang"/);
});

test("every storage access is inside try/catch", () => {
  // `localStorage` THROWS on access in a private window or with site data
  // blocked. This script runs before anything is on screen, so an exception
  // here is a blank page, not a degraded one.
  assert.match(THEME_BOOT_SCRIPT, /try\s*\{/);
  assert.match(THEME_BOOT_SCRIPT, /catch\s*\(\s*e\s*\)\s*\{\s*\}/);
  const beforeTry = THEME_BOOT_SCRIPT.slice(0, THEME_BOOT_SCRIPT.indexOf("try"));
  assert.doesNotMatch(beforeTry, /localStorage/);
});

test("the boot script applies only the two themes that paint", () => {
  // "system" means NO `data-theme` attribute — writing it would defeat the
  // `prefers-color-scheme` rules in globals.css.
  assert.match(THEME_BOOT_SCRIPT, /t==='light'\|\|t==='dark'/);
  assert.doesNotMatch(THEME_BOOT_SCRIPT, /dataset\.theme\s*=\s*'system'/);
  assert.doesNotMatch(THEME_BOOT_SCRIPT, /t==='system'/);
});

test("the boot script validates what it read instead of trusting it", () => {
  // localStorage is attacker-writable from any XSS. The values are compared
  // against literals and never injected into the DOM as markup.
  assert.doesNotMatch(THEME_BOOT_SCRIPT, /innerHTML|document\.write|eval|Function\(/);
});

test("the boot script runs immediately and defines no globals", () => {
  assert.match(THEME_BOOT_SCRIPT, /^\(function\(\)\{/);
  assert.match(THEME_BOOT_SCRIPT, /\}\)\(\)$/);
});

// ---------------------------------------------------------------------------
// "system" has to be storable everywhere or it is not really a choice
// ---------------------------------------------------------------------------

test("the three layers agree on the set of themes", () => {
  assert.deepEqual([...THEMES], ["system", "light", "dark"]);
  // Zod — otherwise the drawer's "Système" is rejected with a 400.
  assert.match(
    read("lib/validation/schemas.ts"),
    /export const theme = z\.enum\(\["system", "light", "dark"\]\)/,
  );
  // Postgres — otherwise it is rejected one layer deeper, as an opaque 500.
  assert.match(
    read("supabase/migrations/0006_theme_system.sql"),
    /check \(theme in \('system', 'light', 'dark'\)\)/,
  );
});

test("a fresh row and a fresh browser start on the same theme", () => {
  // `readThemeChoice()` falls back to "system" when nothing is stored; the
  // column default has to match or every new account disagrees with its own
  // browser until the user touches the setting.
  assert.match(read("lib/settings/theme.ts"), /return "system";/);
  assert.match(
    read("supabase/migrations/0006_theme_system.sql"),
    /alter column theme set default 'system'/,
  );
});

// ---------------------------------------------------------------------------
// Both writers persist — the invariant that makes "the row wins" safe
// ---------------------------------------------------------------------------

test("neither theme writer stops at localStorage", () => {
  // The row winning on load is only correct if every control also writes the
  // row. The drawer used to write localStorage alone, so adopting the row at
  // the next load would have silently undone the user's choice.
  const drawer = read("components/nav/ThemeToggle.tsx");
  assert.match(drawer, /setThemePreference\(/, "the drawer must persist to the account");
  assert.doesNotMatch(
    drawer,
    /setThemeChoice\(/,
    "the drawer must not write localStorage directly any more",
  );

  const screen22 = read("components/settings/SettingsScreen.tsx");
  assert.match(screen22, /commit\(\{ theme \}/, "SCREEN-22 must persist to the account");
  assert.match(screen22, /commit\(\{ language \}/);
});

test("SCREEN-22's switch reports what is painted, not what is stored", () => {
  const screen22 = read("components/settings/SettingsScreen.tsx");
  assert.match(screen22, /checked=\{appliedTheme === "dark"\}/);
  assert.doesNotMatch(
    screen22,
    /checked=\{profile\.theme === "dark"\}/,
    'choice "system" under a dark OS is a dark app — the row alone would show it unchecked',
  );
});

test("the sync component is mounted behind the session gate", () => {
  // `/privacy` is readable logged out; asking /api/me there is a guaranteed 401
  // on every visit.
  const shell = read("app/(app)/layout.tsx");
  assert.match(shell, /<PreferencesSync \/>/);
  assert.doesNotMatch(read("app/layout.tsx"), /PreferencesSync/);
});

test("the root layout ships the boot script and allows it to differ from SSR", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /THEME_BOOT_SCRIPT/);
  // Without this React reports the attribute the script just set as a
  // hydration mismatch on every load.
  assert.match(layout, /suppressHydrationWarning/);
});
