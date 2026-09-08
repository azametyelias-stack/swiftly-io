/**
 * The balance-curve engine, shared by the dashboard's `BalanceCurve` (night
 * panel) and the Statistiques `StatCurve` (light card). Both used to compute
 * their own scale and their own path, and had drifted apart: the stats one read
 * the raw data min/max with an unsigned `formatCompact`, so a balance that went
 * negative showed positive-looking labels and a curve pinned to the bottom of
 * its box, while the dashboard already handled it. Elias: "je veux que le
 * graphique affiche les mêmes données dans les deux pages".
 *
 * Import-free and pure so it can be unit-tested with `node --test`.
 */

/** Round away from zero to a "nice" 1 / 2 / 2.5 / 5 × 10ⁿ step, for an axis edge. */
export function niceCeil(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

export interface CurveScale {
  /** Top of the axis — 0 when every value is ≤ 0. */
  max: number;
  /** Bottom of the axis — 0 when every value is ≥ 0, negative otherwise. */
  min: number;
  /** `max - min`, never 0 (so callers can divide by it). */
  span: number;
}

/**
 * Axis edges rounded outward from zero, independently above and below — never
 * the data's raw min/max. Anchoring on the raw min flattens a series against
 * the bottom of its box, and taking `niceCeil` of an all-negative range used to
 * collapse to a meaningless "1"; here a range that dips negative keeps real
 * negative room below zero.
 */
export function curveScale(values: number[]): CurveScale {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { max: 1, min: 0, span: 1 };
  const max = niceCeil(Math.max(0, ...finite));
  // `|| 0` normalises the `-0` that negating a zero produces — it formats fine
  // but leaks into tick values and compares unequal to 0 under Object.is.
  const min = -niceCeil(Math.max(0, -Math.min(0, ...finite))) || 0;
  return { max, min, span: max - min || 1 };
}

/** The five axis values, top to bottom, for a scale. */
export function curveTicks(scale: CurveScale): number[] {
  return [1, 0.75, 0.5, 0.25, 0].map((f) => scale.min + f * scale.span);
}

/**
 * Signed compact axis label: `-12 700` → "-13 K", `0` → "0". `formatCompact`
 * is deliberately unsigned (it also labels magnitudes elsewhere), so the sign
 * belongs here — the stats page was missing exactly this.
 */
export function axisLabel(v: number, formatCompact: (n: number) => string): string {
  return v < 0 ? `-${formatCompact(v)}` : formatCompact(v);
}

/**
 * Longueur maximale d'une poignée de Bézier, en unités du viewBox (les deux
 * graphiques partagent une zone de tracé d'environ 295 × 158 et 292 × 130).
 *
 * C'est la pièce qui manquait aux tentatives précédentes. La longueur standard
 * d'une poignée Hermite→Bézier est `dx/3` : sur un segment court c'est
 * parfait, mais sur un long segment — une journée avec quatre transactions —
 * elle atteint 90 px, et la courbure se répartit sur toute la longueur au lieu
 * de se concentrer là où il y a un angle. Résultat : des segments quasi droits
 * réunis par des virages secs, exactement ce qu'Elias voit au sommet de sa
 * courbe du 7 septembre. Plafonner la poignée transforme chaque jointure en
 * congé d'arrondi de taille constante : les longues portées restent droites
 * (leur pente est une information vraie), et les sommets s'arrondissent.
 */
export const SMOOTH_MAX_HANDLE = 24;

/**
 * A smooth spline through `(xs[i], ys[i])` as an SVG path — the rounded peaks
 * and troughs of the reference artboard, not the angular joins of a polyline.
 *
 * Deux règles seulement, et la seconde n'a de sens qu'avec `SMOOTH_MAX_HANDLE` :
 *
 * 1. **Sur une portée monotone, la sécante large** `(y[i+1] - y[i-1]) /
 *    (x[i+1] - x[i-1])`, bornée à `3 × min(|pente gauche|, |pente droite|)` —
 *    la condition de monotonie de Fritsch–Carlson, qui empêche la courbe de
 *    dépasser entre deux points. Deux variantes antérieures sont volontairement
 *    écartées : la moyenne des deux pentes adjacentes (un segment court et
 *    raide domine, la courbe part hors du cadre — ça a été livré une fois), et
 *    la sécante large non bornée (même problème, en plus discret).
 * 2. **Partout où la pente change de sens ou s'annule, tangente horizontale.**
 *    Un sommet, un creux, l'entrée ou la sortie d'un palier. C'est ce qui fait
 *    le dôme : sans ça la courbe arrive au sommet en pleine montée et doit
 *    pivoter d'un coup — l'angle qu'Elias a photographié le 7 septembre.
 *
 * La règle 2 avait déjà été essayée (Fritsch–Carlson) et rejetée : le sommet
 * s'étalait en plateau et les paliers se joignaient par des marches. Le rejet
 * portait en réalité sur la LONGUEUR DES POIGNÉES, pas sur la tangente. Avec
 * `dx/3` sur un segment d'une heure, une tangente nulle tient le tracé à plat
 * sur un tiers du segment ; plafonnée à `SMOOTH_MAX_HANDLE`, elle ne le tient
 * que quelques pixels et produit un congé d'arrondi. Vérifié en rendant le
 * module sur trois séries (journée réelle, mois à 30 points, paliers).
 *
 * Effet de bord voulu : le point culminant du dôme est la donnée elle-même. La
 * courbe ne dessine jamais un solde plus haut — ni plus bas — que celui qui a
 * existé, alors que la version d'avant dépassait volontairement le point pour
 * « faire rond ».
 *
 * Filet de sécurité géométrique en plus : chaque point de contrôle est ramené
 * dans `bounds`. Une Bézier cubique reste toujours dans l'enveloppe convexe de
 * ses quatre points de contrôle, et les deux extrémités sont des points de
 * données déjà dans la zone de tracé — donc borner les deux poignées garantit
 * que le tracé ne peut pas en sortir, quelles que soient les données.
 */
export function smoothPath(
  xs: number[],
  ys: number[],
  bounds?: { top: number; bottom: number },
): string {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return "";
  const at = (i: number) => `${xs[i]!.toFixed(1)} ${ys[i]!.toFixed(1)}`;
  if (n === 1) return `M ${at(0)}`;
  if (n === 2) return `M ${at(0)} L ${at(1)}`;

  const clampY = bounds
    ? (v: number) => Math.min(bounds.bottom, Math.max(bounds.top, v))
    : (v: number) => v;

  // Pente de chaque segment.
  const d = new Array<number>(n - 1);
  for (let i = 0; i < n - 1; i += 1) {
    const dx = xs[i + 1]! - xs[i]!;
    d[i] = dx === 0 ? 0 : (ys[i + 1]! - ys[i]!) / dx;
  }

  // Tangente (dy/dx) en chaque point — voir les trois règles ci-dessus.
  const m = new Array<number>(n);
  m[0] = d[0]!;
  m[n - 1] = d[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    const left = d[i - 1]!;
    const right = d[i]!;
    if (left * right <= 0) {
      // Règle 2 — sommet, creux, entrée ou sortie de palier.
      m[i] = 0;
    } else {
      // Règle 1 — sécante large, bornée.
      const dx = xs[i + 1]! - xs[i - 1]!;
      const wide = dx === 0 ? 0 : (ys[i + 1]! - ys[i - 1]!) / dx;
      const limit = 3 * Math.min(Math.abs(left), Math.abs(right));
      m[i] = Math.sign(wide) * Math.min(Math.abs(wide), limit);
    }
  }

  let path = `M ${at(0)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = Math.min((xs[i + 1]! - xs[i]!) / 3, SMOOTH_MAX_HANDLE);
    const c1x = xs[i]! + h;
    const c1y = clampY(ys[i]! + m[i]! * h);
    const c2x = xs[i + 1]! - h;
    const c2y = clampY(ys[i + 1]! - m[i + 1]! * h);
    path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${at(i + 1)}`;
  }
  return path;
}
