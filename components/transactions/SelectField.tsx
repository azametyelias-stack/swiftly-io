"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon, PlusIcon } from "@/components/nav/icons";

/**
 * The 52px selector field of the transaction sheet (Lot 3 dc.html — "champ 14",
 * "sélecteur 52"): a value + chevron button that reveals an option list.
 * Used for Date, Catégorie, Lié à and the transfer destination account.
 *
 * The list opens as an ABSOLUTE overlay on top of whatever is below — it never
 * pushes the following fields down (SCREEN-8/9 feedback). When `onCreate` is
 * given, a "+ Créer …" button is pinned to the bottom of the panel and stays
 * visible while the options scroll.
 */

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  disabledLabel?: string;
}

export function SelectField({
  value,
  options,
  onSelect,
  placeholder,
  invalid = false,
  ariaLabel,
  onCreate,
}: {
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  ariaLabel: string;
  /** pinned "+ Créer …" action at the bottom of the open panel */
  onCreate?: { label: string; run: () => void };
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={[
          "flex h-[52px] items-center justify-between gap-3 rounded-[var(--radius-icon)] border bg-surface-card px-4 text-[15px] font-medium",
          invalid
            ? "border-semantic-out shadow-[0_0_0_3px_color-mix(in_srgb,var(--semantic-out)_12%,transparent)]"
            : "border-surface-rail",
          current ? "text-text-primary" : "text-text-tertiary",
        ].join(" ")}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={[
            invalid ? "text-semantic-out" : "text-text-primary",
            open ? "rotate-180" : "",
            "transition-transform",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-30 flex max-h-[280px] flex-col overflow-hidden rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card shadow-[0_12px_32px_rgba(4,6,30,0.16)]">
          <ul
            role="listbox"
            className="flex-1 overflow-y-auto overscroll-contain py-1"
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  disabled={o.disabled}
                  onClick={() => {
                    if (o.disabled) return;
                    onSelect(o.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[15px]",
                    o.disabled
                      ? "cursor-not-allowed text-text-quaternary"
                      : o.value === value
                        ? "font-semibold text-text-primary"
                        : "text-text-secondary",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{o.label}</span>
                    {o.sublabel ? (
                      <span className="t-secondary text-text-tertiary">
                        {o.sublabel}
                      </span>
                    ) : null}
                  </span>
                  {o.disabled && o.disabledLabel ? (
                    <span className="t-secondary flex-none font-semibold text-semantic-out">
                      {o.disabledLabel}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {options.length === 0 ? (
              <li className="px-4 py-2.5 text-[15px] text-text-tertiary">—</li>
            ) : null}
          </ul>

          {onCreate ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onCreate.run();
              }}
              className="flex flex-none items-center gap-1.5 border-t border-surface-divider bg-surface-card px-4 py-3 text-left text-[14px] font-semibold text-brand-accent"
            >
              <PlusIcon width={14} height={14} />
              {onCreate.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
