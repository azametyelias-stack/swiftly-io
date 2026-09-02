import { test } from "node:test";
import assert from "node:assert/strict";

import { fr } from "../../lib/i18n/fr.ts";
import { en } from "../../lib/i18n/en.ts";
import { interpolate, isLocale, LOCALES } from "../../lib/i18n/format.ts";

/** All leaf key paths of a nested string dictionary, sorted. */
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

test("fr and en expose exactly the same key tree", () => {
  assert.deepEqual(keyPaths(en), keyPaths(fr));
});

test("every leaf is a non-empty string in both locales", () => {
  for (const dict of [fr, en]) {
    for (const path of keyPaths(dict)) {
      const value = path
        .split(".")
        .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], dict);
      assert.equal(typeof value, "string", `${path} must be a string`);
      assert.ok((value as string).length > 0, `${path} must not be empty`);
    }
  }
});

test("isLocale / LOCALES", () => {
  assert.deepEqual([...LOCALES], ["fr", "en"]);
  assert.equal(isLocale("fr"), true);
  assert.equal(isLocale("de"), false);
  assert.equal(isLocale(null), false);
});

test("interpolate fills known placeholders and leaves unknown ones", () => {
  assert.equal(interpolate("Bienvenue, {name}", { name: "Elias" }), "Bienvenue, Elias");
  assert.equal(interpolate("Chiffre {index} sur 6", { index: 3 }), "Chiffre 3 sur 6");
  assert.equal(interpolate("{a} {b}", { a: "x" }), "x {b}");
});
