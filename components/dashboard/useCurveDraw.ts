"use client";

import { useEffect, type RefObject } from "react";

/**
 * Draws a balance curve in on mount (and again whenever the path changes, e.g.
 * after a transaction refreshes the dashboard).
 *
 * The line, the leading dot and the area fill are all driven from ONE
 * `requestAnimationFrame` loop off a single progress value, so they physically
 * cannot drift apart. The previous version animated only `stroke-dashoffset`
 * via a CSS transition and left the endpoint dot parked at its final position,
 * so the dot sat waiting while the line crawled towards it — Elias: "le point
 * rond reste figé au niveau attendu et c'est la ligne seulement qui bouge ;
 * je veux que le point et la ligne bougent ensemble".
 *
 * Honours `prefers-reduced-motion` by jumping straight to the finished state.
 */

/** Slow in, slow out — reads as deliberate rather than a snap. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function useCurveDraw({
  pathRef,
  dotRef,
  revealRef,
  linePath,
  durationMs,
  width,
}: {
  pathRef: RefObject<SVGPathElement | null>;
  /** Group holding the leading dot; translated along the path. */
  dotRef?: RefObject<SVGGElement | null>;
  /** Clip rect that reveals the area fill in step with the line. */
  revealRef?: RefObject<SVGRectElement | null>;
  linePath: string;
  durationMs: number;
  /** Full plot width, for the reveal rect. */
  width: number;
}): void {
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;

    let length = 0;
    try {
      length = path.getTotalLength();
    } catch {
      return; // jsdom / detached node — leave the static path as drawn
    }
    if (!Number.isFinite(length) || length <= 0) return;

    const place = (progress: number) => {
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length * (1 - progress)}`;
      const dot = dotRef?.current;
      const reveal = revealRef?.current;
      if (dot || reveal) {
        let x: number | null = null;
        try {
          const pt = path.getPointAtLength(length * progress);
          x = pt.x;
          dot?.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        } catch {
          /* same guard as above */
        }
        // The fill is revealed by x, not by arc length: a steep segment eats a
        // lot of length for very little width, and a length-based rect would
        // visibly lag behind the line there.
        if (reveal) reveal.setAttribute("width", `${x ?? width * progress}`);
      }
      if (dot) dot.style.opacity = progress > 0 ? "1" : "0";
    };

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      place(1);
      return;
    }

    let frame = 0;
    let startedAt = 0;
    const step = (now: number) => {
      if (startedAt === 0) startedAt = now;
      const t = Math.min(1, (now - startedAt) / durationMs);
      place(easeInOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    place(0);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [pathRef, dotRef, revealRef, linePath, durationMs, width]);
}
