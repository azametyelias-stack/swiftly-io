import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  BANNER_ALERT_THEME,
  BANNER_THEMES,
  bannerTheme,
} from "../../lib/dashboard/bannerTheme.ts";

/*
 * La palette du bandeau « Objectif du mois », demandée par Elias le 2026-09-16 :
 * une couleur par position dans la rotation, « pour ne pas que tout ce
 * ressemble », le bleu d'abord et le vert ensuite.
 */

test("le premier objectif est bleu, le second vert — dans cet ordre", () => {
  assert.equal(bannerTheme(0).id, "blue");
  assert.equal(bannerTheme(1).id, "green");
});

test("la palette en garde d'autres en réserve", () => {
  // « Prépare beaucoup d'autres couleurs dans le code » : la troisième place et
  // les suivantes ne doivent pas retomber sur le bleu.
  assert.ok(BANNER_THEMES.length >= 8, "au moins huit teintes en réserve");
  const ids = new Set(BANNER_THEMES.map((t) => t.id));
  assert.equal(ids.size, BANNER_THEMES.length, "pas deux fois le même nom");
  const accents = new Set(BANNER_THEMES.map((t) => t.accent));
  assert.equal(accents.size, BANNER_THEMES.length, "pas deux fois la même teinte");
});

test("toutes les teintes sont des hex complets — `color-mix` n'accepte rien d'autre", () => {
  // Le rendu compose chaque couleur de la carte par `color-mix(in srgb, …)`.
  // Une valeur mal formée ne lève rien : la propriété est ignorée en silence et
  // la carte perd son fond.
  for (const t of [...BANNER_THEMES, BANNER_ALERT_THEME]) {
    assert.match(t.accent, /^#[0-9A-Fa-f]{6}$/, t.id);
  }
});

test("la rotation boucle au-delà de la palette", () => {
  const n = BANNER_THEMES.length;
  assert.equal(bannerTheme(n).id, "blue");
  assert.equal(bannerTheme(n + 1).id, "green");
  assert.equal(bannerTheme(2 * n + 2).id, BANNER_THEMES[2]!.id);
});

test("un index aberrant donne quand même une couleur", () => {
  // `activeIndex` est une valeur dérivée ramenée dans les bornes à la lecture ;
  // si elle dérapait, un thème `undefined` ferait une carte sans aucun fond —
  // pire qu'une mauvaise couleur.
  for (const bad of [-1, -13, NaN, Infinity, 1.5]) {
    const t = bannerTheme(bad);
    assert.ok(t && typeof t.accent === "string", String(bad));
  }
  assert.equal(bannerTheme(-1).id, BANNER_THEMES[BANNER_THEMES.length - 1]!.id);
});

test("un budget au rouge sort de la rotation", () => {
  /*
   * Le seuil de SCREEN-15 § 5 (92 %), celui qui déclenche aussi l'alerte
   * quotidienne. Si la rotation lui donnait sa couleur de position, un budget
   * sur le point d'être dépassé pourrait s'afficher en turquoise : le seul
   * signal visuel de dépassement du Dashboard disparaîtrait.
   */
  for (let i = 0; i < BANNER_THEMES.length + 3; i++) {
    assert.equal(bannerTheme(i, "red").id, "alert");
  }
  // Vert et orange, eux, gardent leur couleur de position : ce sont des états
  // ordinaires, et c'est tout l'objet de la variété demandée.
  assert.equal(bannerTheme(0, "green").id, "blue");
  assert.equal(bannerTheme(1, "orange").id, "green");
});

test("le rouge d'alerte n'est pas celui du fond clair", () => {
  // `--semantic-out` (#A80010) est calculé pour du texte sur fond clair. Sur la
  // nuit quasi noire de la carte, il devient illisible.
  assert.notEqual(BANNER_ALERT_THEME.accent.toUpperCase(), "#A80010");
});

/* ── le branchement dans la carte ────────────────────────────────────────── */

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");

test("la carte prend sa teinte de la POSITION, pas de la nature de l'objectif", () => {
  // Du React qu'un `node --test` ne monte pas : on vérifie la source, comme
  // `tests/dashboard/sticky-cta.test.ts`.
  const banner = read("components/dashboard/RotatingBanner.tsx");
  assert.match(banner, /bannerTheme\(activeIndex, active\.tone\)/);
  // La photo de sphères a été remplacée par le dessin vectoriel : elle figeait
  // le violet de la maquette, et il aurait fallu un fichier par couleur.
  assert.ok(!/objectif-spheres/.test(banner), "plus de fond photographique");
  assert.match(banner, /SummitArt/, "le massif au drapeau");
  assert.match(banner, /TargetArrowIcon/, "la cible fléchée");
});

test("le dessin suit la teinte au lieu de la figer", () => {
  const art = read("components/dashboard/ObjectiveArt.tsx");
  // Aucune couleur écrite en dur : tout arrive en propriété depuis `cardPaint`.
  assert.ok(
    !/#[0-9A-Fa-f]{3,8}\b/.test(art),
    "une couleur en dur dans le dessin ne suivrait pas la rotation",
  );
});
