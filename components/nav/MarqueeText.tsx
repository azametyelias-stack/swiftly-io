"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows `text` on one line. If it does not fit its box, it scrolls continuously
 * (marquee) instead of truncating with "…" (SCREEN-05 § 4). When it fits — or
 * under `prefers-reduced-motion` — it is static (and then truncates with "…").
 */
export function MarqueeText({ text, className }: { text: string; className?: string }) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [scroll, setScroll] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const check = () =>
      setScroll(!reduced.matches && measure.scrollWidth > box.clientWidth + 1);

    check();
    const ro = new ResizeObserver(check);
    ro.observe(box);
    reduced.addEventListener("change", check);
    return () => {
      ro.disconnect();
      reduced.removeEventListener("change", check);
    };
  }, [text]);

  // ~40px/s feels right; clamp so short overflows still read.
  const duration = Math.max(6, Math.round(text.length * 0.28));

  return (
    <span
      ref={boxRef}
      className={`relative block overflow-hidden whitespace-nowrap ${className ?? ""}`}
    >
      <span ref={measureRef} aria-hidden className="invisible absolute left-0 whitespace-nowrap">
        {text}
      </span>

      {scroll ? (
        <span
          className="inline-flex gap-8"
          style={{ animation: `nav-marquee ${duration}s linear infinite` }}
        >
          <span className="whitespace-nowrap">{text}</span>
          <span aria-hidden className="whitespace-nowrap">
            {text}
          </span>
        </span>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </span>
  );
}
