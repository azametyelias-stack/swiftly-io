"use client";

import { useState } from "react";

import { CloseIcon } from "@/components/nav/icons";

/**
 * One-line "create it right here" input used by the transaction pickers
 * (SCREEN-8/9 § 2) — a person, a project or a category created without leaving
 * the wizard. Name only; anything else is edited later on its own screen.
 */
export function QuickCreateRow({
  placeholder,
  confirmLabel,
  cancelLabel,
  onCancel,
  onSubmit,
}: {
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  /** resolve true when the create succeeded (the row then clears + closes) */
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const value = name.trim();
    if (value.length < 1 || busy) return;
    setBusy(true);
    const done = await onSubmit(value);
    setBusy(false);
    if (done) setName("");
  };

  return (
    <div className="flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="h-11 flex-1 rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-3 text-[15px] outline-none focus:border-brand-accent"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || name.trim().length < 1}
        className="h-11 flex-none rounded-[var(--radius-pill)] bg-brand-accent px-4 text-[14px] font-semibold text-ink-on-surface disabled:opacity-50"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label={cancelLabel}
        className="grid size-11 flex-none place-items-center rounded-[var(--radius-pill)] text-text-tertiary"
      >
        <CloseIcon width={16} height={16} />
      </button>
    </div>
  );
}
