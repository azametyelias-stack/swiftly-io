import { test } from "node:test";
import assert from "node:assert/strict";

import {
  MASKED_AMOUNT,
  currencySymbol,
  formatBalance,
  formatMoney,
  formatSigned,
} from "../../lib/format/money.ts";

const THIN = " "; // U+2009 thin space — thousands separator
const MINUS = "−"; // U+2212 minus sign

test("thousands are grouped with U+2009, never a comma or period", () => {
  assert.equal(formatMoney(250000), `250${THIN}000 F`);
  assert.equal(formatMoney(1234567, { withCurrency: false }), `1${THIN}234${THIN}567`);
  assert.equal(formatMoney(999), "999 F");
  assert.ok(!formatMoney(250000).includes(","));
  assert.ok(!formatMoney(250000).includes("."));
});

test("the currency suffix is set off by a normal space, never glued", () => {
  assert.equal(formatMoney(100, { withCurrency: true }).at(-2), " ");
  assert.equal(currencySymbol("XOF"), "F");
  assert.equal(currencySymbol("EUR"), "€");
  assert.equal(currencySymbol("USD"), "$");
  assert.equal(formatMoney(5000, { currency: "EUR" }), `5${THIN}000 €`);
});

test("sign: auto — no sign when >= 0, U+2212 when < 0", () => {
  assert.equal(formatMoney(343100), `343${THIN}100 F`);
  assert.equal(formatMoney(0), "0 F");
  assert.equal(formatMoney(-12000), `${MINUS}12${THIN}000 F`);
  assert.ok(!formatMoney(-12000).includes("-")); // ASCII hyphen must not appear
});

test("sign: in — always a leading plus; sign: out — always U+2212", () => {
  assert.equal(formatMoney(67000, { sign: "in" }), `+67${THIN}000 F`);
  assert.equal(formatMoney(32200, { sign: "out" }), `${MINUS}32${THIN}200 F`);
  // magnitude is taken as absolute for explicit directions
  assert.equal(formatMoney(-32200, { sign: "out" }), `${MINUS}32${THIN}200 F`);
});

test("sign: none — magnitude only", () => {
  assert.equal(formatMoney(-5000, { sign: "none" }), `5${THIN}000 F`);
});

test("masked mode renders a fixed-length placeholder + suffix", () => {
  assert.equal(MASKED_AMOUNT, "•• •••");
  assert.equal(formatMoney(999999, { masked: true }), `${MASKED_AMOUNT} F`);
  assert.equal(formatMoney(1, { masked: true }), formatMoney(9_999_999, { masked: true }));
  assert.equal(formatMoney(500, { masked: true, withCurrency: false }), MASKED_AMOUNT);
});

test("formatBalance / formatSigned convenience wrappers", () => {
  assert.equal(formatBalance(343100), `343${THIN}100 F`);
  assert.equal(formatBalance(-1), `${MINUS}1 F`);
  assert.equal(formatSigned(67000, "in"), `+67${THIN}000 F`);
  assert.equal(formatSigned(32200, "out"), `${MINUS}32${THIN}200 F`);
  assert.equal(formatSigned(5000, "in", "USD"), `+5${THIN}000 $`);
});

test("non-integer input is rounded to whole units", () => {
  assert.equal(formatMoney(1999.6), `2${THIN}000 F`);
  assert.equal(formatMoney(1999.4), `1${THIN}999 F`);
});
