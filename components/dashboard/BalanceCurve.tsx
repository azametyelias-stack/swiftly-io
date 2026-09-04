"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { formatBalance, type CurrencyCode } from "@/lib/format/money";

/**
 * Balance curve (SCREEN-4 § 4). Hand-rolled SVG — no chart lib. On mount the
 * line draws itself from start to now over ~1400 ms (stroke-dashoffset), replayed
 * whenever the parent changes its `key` (account / period / return from a tx).
 * Tap or drag shows a bubble with the exact value; the bubble fades after 3 s,
 * the marker stays (§ 4, "ce qui est temporaire est une information, ce qui
 * persiste est une position").
 */

const W = 343;
const H = 196;
const PAD = { top: 16, right: 8, bottom: 20, left: 8 };
const DRAW_MS = 1400;
const BUBBLE_MS = 3000;

interface CurvePoint {
  date: string;
  balance: number;
}

export function BalanceCurve({
  points,
  currency = "XOF",
}: {
  points: CurvePoint[];
  currency?: CurrencyCode;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const [marker, setMarker] = useState<number | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safePoints = points.length > 0 ? points : [{ date: "", balance: 0 }];
  const values = safePoints.map((p) => p.balance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, Math.abs(max) || 1);

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;

  const linePath =
    points.length === 1
      ? `M ${x(0)} ${y(values[0]!)} L ${PAD.left + innerW} ${y(values[0]!)}`
      : points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.balance).toFixed(1)}`)
          .join(" ");

  const areaPath = `${linePath} L ${PAD.left + innerW} ${PAD.top + innerH} L ${PAD.left} ${
    PAD.top + innerH
  } Z`;

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
      return; // some engines throw on a not-yet-laid-out path — skip the trace
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
    const i =
      points.length <= 1
        ? 0
        : Math.round(((px - PAD.left) / innerW) * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, i));
    setMarker(clamped);
    setBubbleVisible(true);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubbleVisible(false), BUBBLE_MS);
  };

  const gridYs = [0, 0.5, 1].map((f) => PAD.top + innerH - f * innerH);

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
        {gridYs.map((gy, i) => (
          <line
            key={i}
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={gy}
            y2={gy}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={1}
          />
        ))}

        <defs>
          <linearGradient id="sf-curve-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ink-in)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--ink-in)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#sf-curve-fill)" />
        <path
          ref={pathRef}
          d={linePath}
          fill="none"
          stroke="var(--ink-in)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {marker !== null && points[marker] ? (
          <>
            <line
              x1={x(marker)}
              x2={x(marker)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
            />
            <circle
              cx={x(marker)}
              cy={y(points[marker]!.balance)}
              r={4}
              fill="var(--ink-in)"
              stroke="#05060F"
              strokeWidth={2}
            />
          </>
        ) : null}
      </svg>

      {marker !== null && bubbleVisible && points[marker] ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[9px] border border-[color-mix(in_srgb,var(--ink-in)_60%,transparent)] bg-[#00351f] px-2.5 py-1 text-[13px] font-bold text-ink-in tabular shadow-lg transition-opacity duration-200"
          style={{
            left: `${(x(marker) / W) * 100}%`,
            top: `${(y(points[marker]!.balance) / H) * 100}%`,
          }}
        >
          {formatBalance(points[marker]!.balance, currency)}
        </div>
      ) : null}
    </div>
  );
}
