import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RECENT_VISIBLE,
  offersMore,
  recentSlice,
} from "../../lib/dashboard/recent.ts";

const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

test("cinq lignes visibles tant que le bloc est replié", () => {
  assert.equal(RECENT_VISIBLE, 5);
  assert.deepEqual(recentSlice(rows(9), false), [0, 1, 2, 3, 4]);
});

test("déplié, tout est là", () => {
  assert.deepEqual(recentSlice(rows(9), true), rows(9));
});

test("moins de cinq lignes : on montre ce qu'il y a, sans trou", () => {
  assert.deepEqual(recentSlice(rows(2), false), [0, 1]);
  assert.deepEqual(recentSlice([], false), []);
});

test("« Voir plus » apparaît à la 6ᵉ transaction, pas avant", () => {
  assert.equal(offersMore(0), false);
  assert.equal(offersMore(5), false);
  // Le point qui compte : avec 6, la 6ᵉ est cachée — le bouton DOIT être là.
  assert.equal(offersMore(6), true);
  assert.equal(offersMore(7), true);
});

test("recentSlice ne modifie jamais la liste qu'on lui donne", () => {
  const source = rows(8);
  const copy = [...source];
  recentSlice(source, false);
  recentSlice(source, true);
  assert.deepEqual(source, copy);
});
