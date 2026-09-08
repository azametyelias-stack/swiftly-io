import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * Les boutons de tête.
 *
 * Retour terrain du 2026-09-08 : « ils sont trop petits, j'arrive pas à trop les
 * voir ». Ils l'étaient de deux façons — un glyphe de 18 px dans les pastilles
 * de verre, et une cible de 40 px là où le handoff (§ Accessibilité) en demande
 * 44 minimum dans toutes les directions.
 *
 * Le vrai risque n'était pas la correction mais sa dispersion : la même pastille
 * est recopiée à la main dans dix fichiers (les trois en-têtes, et le bouton
 * d'action à droite de chaque écran intérieur). En corriger neuf laisse un
 * bouton dépareillé dans la même barre. Ces tests balaient donc TOUT
 * `components/` au lieu d'énumérer des fichiers connus : un écran ajouté demain
 * avec l'ancienne pastille échoue ici.
 *
 * Du React qu'un `node --test` ne monte pas : on vérifie la source, comme
 * `tests/pwa` le fait pour `sw.js`. Le rendu, lui, a été mesuré dans un vrai
 * Chrome (scratchpad/cdp-header.mjs) : 44×44 et glyphe 26×26 sur le dashboard,
 * l'AppHeader de Paramètres et le NightScreen de Templates.
 */

const root = new URL("../../", import.meta.url);
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, root)), "utf8");

/** La pastille de verre de la barre de tête, telle qu'elle est recopiée partout. */
const GLASS = /rounded-full border border-white\/20 bg-white\/10/;

const components = readdirSync(fileURLToPath(new URL("components", root)), {
  recursive: true,
  encoding: "utf8",
})
  .filter((f) => f.endsWith(".tsx"))
  .map((f) => `components/${f.split("\\").join("/")}`);

test("aucune pastille de tête n'est restée à 40 px", () => {
  const petites = components.filter((f) => {
    const source = read(f);
    return GLASS.test(source) && /\bsize-10\b[^"]*rounded-full border border-white\/20/.test(source);
  });
  assert.deepEqual(petites, [], "pastilles sous le minimum tactile de 44 px");
});

test("le glyphe de chaque pastille de tête est dessiné en 26", () => {
  // C'est le dessin, pas la cible, qu'Elias ne voyait pas : une zone d'appui
  // étendue n'agrandit rien à l'œil. On ne regarde que les trois lignes qui
  // suivent la pastille — le « + » posé à côté d'un libellé, dans le gros bouton
  // du bas, garde ses 18 et n'a rien à voir avec la barre.
  const fautifs: string[] = [];
  for (const f of components) {
    const lines = read(f).split("\n");
    lines.forEach((line, i) => {
      if (!GLASS.test(line)) return;
      const bloc = lines.slice(i + 1, i + 4).join("\n");
      const glyphe = bloc.match(/width=\{(\d+)\} height=\{(\d+)\}/);
      if (!glyphe) return; // pastille sans glyphe explicite : rien à dire
      if (glyphe[1] !== "26" || glyphe[2] !== "26") fautifs.push(`${f}:${i + 1} → ${glyphe[0]}`);
    });
  }
  assert.deepEqual(fautifs, []);
});

/** Les trois en-têtes nommés, pour que l'intention reste lisible. */
const HEADERS: { path: string; role: string; glyphs: string[] }[] = [
  {
    path: "components/nav/AppHeader.tsx",
    role: "Paramètres, Alertes",
    glyphs: ["MenuIcon", "ChevronLeftIcon", "BellIcon"],
  },
  {
    path: "components/dashboard/DashboardView.tsx",
    role: "dashboard, sur la photo de nuit",
    glyphs: ["MenuIcon", "BellIcon"],
  },
  {
    path: "components/ui/NightScreen.tsx",
    role: "tous les écrans intérieurs",
    glyphs: ["ChevronLeftIcon"],
  },
];

for (const { path, role, glyphs } of HEADERS) {
  const source = read(path);
  for (const glyph of glyphs) {
    test(`${path} — ${glyph} est dessiné en 26 (${role})`, () => {
      assert.ok(
        source.includes(`<${glyph} width={26} height={26} />`),
        `${glyph} doit être rendu en 26 dans l'en-tête`,
      );
      assert.ok(
        !new RegExp(`<${glyph} width=\{(?:1[0-9]|2[0-5])\}`).test(source),
        `${glyph} ne doit plus apparaître sous 26 dans cet en-tête`,
      );
    });
  }
}

test("AppHeader ne compte plus sur un pseudo-élément pour atteindre 44", () => {
  // Il les porte pour de vrai depuis le 2026-09-08 ; à 44 + inset-1 la zone
  // mordrait sur le titre voisin (gap-1).
  assert.ok(
    !read("components/nav/AppHeader.tsx").includes("after:-inset-1"),
    "zone d'appui étendue devenue inutile",
  );
});

test("le cale-titre de TransactionDetail suit la pastille d'en face", () => {
  // Cet écran centre son titre entre le bouton Retour et un espace vide de même
  // largeur. Si le cale reste à 40 pendant que le bouton passe à 44, le titre
  // se décale de 4 px vers la droite.
  const source = read("components/transactions/TransactionDetail.tsx");
  assert.ok(source.includes('<span className="size-11" />'));
  assert.ok(!source.includes('<span className="size-10" />'));
});
