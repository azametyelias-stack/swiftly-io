"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Buttons of the transaction sheet (Lot 3 dc.html): a full-inversion primary,
 * a light "Retour/Annuler" ghost, and a destructive variant. Radius 999.
 */
export function SheetButton({
  variant = "primary",
  children,
  className = "",
  ...rest
}: {
  variant?: "primary" | "ghost" | "danger";
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] text-[15px] font-semibold transition-transform active:scale-[0.975] motion-reduce:active:scale-100 disabled:pointer-events-none disabled:opacity-50";
  const skin =
    variant === "primary"
      ? "bg-action-primary text-action-on-primary shadow-[0_12px_26px_-8px_rgba(4,6,30,0.46)]"
      : variant === "danger"
        ? "bg-semantic-out text-ink-on-surface shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--semantic-out)_60%,transparent)]"
        : "border border-surface-rail bg-surface-card text-text-primary";
  return (
    <button {...rest} className={`${base} ${skin} ${className}`}>
      {children}
    </button>
  );
}
