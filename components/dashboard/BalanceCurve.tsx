"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { formatBalance, formatCompact, type CurrencyCode } from "@/lib/format/money";
import { formatClock } from "@/lib/format/date";
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
const DRAW_MS = 1400;
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

/** Round away from zero to a "nice" 1 / 2 / 2.5 / 5 × 10ⁿ step, for an axis edge. */
function niceCeil(v: number): number {
  if (v <= 0) return 0;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Signed compact axis label: `-12 700` → "-13 K", `0` → "0". */
function axisLabel(v: number): string {
  return v < 0 ? `-${formatCompact(v)}` : formatCompact(v);
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
  const pathRef = useRef<SVGPathElement>(null);
  const [marker, setMarker] = useState<number | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safePoints = points.length > 0 ? points : [{ date: "", balance: 0 }];
  const values = safePoints.map((p) => p.balance);
  const negative = values.at(-1)! < 0;
  const curveColor = negative ? CURVE_OUT : CURVE_IN;

  // Axis edges are rounded outward from 0, independently above and below —
  // never anchored at the data's raw min/max, so a range that dips negative
  // gets real negative labels instead of the ceiling collapsing to "1".
  const axisMax = niceCeil(Math.max(0, ...values));
  const axisMin = -niceCeil(Math.max(0, -Math.min(0, ...values)));
  const dataMin = axisMin;
  const span = axisMax - axisMin || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + innerH;

  // x of point i: hour-placed when it carries `at`, endpoints pinned, else even.
  const hourFrac = (iso: string) => {
    const d = new Date(iso);
    return Math.max(0, Math.min(1, (d.getHours() + d.getMinutes() / 60) / 24));
  };
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
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.balance).toFixed(1)}`)
          .join(" ");

  const areaPath = `${linePath} L ${PAD.left + innerW} ${baseY} L ${PAD.left} ${baseY} Z`;

  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((f) => ({
    v: dataMin + f * span,
    yPos: PAD.top + innerH - f * innerH,
  }));

  const timeLabels = hourAxis
    ? ["0h", "6h", "12h", "18h", "00h"]
    : (xLabels ?? []);

  // Progressive draw — measured length, animated via a CSS transition on mount.
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let len = 0;
    try {
      len = el.getTotalLength();
    } catch {
      return;
    }
    if (!Number.isFinite(len) || len <= 0) return;
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = reduce ? "0" : `${len}`;
    if (reduce) return;
    const raf = requestAnimationFrame(() => {
      el.style.transition = `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;
      el.style.strokeDashoffset = "0";
    });
    return () => cancelAnimationFrame(raf);
  }, [linePath]);

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

  const end = points.length - 1;

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
          <linearGradient id="sf-curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curveColor} stopOpacity="0.34" />
            <stop offset="55%" stopColor={curveColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={curveColor} stopOpacity="0" />
          </linearGradient>
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
              {axisLabel(t.v)}
            </text>
          </g>
          );
        })}

        <path d={areaPath} fill="url(#sf-curve-fill)" />
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke={curveColor}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* glowing endpoint */}
        {points.length > 1 ? (
          <>
            <circle cx={x(end)} cy={y(points[end]!.balance)} r={9} fill={curveColor} opacity={0.24} />
            <circle
              cx={x(end)}
              cy={y(points[end]!.balance)}
              r={4.5}
              fill="#05060F"
              stroke={curveColor}
              strokeWidth={2.5}
            />
          </>
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
