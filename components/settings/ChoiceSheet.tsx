"use client";

import { CheckIcon } from "@/components/nav/icons";

/**
 * The picker a "value" row opens (artboard `Lot 9`, "Sélecteur de devise +
 * toast"): a title, one line saying the change applies at once, and the closed
 * list of options with a description under each. No footer and no confirm
 * button — the tap *is* the decision, which is what "Écriture immédiate" means;
 * the caller writes and shows the toast.
 */
export function ChoiceSheet<T extends string>({
  title,
  hint,
  options,
  value,
  onSelect,
  onClose,
  closeLabel,
}: {
  title: string;
  hint: string;
  options: { value: T; label: string; description: string }[];
  value: T;
  onSelect: (next: T) => void;
  onClose: () => void;
  closeLabel: string;
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
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-t-[var(--radius-content-top)] bg-surface-page px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-5 shadow-[0_30px_60px_rgba(2,4,24,0.5)] sm:rounded-[var(--radius-content-top)] sm:pb-5">
        <h2 className="t-section-title">{title}</h2>
        <p className="mt-1 t-secondary text-text-secondary">{hint}</p>

        <ul className="mt-4 flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li key={o.value} className="border-b border-surface-hairline last:border-b-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(o.value)}
                  className="flex min-h-[var(--row-setting)] w-full items-center justify-between gap-3 py-2 text-left"
                >
                  <span className="flex flex-col">
                    <span className="text-[16px] font-semibold">{o.label}</span>
                    <span className="t-secondary text-text-secondary">{o.description}</span>
                  </span>
                  {selected ? (
                    <CheckIcon width={18} height={18} className="shrink-0 text-brand-accent" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
