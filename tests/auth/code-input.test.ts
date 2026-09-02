import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CODE_LENGTH,
  applyBackspace,
  applyInput,
  fromCells,
  isComplete,
  sanitizeDigits,
  toCells,
} from "../../lib/auth/code-input.ts";

test("sanitizeDigits: strips non-digits and caps length", () => {
  assert.equal(sanitizeDigits("4a9 2-7!1x3"), "492713");
  assert.equal(sanitizeDigits("123456789"), "123456");
  assert.equal(sanitizeDigits("12", 4), "12");
  assert.equal(sanitizeDigits("abc"), "");
});

test("toCells / fromCells round-trip, always length 6", () => {
  assert.deepEqual(toCells(""), ["", "", "", "", "", ""]);
  assert.deepEqual(toCells("492"), ["4", "9", "2", "", "", ""]);
  assert.equal(toCells("492").length, CODE_LENGTH);
  assert.equal(fromCells(["4", "9", "2", "", "", ""]), "492");
  assert.equal(fromCells(toCells("123456")), "123456");
});

test("applyInput: one digit fills the current cell and advances", () => {
  const { cells, focus } = applyInput(toCells(""), 0, "4");
  assert.deepEqual(cells, ["4", "", "", "", "", ""]);
  assert.equal(focus, 1);
});

test("applyInput: typing in the last cell keeps focus there", () => {
  const { focus } = applyInput(toCells("12345"), 5, "6");
  assert.equal(focus, 5);
});

test("applyInput: a full paste distributes one digit per cell", () => {
  const { cells, focus } = applyInput(toCells(""), 0, "123456");
  assert.deepEqual(cells, ["1", "2", "3", "4", "5", "6"]);
  assert.equal(focus, 5);
});

test("applyInput: paste from the middle only fills forward", () => {
  const { cells, focus } = applyInput(toCells("12"), 2, "9876543");
  assert.deepEqual(cells, ["1", "2", "9", "8", "7", "6"]);
  assert.equal(focus, 5);
});

test("applyInput: pasted non-digits are filtered out", () => {
  const { cells } = applyInput(toCells(""), 0, "12-34-56");
  assert.deepEqual(cells, ["1", "2", "3", "4", "5", "6"]);
});

test("applyBackspace: on a filled cell, clears it and stays", () => {
  const { cells, focus } = applyBackspace(["4", "9", "2", "", "", ""], 2);
  assert.deepEqual(cells, ["4", "9", "", "", "", ""]);
  assert.equal(focus, 2);
});

test("applyBackspace: on an empty cell, clears the previous one and moves back", () => {
  const { cells, focus } = applyBackspace(["4", "9", "", "", "", ""], 2);
  assert.deepEqual(cells, ["4", "", "", "", "", ""]);
  assert.equal(focus, 1);
});

test("applyBackspace: on cell 0 stays at 0", () => {
  const { focus } = applyBackspace(["", "", "", "", "", ""], 0);
  assert.equal(focus, 0);
});

test("isComplete: exactly six digits", () => {
  assert.equal(isComplete("123456"), true);
  assert.equal(isComplete("12345"), false);
  assert.equal(isComplete("1234567"), false);
  assert.equal(isComplete(""), false);
});
