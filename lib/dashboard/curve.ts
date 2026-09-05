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
 * A smooth spline through `(xs[i], ys[i])` as an SVG path — the rounded peaks
 * and troughs of the reference artboard, not the angular joins of a polyline.
 *
 * Tangents are the *wide secant* through each point's two neighbours,
 * `(y[i+1] - y[i-1]) / (x[i+1] - x[i-1])` (a Catmull-Rom tangent). Two earlier
 * attempts are deliberately not used here:
 *  - averaging the two adjacent segment slopes — a short steep segment's slope
 *    dominates and the curve shoots off the chart (this actually shipped once);
 *  - Fritsch–Carlson monotone cubic — provably bounded, but it forces the
 *    tangent to 0 at every local extremum, which lands the curve flat onto each
 *    peak and trough. That is what made the result read as angular shelves
 *    rather than the round arcs of the design.
 * The wide secant is naturally moderate on uneven spacing (our hour axis bunches
 * several transactions together and leaves long gaps) and lets the curve arc
 * slightly past a peak, which is precisely what makes it look round.
 *
 * Safety is handled geometrically instead: every Bézier control point is
 * clamped into `bounds`. A cubic Bézier always stays inside the convex hull of
 * its four control points, and the two endpoints are data points already inside
 * the plot area — so clamping the two handles guarantees the drawn curve can
 * never leave the plot area, whatever the data does.
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

  // Tangent (dy/dx) at each point.
  const m = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    const prev = i === 0 ? 0 : i - 1;
    const next = i === n - 1 ? n - 1 : i + 1;
    const dx = xs[next]! - xs[prev]!;
    m[i] = dx === 0 ? 0 : (ys[next]! - ys[prev]!) / dx;
  }

  // 1/3 of the segment is the standard Hermite→Bézier handle length; TENSION
  // shortens it slightly so the arcs stay elegant instead of ballooning.
  const TENSION = 0.86;
  let path = `M ${at(0)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = (xs[i + 1]! - xs[i]!) / 3;
    const c1x = xs[i]! + h;
    const c1y = clampY(ys[i]! + m[i]! * h * TENSION);
    const c2x = xs[i + 1]! - h;
    const c2y = clampY(ys[i + 1]! - m[i + 1]! * h * TENSION);
    path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${at(i + 1)}`;
  }
  return path;
}
