"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { useCurveDraw } from "@/components/dashboard/useCurveDraw";
import { axisLabel as signedAxisLabel, curveScale, curveTicks, smoothPath } from "@/lib/dashboard/curve";
import { formatBalance, formatCompact, type CurrencyCode } from "@/lib/format/money";
import { beninHourOfDay, formatClock } from "@/lib/format/date";
import { useLocale } from "@/lib/i18n/useMessages";
import type { Locale } from "@/lib/i18n";

/**
 * Balance curve (SCREEN-4 § 4, design `04-dashboard.png`). Hand-rolled SVG — no
 * chart lib. Right gutter carries five magnitude labels, the baseline carries
 * the time axis (hours for "Aujourd'hui", dates otherwise). On mount the line
 * draws itself over ~1400 ms; tap/drag shows a value bubble that fades after 3 s
 * while the marker stays. When the balance is negative the whole curve (line,
 * fill, endpoint, marker, bubble) switches to red — the axis is never anchored
 * at 0 anymore, it spans from the rounded ceiling above the highest point down
 * to the rounded floor below the lowest, so a negative range gets its own
 * negative labels instead of the ceiling collapsing to a meaningless "1".
 */

const W = 343;
const H = 196;
const PAD = { top: 16, right: 44, bottom: 22, left: 4 };
const DRAW_MS = 1800;
const BUBBLE_MS = 3000;

// The night panel never theme-flips (design system rule) — it's always dark,
// so these mirror --ink-in's invariance instead of the theme-aware
// --semantic-in/--semantic-out tokens.
const CURVE_IN = "#1DCF02";
const CURVE_OUT = "#FF6166";

interface CurvePoint {
  date: string;
  balance: number;
  at?: string;
}

export function BalanceCurve({
  points,
  currency = "XOF",
  hourAxis = false,
  xLabels,
}: {
  points: CurvePoint[];
  currency?: CurrencyCode;
  hourAxis?: boolean;
  /** time-axis labels for non-hour periods (dates); hour uses a fixed 0h…00h */
  xLabels?: string[];
}) {
  const locale = useLocale() as Locale;
  const uid = useId().replace(/:/g, "");
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGGElement>(null);
  const revealRef = useRef<SVGRectElement>(null);
  const [marker, setMarker] = useState<number | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safePoints = points.length > 0 ? points : [{ date: "", balance: 0 }];
  const values = safePoints.map((p) => p.balance);
  const negative = values.at(-1)! < 0;
  const curveColor = negative ? CURVE_OUT : CURVE_IN;

  // Scale + spline come from lib/dashboard/curve.ts, shared verbatim with the
  // Statistiques chart so both pages plot the same series the same way.
  const scale = curveScale(values);
  const dataMin = scale.min;
  const span = scale.span;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerH;

  // x of point i: hour-placed when it carries `at`, endpoints pinned, else even.
  // Bénin-fixed (not the viewing device's own timezone) — see beninHourOfDay:
  // the axis's day boundary is computed the same fixed-offset way server-side,
  // so a point's *position within* the day must agree with that, not with
  // whatever timezone the phone happens to be set to.
  const hourFrac = (iso: string) => Math.max(0, Math.min(1, beninHourOfDay(iso) / 24));
  const x = (i: number): number => {
    const p = points[i];
    if (hourAxis && p) {
      if (p.at) return PAD.left + hourFrac(p.at) * innerW;
      return i === 0 ? PAD.left : PAD.left + innerW;
    }
    if (points.length <= 1) return PAD.left + innerW / 2;
    return PAD.left + (i / (points.length - 1)) * innerW;
  };
  const y = (v: number) => PAD.top + innerH - ((v - dataMin) / span) * innerH;

  const linePath =
    points.length === 1
      ? `M ${x(0)} ${y(values[0]!)} L ${PAD.left + innerW} ${y(values[0]!)}`
      : smoothPath(
          points.map((_, i) => x(i)),
          points.map((p) => y(p.balance)),
          { top: PAD.top, bottom: baseY },
        );

  const areaPath = `${linePath} L ${PAD.left + innerW} ${baseY} L ${PAD.left} ${baseY} Z`;

  const yTicks = curveTicks(scale).map((v, i) => ({
    v,
    yPos: PAD.top + (i / 4) * innerH,
  }));

  // "00h" → "23h59", never "0h"/"00h" at both ends — those read as the same
  // instant looping back on itself (Elias: "ça commence de 0h à 0h").
  const timeLabels = hourAxis
    ? ["00h", "6h", "12h", "18h", "23h59"]
    : (xLabels ?? []);

  // Line, leading dot and area fill all advance together off one rAF loop.
  useCurveDraw({ pathRef, dotRef, revealRef, linePath, durationMs: DRAW_MS, width: W });

  useEffect(() => {
    return () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    };
  }, []);

  const pick = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < points.length; i += 1) {
      const d = Math.abs(x(i) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setMarker(best);
    setBubbleVisible(true);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubbleVisible(false), BUBBLE_MS);
  };

  return (
    <div className="relative -mx-1 h-[196px] flex-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        className="block touch-none overflow-visible"
        onPointerDown={pick}
        onPointerMove={(e) => e.buttons === 1 && pick(e)}
      >
        <defs>
          <linearGradient id={`sf-curve-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity="0.34" />
            <stop offset="55%" stopColor={curveColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={curveColor} stopOpacity="0" />
          </linearGradient>
          {/* Reveals the fill in step with the line — its width is driven by
              the same rAF loop, so the fill never runs ahead of the stroke. */}
          <clipPath id={`sf-curve-reveal-${uid}`}>
            <rect ref={revealRef} x={0} y={0} width={0} height={H} />
          </clipPath>
        </defs>

        {yTicks.map((t, i) => {
          const isBase = i === yTicks.length - 1;
          return (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={t.yPos}
              y2={t.yPos}
              stroke={isBase ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.13)"}
              strokeWidth={1}
              strokeDasharray={isBase ? undefined : "2 5"}
            />
            <text
              x={PAD.left + innerW + 8}
              y={t.yPos + 3}
              fill="rgba(255,255,255,0.55)"
              fontSize="10"
              fontWeight="600"
              letterSpacing="0.04em"
            >
              {signedAxisLabel(t.v, formatCompact)}
            </text>
          </g>
          );
        })}

        <g clipPath={`url(#sf-curve-reveal-${uid})`}>
          <path d={areaPath} fill={`url(#sf-curve-fill-${uid})`} />
        </g>
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={curveColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Glowing head of the line — rides along it during the draw (the rAF
            loop translates this group), and comes to rest on the last point. */}
        {points.length > 1 ? (
          <g
            ref={dotRef}
            style={{ opacity: 0 }}
            transform={`translate(${x(0)} ${y(points[0]!.balance)})`}
          >
            <circle r={9} fill={curveColor} opacity={0.24} />
            <circle r={4.5} fill="#05060F" stroke={curveColor} strokeWidth={2.5} />
          </g>
        ) : null}

        {marker !== null && points[marker] ? (
          <>
            <line
              x1={x(marker)}
              x2={x(marker)}
              y1={PAD.top}
              y2={baseY}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <circle
              cx={x(marker)}
              cy={y(points[marker]!.balance)}
              r={4}
              fill={curveColor}
              stroke="#05060F"
              strokeWidth={2}
            />
          </>
        ) : null}

        <g fill="rgba(255,255,255,0.58)" fontSize="10" fontWeight="600" letterSpacing="0.04em">
          {timeLabels.map((label, i) => {
            const f = timeLabels.length <= 1 ? 0 : i / (timeLabels.length - 1);
            return (
              <text
                key={i}
                x={PAD.left + f * innerW}
                y={baseY + 16}
                textAnchor={i === 0 ? "start" : i === timeLabels.length - 1 ? "end" : "middle"}
              >
                {label}
              </text>
            );
          })}
        </g>
      </svg>

      {marker !== null && bubbleVisible && points[marker] ? (
        <div
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5"
          style={{
            left: `${(x(marker) / W) * 100}%`,
            top: `${(y(points[marker]!.balance) / H) * 100}%`,
          }}
        >
          <span
            className="rounded-[9px] border px-2.5 py-1 text-[13px] font-bold tabular shadow-lg"
            style={{
              borderColor: `color-mix(in srgb, ${curveColor} 60%, transparent)`,
              backgroundColor: negative ? "#3a0505" : "#00351f",
              color: curveColor,
            }}
          >
            {formatBalance(points[marker]!.balance, currency)}
          </span>
          {points[marker]!.at ? (
            <span className="text-[10px] font-semibold text-ink-on-surface/55">
              {formatClock(points[marker]!.at!, locale)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
