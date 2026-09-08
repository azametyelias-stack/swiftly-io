import { test } from "node:test";
import assert from "node:assert/strict";

import {
  axisLabel,
  curveScale,
  curveTicks,
  niceCeil,
  smoothPath,
  SMOOTH_MAX_HANDLE,
} from "../../lib/dashboard/curve.ts";
import { formatCompact } from "../../lib/format/money.ts";

test("niceCeil rounds away from zero to a 1/2/2.5/5 × 10ⁿ step", () => {
  assert.equal(niceCeil(0), 0);
  assert.equal(niceCeil(-5), 0);
  assert.equal(niceCeil(1), 1);
  assert.equal(niceCeil(4200), 5000);
  assert.equal(niceCeil(182_900), 200_000);
  assert.equal(niceCeil(1_320_000), 2_000_000);
});

test("curveScale: all-positive range sits on 0, all-negative range hangs under it", () => {
  const up = curveScale([148_100, 182_900, 167_000]);
  assert.equal(up.min, 0);
  assert.equal(up.max, 200_000);

  // The old stats-page scale read the raw data min/max here, which flattened
  // the series against the bottom of its box.
  const down = curveScale([-26_000, -12_000, -3_500]);
  assert.equal(down.max, 0);
  assert.equal(down.min, -50_000);
  assert.ok(down.span > 0);
});

test("curveScale: a range crossing zero keeps room on both sides", () => {
  const s = curveScale([12_000, -2_000, 5_000]);
  assert.equal(s.max, 20_000);
  assert.equal(s.min, -2_000);
  assert.equal(s.span, 22_000);
});

test("curveScale: no finite values still yields a usable, non-zero span", () => {
  const s = curveScale([]);
  assert.ok(s.span > 0);
  assert.equal(curveScale([Number.NaN]).span > 0, true);
});

test("curveTicks: five values, top first, matching the scale edges", () => {
  const s = curveScale([0, 50_000]);
  const ticks = curveTicks(s);
  assert.equal(ticks.length, 5);
  assert.equal(ticks[0], s.max);
  assert.equal(ticks[4], s.min);
});

test("axisLabel keeps the sign that formatCompact drops", () => {
  // The stats page used bare formatCompact, so -13 000 read as "13 K".
  assert.equal(axisLabel(-12_700, formatCompact), "-13 K");
  assert.equal(axisLabel(0, formatCompact), "0");
  assert.equal(axisLabel(48_000, formatCompact), "48 K");
});

test("smoothPath: degenerate inputs", () => {
  assert.equal(smoothPath([], []), "");
  assert.equal(smoothPath([5], [7]), "M 5.0 7.0");
  assert.equal(smoothPath([0, 10], [0, 5]), "M 0.0 0.0 L 10.0 5.0");
});

test("smoothPath: uses cubic segments (round joins), one per interval", () => {
  const path = smoothPath([0, 10, 20, 30], [10, 4, 12, 6]);
  assert.ok(path.startsWith("M 0.0 10.0"));
  assert.equal((path.match(/C/g) ?? []).length, 3);
  assert.ok(path.endsWith("30.0 6.0"));
});

/** Sample a cubic Bézier path densely and return every y it passes through. */
function sampleYs(path: string): number[] {
  const nums = (s: string) => s.trim().split(/[\s,]+/).map(Number);
  const tokens = path.match(/[MC][^MC]*/g) ?? [];
  const ys: number[] = [];
  let cur: [number, number] = [0, 0];
  for (const tok of tokens) {
    const v = nums(tok.slice(1));
    if (tok[0] === "M") {
      cur = [v[0]!, v[1]!];
      ys.push(cur[1]);
      continue;
    }
    const [c1x, c1y, c2x, c2y, ex, ey] = v as [number, number, number, number, number, number];
    void c1x;
    void c2x;
    void ex;
    for (let i = 0; i <= 100; i += 1) {
      const t = i / 100;
      const u = 1 - t;
      ys.push(u ** 3 * cur[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ey);
    }
    cur = [ex, ey];
  }
  return ys;
}

test("smoothPath: bounded — the drawn curve never leaves the plot area", () => {
  // The exact shape that broke once on device: hour-axis points bunched at the
  // left with a long gap to the right. An unbounded spline shot off the top of
  // the chart and looped back down through itself.
  const top = 16;
  const bottom = 174;
  const xs = [4, 6, 9, 12, 299];
  const ys = [170, 30, 168, 32, 90];
  const ysDrawn = sampleYs(smoothPath(xs, ys, { top, bottom }));
  const lo = Math.min(...ysDrawn);
  const hi = Math.max(...ysDrawn);
  assert.ok(lo >= top - 0.001, `curve went above the plot area: ${lo} < ${top}`);
  assert.ok(hi <= bottom + 0.001, `curve went below the plot area: ${hi} > ${bottom}`);
});

/*
 * ─── Renversement assumé, 2026-09-07 ────────────────────────────────────────
 * Deux tests vivaient ici et disaient l'inverse des deux suivants : le sommet
 * devait « dépasser le point pour faire rond », et un palier devait « s'incurver
 * vers la montée ». Elias a photographié le résultat sur son dashboard du
 * 7 septembre : un sommet en angle. La cause était la longueur des poignées
 * (`dx/3` sur un long segment étale la courbure au lieu de la concentrer sur la
 * jointure), pas la tangente. `SMOOTH_MAX_HANDLE` corrige ça, et rend la
 * tangente horizontale aux extrema à nouveau tenable — c'est elle qui fait le
 * dôme. Rendu vérifié sur trois séries avant d'écrire ces tests.
 * ────────────────────────────────────────────────────────────────────────────
 */

test("smoothPath: un sommet est un dome dont le point culminant est la donnee", () => {
  const xs = [0, 40, 100];
  const ys = [100, 20, 60]; // y est inversé en SVG : l'index 1 est un sommet
  const drawn = sampleYs(smoothPath(xs, ys, { top: 0, bottom: 120 }));

  // Ni au-dessus du sommet, ni en dessous du plus bas des deux voisins : la
  // courbe ne dessine jamais un solde qui n'a pas existé.
  assert.ok(Math.min(...drawn) >= 20 - 0.001, "le trace ne doit pas depasser le sommet");
  assert.ok(Math.max(...drawn) <= 100 + 0.001, "ni descendre sous le point de depart");

  // Et c'est bien un dôme, pas un angle : juste avant et juste après le sommet,
  // la courbe est déjà retombée nettement moins vite qu'une droite ne le ferait.
  // Sur un angle, les deux échantillons voisins suivent les pentes brutes.
  const apex = drawn.indexOf(Math.min(...drawn));
  const before = drawn[apex - 8]!;
  const after = drawn[apex + 8]!;
  assert.ok(before - 20 < 8, `l'approche du sommet doit s'aplatir (${before})`);
  assert.ok(after - 20 < 8, `la sortie du sommet aussi (${after})`);
});

test("smoothPath: les poignees sont plafonnees, donc une longue portee reste droite", () => {
  // C'est LA correction du 2026-09-07. Sans plafond, la poignée d'un segment de
  // 270 px mesurerait 90 px et la courbure s'étalerait sur toute la portée.
  const path = smoothPath([0, 270, 300], [100, 20, 40], { top: 0, bottom: 120 });
  const first = /C ([\d.]+) [\d.]+, ([\d.]+) /.exec(path);
  assert.ok(first, "le premier segment doit etre une cubique");
  assert.ok(
    Number(first[1]) - 0 <= SMOOTH_MAX_HANDLE + 0.05,
    `poignee de sortie trop longue : ${first[1]}`,
  );
  assert.ok(
    270 - Number(first[2]) <= SMOOTH_MAX_HANDLE + 0.05,
    `poignee d'entree trop longue : ${first[2]}`,
  );
});

test("smoothPath: un palier reste plat, l'arrondi se fait dans le virage", () => {
  // La forme la plus courante d'un solde : plat entre deux transactions. Le
  // tracé ne doit RIEN inventer sur le palier — ni creux sous le palier, ni
  // renflement au-dessus — et arrondir seulement le coin.
  const drawn = sampleYs(smoothPath([0, 120, 130, 280], [40, 40, 100, 100], { top: 0, bottom: 120 }));
  assert.ok(Math.max(...drawn) <= 100 + 0.001, "aucun creux sous le palier bas");
  assert.ok(Math.min(...drawn) >= 40 - 0.001, "aucun renflement au-dessus du palier haut");

  // Le palier reste plat sur TOUTE sa longueur. C'est le point d'honnetete :
  // entre deux transactions le solde n'a pas bouge, la courbe non plus. La
  // version d'avant l'incurvait vers la transaction suivante, ce qui dessinait
  // un mouvement d'argent qui n'a jamais eu lieu.
  for (const v of drawn.slice(1, 102)) {
    assert.ok(Math.abs(v - 40) < 0.001, `le palier doit rester plat (${v})`);
  }

  // L'arrondi se fait donc entierement dans le segment de la transaction : il
  // quitte le palier a l'horizontale au lieu de partir droit. Une droite serait
  // a 46 au dixieme du segment ; la courbe doit etre nettement en dessous.
  const rise = drawn.slice(102, 203); // la portee 120→130
  assert.ok(rise[10]! < 44, `la sortie du palier doit s'arrondir (${rise[10]})`);
  assert.ok(rise.at(-1)! > 99, "et rejoindre le palier haut");
});

test("smoothPath: une serie dense reste lisse et ne depasse jamais", () => {
  // La vue « mois » : 30 points serrés qui montent et descendent. Ici dx/3 est
  // sous le plafond, donc le plafond ne joue pas — ce test garde le cas où
  // l'ancien comportement doit être préservé tel quel.
  const xs = Array.from({ length: 30 }, (_, i) => i * 10);
  const ys = Array.from({ length: 30 }, (_, i) => 60 + (i % 3 === 0 ? -25 : i % 3 === 1 ? 20 : 5));
  const drawn = sampleYs(smoothPath(xs, ys, { top: 0, bottom: 120 }));
  assert.ok(Math.min(...drawn) >= Math.min(...ys) - 0.001, "pas de depassement vers le haut");
  assert.ok(Math.max(...drawn) <= Math.max(...ys) + 0.001, "pas de depassement vers le bas");
});

test("smoothPath: a flat series stays flat (no invented wobble)", () => {
  const drawn = sampleYs(smoothPath([0, 25, 50, 75], [80, 80, 80, 80], { top: 0, bottom: 120 }));
  for (const v of drawn) assert.ok(Math.abs(v - 80) < 1e-9);
});
