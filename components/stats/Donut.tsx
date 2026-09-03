"use client";

import type { ReactNode } from "react";

/**
 * A donut chart (SCREEN-11 § 5, BUILD-PLAN "donut"). Hand-rolled SVG, no chart
 * lib. Segments are drawn as dash-offset arcs. One scale per chart — the caller
 * resolves the colours (a category hue, or a ramp from `rampColor`).
 */

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

const SIZE = 184;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Blue ramp for expenses, green ramp for income (Lot 4 dc.html). */
export function rampColor(index: number, kind: "expense" | "income"): string {
  const expense = ["#0A1466", "#2F6BE0", "#7FA0F0", "#C3CFF7", "#DDE4F9"];
  const income = ["#00522E", "#1DA55E", "#7FD3A4", "#B9E7CE", "#D9F2E4"];
  const ramp = kind === "income" ? income : expense;
  return ramp[Math.min(index, ramp.length - 1)]!;
}

export function Donut({
  segments,
  children,
}: {
  segments: DonutSegment[];
  children?: ReactNode;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  let offset = 0;

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--surface-rail)"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          segments.map((s) => {
            const len = (Math.max(0, s.value) / total) * C;
            const el = (
              <circle
                key={s.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 m-auto flex size-[128px] flex-col items-center justify-center gap-0.5 rounded-full bg-surface-card text-center">
        {children}
      </div>
    </div>
  );
}
