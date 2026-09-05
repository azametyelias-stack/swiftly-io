import { test } from "node:test";
import assert from "node:assert/strict";

import {
  axisLabel,
  curveScale,
  curveTicks,
  niceCeil,
  smoothPath,
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

test("smoothPath: an asymmetric peak arcs past the point, it doesn't land flat", () => {
  // A monotone (Fritsch–Carlson) spline forces the tangent to 0 at every local
  // extremum, so the curve arrives flat and the peak reads as an angular shelf.
  // The design calls for a rounded arc, i.e. a little overshoot past the point.
  const xs = [0, 40, 100];
  const ys = [100, 20, 60]; // y is inverted in SVG: index 1 is a peak
  const drawn = sampleYs(smoothPath(xs, ys, { top: 0, bottom: 120 }));
  assert.ok(Math.min(...drawn) < 20, "peak should arc past the data point");
  assert.ok(Math.min(...drawn) > 0, "…but stay inside the plot area");
});

test("smoothPath: eases out of a flat run instead of shelving into the rise", () => {
  // The real shape of balance data: flat, then a transaction jumps it. A
  // monotone spline zeroes the tangent at every point next to a flat segment,
  // producing flat shelves joined by steep S-bends — the look Elias rejected.
  // Here the flat run must already be bowing towards the rise.
  const drawn = sampleYs(smoothPath([0, 30, 60, 90], [100, 100, 40, 40], { top: 0, bottom: 120 }));
  const firstSegment = drawn.slice(1, 102); // the 0→30 span
  const deviation = Math.max(...firstSegment.map((v) => Math.abs(v - 100)));
  assert.ok(deviation > 0.5, "the flat run should bend into the rise, not shelve into it");
  // The bend is a gentle wind-up, not a spike — and bounded like everything else.
  assert.ok(deviation < 12);
  assert.ok(Math.max(...drawn) <= 120.001);
});

test("smoothPath: a flat series stays flat (no invented wobble)", () => {
  const drawn = sampleYs(smoothPath([0, 25, 50, 75], [80, 80, 80, 80], { top: 0, bottom: 120 }));
  for (const v of drawn) assert.ok(Math.abs(v - 80) < 1e-9);
});
