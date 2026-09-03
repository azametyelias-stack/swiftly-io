"use client";

import type { ReactNode } from "react";

/**
 * The "sélection = bleu plein" button grid (Lot 3 dc.html): source account,
 * recurrence, status. One expression for a selected state — filled
 * `--brand-accent`, light inner border, blue halo. Never a bare border, never a
 * separate checkmark.
 */

export interface Choice {
  value: string;
  label: string;
  icon?: ReactNode;
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 2,
  ariaLabel,
}: {
  options: Choice[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 2 | 3;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`grid gap-3 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={[
              "flex h-12 items-center justify-center gap-2 rounded-[var(--radius-icon)] px-2 text-[14px] font-semibold transition-colors motion-reduce:transition-none",
              selected
                ? "border border-brand-accent/60 bg-brand-accent text-ink-on-surface shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand-accent)_18%,transparent)]"
                : "border border-surface-rail bg-surface-card text-text-tertiary",
            ].join(" ")}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
