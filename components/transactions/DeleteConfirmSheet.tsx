"use client";

import { SheetButton } from "@/components/transactions/SheetButton";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";

/** "Supprimer cette transaction ?" (SCREEN-6 § 7, Lot 3 dc.html). */
export function DeleteConfirmSheet({
  label,
  amount,
  busy,
  onCancel,
  onConfirm,
}: {
  label: string;
  amount: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const m = useMessages();
  const t = m.transactions.confirmDelete;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label={t.cancel}
        onClick={onCancel}
        className="absolute inset-0 bg-[rgba(4,7,40,0.55)] backdrop-blur-[2px]"
      />
      <div className="relative m-4 w-full max-w-[420px] rounded-[var(--radius-content-top)] bg-surface-page p-6 shadow-[0_30px_60px_rgba(2,4,24,0.5)]">
        <div className="flex flex-col gap-1.5 text-center">
          <h2 className="text-[20px] font-semibold tracking-[-0.018em]">
            {t.title}
          </h2>
          <p className="t-body text-text-secondary">
            {interpolate(t.body, { label, amount })}
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <SheetButton
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
            disabled={busy}
          >
            {t.cancel}
          </SheetButton>
          <SheetButton
            variant="danger"
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {t.confirm}
          </SheetButton>
        </div>
      </div>
    </div>
  );
}
