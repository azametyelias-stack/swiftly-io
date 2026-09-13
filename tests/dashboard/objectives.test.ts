import { test } from "node:test";
import assert from "node:assert/strict";

import {
  budgetObjective,
  buildObjectives,
  savingsObjective,
  type ObjectiveBudgetSource,
  type ObjectiveProjectSource,
} from "../../lib/dashboard/objectives.ts";

const budget = (o: Partial<ObjectiveBudgetSource> = {}): ObjectiveBudgetSource => ({
  id: "b1",
  category: { name: "Alimentation" },
  allocated_amount: 100_000,
  spent: 0,
  ...o,
});

const project = (o: Partial<ObjectiveProjectSource> = {}): ObjectiveProjectSource => ({
  id: "p1",
  name: "Épargne",
  target_amount: 100_000,
  allocated_amount: 0,
  spent: 0,
  status: "active",
  ...o,
});

// ── budgets : la barre se remplit vers une mauvaise nouvelle ────────────────

test("budget — seuils de couleur de SCREEN-15 § 5", () => {
  assert.equal(budgetObjective(budget({ spent: 50_000 })).tone, "green");
  assert.equal(budgetObjective(budget({ spent: 50_001 })).tone, "orange");
  assert.equal(budgetObjective(budget({ spent: 91_000 })).tone, "orange");
  assert.equal(budgetObjective(budget({ spent: 92_000 })).tone, "red");
});

test("budget — le rouge est urgent, et lui seul", () => {
  assert.equal(budgetObjective(budget({ spent: 91_000 })).urgent, false);
  assert.equal(budgetObjective(budget({ spent: 92_000 })).urgent, true);
});

test("budget — un dépassement affiche plus de 100 %, non plafonné", () => {
  const o = budgetObjective(budget({ spent: 118_000 }));
  assert.equal(o.percent, 118);
  assert.equal(o.tone, "red");
});

test("budget — un plafond à zéro ne divise pas par zéro", () => {
  assert.equal(budgetObjective(budget({ allocated_amount: 0, spent: 0 })).percent, 0);
  assert.equal(budgetObjective(budget({ allocated_amount: 0, spent: 500 })).percent, 100);
});

test("budget — pointe vers sa fiche", () => {
  assert.equal(budgetObjective(budget({ id: "abc" })).href, "/budgets/abc");
  assert.equal(budgetObjective(budget({ id: "abc" })).id, "budget:abc");
});

// ── épargne : la même barre, lue dans l'autre sens ──────────────────────────

test("épargne — reste verte et jamais urgente, même à 95 %", () => {
  const o = savingsObjective(project({ allocated_amount: 95_000 }));
  assert.ok(o);
  assert.equal(o.tone, "green");
  assert.equal(o.urgent, false);
  assert.equal(o.percent, 95);
});

test("épargne — le financé additionne l'affecté et le dépensé (SCREEN-16)", () => {
  const o = savingsObjective(project({ allocated_amount: 60_000, spent: 15_000 }));
  assert.equal(o?.current, 75_000);
  assert.equal(o?.percent, 75);
});

test("épargne — sans montant cible, pas d'objectif", () => {
  assert.equal(savingsObjective(project({ target_amount: null })), null);
  assert.equal(savingsObjective(project({ target_amount: 0 })), null);
});

test("épargne — un projet qui n'est plus actif quitte la rotation", () => {
  for (const status of ["done", "paused", "onhold"]) {
    assert.equal(savingsObjective(project({ status })), null, status);
  }
  assert.ok(savingsObjective(project({ status: "active" })));
});

test("épargne — pointe vers sa fiche", () => {
  const o = savingsObjective(project({ id: "xyz" }));
  assert.equal(o?.href, "/projets/xyz");
  assert.equal(o?.id, "project:xyz");
});

// ── la rotation ────────────────────────────────────────────────────────────

test("rotation — les budgets en danger passent devant tout le reste", () => {
  const items = buildObjectives(
    [
      budget({ id: "calme", category: { name: "Loisirs" }, spent: 10_000 }),
      budget({ id: "chaud", category: { name: "Transport" }, spent: 99_000 }),
    ],
    [project({ id: "presque", allocated_amount: 99_000 })],
  );
  assert.equal(items[0]?.id, "budget:chaud");
  assert.equal(items[0]?.urgent, true);
  // L'épargne à 99 % ne double PAS le budget calme par urgence, seulement par
  // avancement — elle reste derrière le budget rouge.
  assert.deepEqual(
    items.map((i) => i.id),
    ["budget:chaud", "project:presque", "budget:calme"],
  );
});

test("rotation — mêmes entrées, même ordre à chaque montage", () => {
  const b = [
    budget({ id: "b", category: { name: "Zèbre" }, spent: 20_000 }),
    budget({ id: "a", category: { name: "Abeille" }, spent: 20_000 }),
  ];
  const once = buildObjectives(b, []).map((i) => i.id);
  const twice = buildObjectives([...b].reverse(), []).map((i) => i.id);
  assert.deepEqual(once, twice);
  assert.deepEqual(once, ["budget:a", "budget:b"]);
});

test("rotation — les projets sans cible ne comptent pas comme objectifs", () => {
  const items = buildObjectives([], [project({ target_amount: null })]);
  assert.deepEqual(items, []);
});

test("rotation — une liste absente donne un bandeau vide, pas un écran blanc", () => {
  // Le Dashboard est l'écran d'accueil : une réponse inattendue de /api/budgets
  // ne doit pas l'emporter tout entier.
  assert.deepEqual(buildObjectives(undefined, undefined), []);
  assert.deepEqual(buildObjectives(null, null), []);
  assert.deepEqual(buildObjectives([budget()], undefined).length, 1);
  assert.deepEqual(buildObjectives(undefined, [project()]).length, 1);
});
