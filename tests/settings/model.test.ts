import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  APP_VERSION,
  CURRENCIES,
  LANGUAGES,
  NAME_MAX,
  NAME_MIN,
  initials,
  isCurrency,
  isLanguage,
  nameError,
  writeModeFor,
} from "../../lib/settings/model.ts";

test("initials: one or two letters, uppercased", () => {
  assert.equal(initials("Kossi Adjo"), "KA");
  assert.equal(initials("elias"), "E");
  assert.equal(initials("  Marie   Claire  Dupont "), "MD");
  assert.equal(initials(""), "");
  assert.equal(initials("   "), "");
});

test("initials: a multi-byte first letter is not split in half", () => {
  // Naive `name[0]` on an emoji or an astral character yields half a surrogate
  // pair, which renders as a replacement glyph in the avatar.
  assert.equal(initials("Émile Zola"), "ÉZ");
  assert.equal([...initials("😀 Test")].length, 2);
});

test("nameError mirrors the server's personName rule", () => {
  assert.equal(nameError("Ko"), null);
  assert.equal(nameError("K"), "tooShort");
  assert.equal(nameError(""), "tooShort");
  // Trimmed before measuring, exactly like the Zod schema does.
  assert.equal(nameError("  K  "), "tooShort");
  assert.equal(nameError("  Ko  "), null);
  assert.equal(nameError("x".repeat(NAME_MAX)), null);
  assert.equal(nameError("x".repeat(NAME_MAX + 1)), "tooLong");
  assert.equal(NAME_MIN, 2);
});

test("writeModeFor: free text is deferred, closed lists are immediate, logout confirms", () => {
  assert.equal(writeModeFor("name"), "deferred");
  assert.equal(writeModeFor("avatar_url"), "deferred");
  assert.equal(writeModeFor("preferred_currency"), "immediate");
  assert.equal(writeModeFor("language"), "immediate");
  assert.equal(writeModeFor("theme"), "immediate");
  assert.equal(writeModeFor("logout"), "confirmed");
});

test("the option lists match what the database and Zod accept", () => {
  // `users.preferred_currency`'s CHECK and `schemas.ts::currency` list these
  // three; offering a fourth in the picker would surface as a 400 on tap.
  assert.deepEqual([...CURRENCIES].sort(), ["EUR", "USD", "XOF"]);
  assert.deepEqual([...LANGUAGES].sort(), ["en", "fr"]);
  assert.ok(isCurrency("XOF"));
  assert.ok(!isCurrency("GHS"));
  assert.ok(!isCurrency(null));
  assert.ok(isLanguage("en"));
  assert.ok(!isLanguage("es"));
});

test("APP_VERSION has not drifted from package.json", () => {
  // A client component cannot read package.json, so the version shown in the
  // screen's foot is duplicated in the model. This is the guard on that copy.
  const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
  assert.equal(APP_VERSION, pkg.version);
});
