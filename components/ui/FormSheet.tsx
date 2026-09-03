"use client";

import type { ReactNode } from "react";

import { CloseIcon } from "@/components/nav/icons";

/**
 * Bottom-anchored modal sheet for the Lot 5 create/edit forms (Comptes /
 * Templates / Budgets / Projets) and the project allocation sheet. Blurred night
 * backdrop, radius-28 top, scrollable body, sticky footer.
 */
export function FormSheet({
  title,
  onClose,
  footer,
  children,
  closeLabel = "Fermer",
}: {
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  closeLabel?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(4,7,40,0.55)] backdrop-blur-[2px]"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-t-[var(--radius-content-top)] bg-surface-page shadow-[0_30px_60px_rgba(2,4,24,0.5)] sm:rounded-[var(--radius-content-top)]">
        <div className="flex flex-none items-center justify-between border-b border-surface-hairline px-5 py-4">
          <h2 className="t-section-title">{title}</h2>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full border border-surface-rail text-text-secondary"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          {children}
        </div>

        <div className="flex flex-none gap-3 border-t border-surface-hairline px-5 py-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

/** Labelled field wrapper for the sheets. */
export function FieldRow({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">{label}</span>
        {hint ? (
          <span className="text-[12px] text-text-tertiary">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <span className="t-secondary text-semantic-out">{error}</span>
      ) : null}
    </div>
  );
}

/** Plain text input styled like `SelectField`'s trigger. */
export function TextField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  invalid = false,
  inputMode,
  multiline = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  invalid?: boolean;
  inputMode?: "text" | "numeric" | "decimal";
  multiline?: boolean;
}) {
  const cls = [
    "w-full rounded-[var(--radius-icon)] border bg-surface-card px-4 text-[15px] outline-none focus:border-brand-accent",
    invalid ? "border-semantic-out" : "border-surface-rail",
    multiline ? "h-24 resize-none py-3" : "h-[52px]",
  ].join(" ");
  return multiline ? (
    <textarea
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={500}
      className={cls}
    />
  ) : (
    <input
      aria-label={ariaLabel}
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={120}
      className={cls}
    />
  );
}
