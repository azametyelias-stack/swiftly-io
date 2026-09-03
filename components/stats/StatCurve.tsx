"use client";

import { useEffect, useRef } from "react";

/**
 * Light-theme balance curve for the Statistiques "Vue d'ensemble" (SCREEN-11
 * § 4). Same progressive-draw idea as the dashboard's BalanceCurve, but green on
 * white with a Y scale. Hand-rolled SVG, no chart lib.
 */

const W = 300;
const H = 150;
const PAD = { top: 12, right: 4, bottom: 8, left: 4 };
const DRAW_MS = 1400;

interface CurvePoint {
  date: string;
  balance: number;
}

export function StatCurve({
  points,
  yLabels,
}: {
  points: CurvePoint[];
  yLabels?: string[];
}) {
  const pathRef = useRef<SVGPathElement>(null);

  const safe = points.length > 0 ? points : [{ date: "", balance: 0 }];
  const values = safe.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, Math.abs(max) || 1);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (safe.length <= 1 ? innerW / 2 : (i / (safe.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;

  const linePath =
    safe.length === 1
      ? `M ${x(0)} ${y(values[0]!)} L ${PAD.left + innerW} ${y(values[0]!)}`
      : safe
          .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.balance).toFixed(1)}`)
          .join(" ");
  const areaPath = `${linePath} L ${PAD.left + innerW} ${PAD.top + innerH} L ${PAD.left} ${PAD.top + innerH} Z`;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = reduce ? "0" : `${len}`;
    if (reduce) return;
    const raf = requestAnimationFrame(() => {
      el.style.transition = `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.32,0.72,0,1)`;
      el.style.strokeDashoffset = "0";
    });
    return () => cancelAnimationFrame(raf);
  }, [linePath]);

  const gridYs = [0, 0.5, 1].map((f) => PAD.top + innerH - f * innerH);

  return (
    <div className="flex items-stretch gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block flex-1 overflow-visible"
      >
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={gy}
            y2={gy}
            stroke="var(--surface-hairline)"
            strokeWidth={1}
          />
        ))}
        <defs>
          <linearGradient id="sf-stat-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--semantic-in)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--semantic-in)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#sf-stat-fill)" />
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="var(--semantic-in)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {yLabels && yLabels.length > 0 ? (
        <div className="flex flex-col justify-between py-1 text-right text-[9px] font-semibold tabular text-text-tertiary">
          {yLabels.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
