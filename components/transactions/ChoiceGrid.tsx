"use client";

import type { ReactNode } from "react";

import { PlusIcon } from "@/components/nav/icons";

/**
 * The "sélection = bleu plein" button grid (Lot 3 dc.html): source account,
 * recurrence, status. One expression for a selected state — filled
 * `--brand-accent`, light inner border, blue halo. Never a bare border, never a
 * separate checkmark.
 *
 * `trailingAction` adds a dashed "+ …" cell after the options (SCREEN-8/9 slide 2
 * — "+ Nouveau" sits in the account grid).
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
  trailingAction,
}: {
  options: Choice[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 2 | 3;
  ariaLabel: string;
  trailingAction?: { label: string; onClick: () => void };
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
      {trailingAction ? (
        <button
          type="button"
          onClick={trailingAction.onClick}
          className="flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-icon)] border border-dashed border-surface-rail px-2 text-[14px] font-semibold text-brand-accent"
        >
          <PlusIcon width={14} height={14} />
          <span className="truncate">{trailingAction.label}</span>
        </button>
      ) : null}
    </div>
  );
}
