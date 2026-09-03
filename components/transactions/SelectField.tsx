"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/nav/icons";

/**
 * The 52px selector field of the transaction sheet (Lot 3 dc.html — "champ 14",
 * "sélecteur 52"): a value + chevron button that reveals an inline option list.
 * Used for Date, Catégorie, Lié à and the transfer destination account.
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
}: {
  value: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
  ariaLabel: string;
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
          className={invalid ? "text-semantic-out" : "text-text-primary"}
        />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="z-20 max-h-64 overflow-y-auto overscroll-contain rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card py-1 shadow-[0_12px_32px_rgba(4,6,30,0.16)]"
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
        </ul>
      ) : null}
    </div>
  );
}
