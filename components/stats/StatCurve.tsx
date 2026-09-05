"use client";

import { useId, useRef } from "react";

import { useCurveDraw } from "@/components/dashboard/useCurveDraw";
import { axisLabel, curveScale, curveTicks, smoothPath } from "@/lib/dashboard/curve";
import { formatCompact } from "@/lib/format/money";

/**
 * Balance curve for the Statistiques "Vue d'ensemble" (SCREEN-11 § 4).
 *
 * Same engine as the dashboard's `BalanceCurve` — `lib/dashboard/curve.ts` for
 * the scale, the ticks and the spline, `useCurveDraw` for the animation — only
 * the skin differs (light card instead of the night panel). They used to be two
 * separate implementations and had drifted: this one read the raw data min/max
 * and labelled it with an unsigned `formatCompact`, so a balance dipping to
 * −1 K / −2 K showed positive-looking labels while the dashboard showed the
 * real ones. Elias: "je veux que les mêmes données soient partagées dans les
 * deux pages". Keep them on the shared module rather than re-deriving anything
 * here.
 */

const W = 300;
const H = 150;
const PAD = { top: 12, right: 4, bottom: 8, left: 4 };
const DRAW_MS = 1800;

interface CurvePoint {
  date: string;
  balance: number;
}

export function StatCurve({ points }: { points: CurvePoint[] }) {
  const uid = useId().replace(/:/g, "");
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const revealRef = useRef<SVGRectElement>(null);

  const safe = points.length > 0 ? points : [{ date: "", balance: 0 }];
  const values = safe.map((p) => p.balance);
  const negative = values.at(-1)! < 0;
  const color = negative ? "var(--semantic-out)" : "var(--semantic-in)";

  const scale = curveScale(values);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerH;

  const x = (i: number) =>
    PAD.left + (safe.length <= 1 ? innerW / 2 : (i / (safe.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - scale.min) / scale.span) * innerH;

  const linePath =
    safe.length === 1
      ? `M ${x(0)} ${y(values[0]!)} L ${PAD.left + innerW} ${y(values[0]!)}`
      : smoothPath(
          safe.map((_, i) => x(i)),
          safe.map((p) => y(p.balance)),
          { top: PAD.top, bottom: baseY },
        );
  const areaPath = `${linePath} L ${PAD.left + innerW} ${baseY} L ${PAD.left} ${baseY} Z`;

  const ticks = curveTicks(scale);

  useCurveDraw({ pathRef, dotRef, revealRef, linePath, durationMs: DRAW_MS, width: W });

  return (
    <div className="flex items-stretch gap-2">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="block flex-1 overflow-visible">
        <defs>
          <linearGradient id={`sf-stat-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <clipPath id={`sf-stat-reveal-${uid}`}>
            <rect ref={revealRef} x={0} y={0} width={0} height={H} />
          </clipPath>
        </defs>

        {ticks.map((v, i) => {
          const gy = PAD.top + (i / (ticks.length - 1)) * innerH;
          const isZero = Math.abs(v) < 1e-9;
          return (
            <line
              key={i}
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={gy}
              y2={gy}
              stroke={isZero ? "var(--surface-divider)" : "var(--surface-hairline)"}
              strokeWidth={1}
            />
          );
        })}

        <g clipPath={`url(#sf-stat-reveal-${uid})`}>
          <path d={areaPath} fill={`url(#sf-stat-fill-${uid})`} />
        </g>
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {safe.length > 1 ? (
          <g ref={dotRef} style={{ opacity: 0 }} transform={`translate(${x(0)} ${y(values[0]!)})`}>
            <circle r={8} fill={color} opacity={0.2} />
            <circle r={4} fill="var(--surface-card)" stroke={color} strokeWidth={2.5} />
          </g>
        ) : null}
      </svg>

      <div className="flex flex-col justify-between py-1 text-right text-[9px] font-semibold tabular text-text-tertiary">
        {ticks.map((v, i) => (
          <span key={i}>{axisLabel(v, formatCompact)}</span>
        ))}
      </div>
    </div>
  );
}
