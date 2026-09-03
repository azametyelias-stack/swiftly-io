"use client";

import { useEffect, useRef, useState } from "react";

import { formatMoney, type CurrencyCode } from "@/lib/format/money";

/**
 * The balance "compteur en vol" (SCREEN-4 § 3, Lot 2 motion: 900 ms, sortie
 * douce). On a value change the digits roll from the previous value to the new
 * one; `prefers-reduced-motion` jumps straight there. While `masked` the value
 * is hidden and never animates.
 *
 * All setState happens inside rAF callbacks — never synchronously in the effect.
 */

const DURATION_MS = 900;

export function Odometer({
  value,
  currency = "XOF",
  masked = false,
  className,
}: {
  value: number;
  currency?: CurrencyCode;
  masked?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    if (masked) {
      fromRef.current = value;
      return;
    }

    const from = fromRef.current;
    const to = value;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;

    if (from === to || reduce) {
      raf = requestAnimationFrame(() => {
        setDisplay(to);
        fromRef.current = to;
      });
    } else {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        setDisplay(from + (to - from) * eased);
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          fromRef.current = to;
        }
      };
      raf = requestAnimationFrame(step);
    }

    return () => cancelAnimationFrame(raf);
  }, [value, masked]);

  const text = masked
    ? formatMoney(0, { currency, masked: true })
    : formatMoney(Math.round(display), { currency, sign: "auto" });

  return (
    <span className={className} aria-label={masked ? "Montant masqué" : undefined}>
      {text}
    </span>
  );
}
