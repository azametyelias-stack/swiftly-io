"use client";

import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/nav/icons";

/**
 * The small pill dropdown used for the account selector and the period selector
 * on the dashboard night zone (SCREEN-4 § 3). Light-weight: no portal, closes on
 * outside click or Escape.
 */

export interface DropdownOption {
  value: string;
  label: string;
}

export function MoneyDropdown({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value) ?? options[0];

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
    <div ref={root} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-[var(--radius-pill)] border border-white/20 bg-white/10 px-3 text-[13px] font-semibold text-ink-on-surface"
      >
        {current?.label}
        <ChevronDownIcon width={14} height={14} />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-30 mt-1.5 min-w-[160px] overflow-hidden rounded-[14px] border border-surface-divider bg-surface-elev py-1 shadow-[0_12px_32px_rgba(4,6,30,0.28)]"
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-[14px] ${
                  o.value === value
                    ? "font-semibold text-text-primary"
                    : "text-text-secondary"
                }`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
