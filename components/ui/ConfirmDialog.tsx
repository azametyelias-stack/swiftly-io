"use client";

import { SheetButton } from "@/components/transactions/SheetButton";

/** Generic yes/no confirmation dialog (delete a compte / budget / projet / template). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={onCancel}
        className="absolute inset-0 bg-[rgba(4,7,40,0.55)] backdrop-blur-[2px]"
      />
      <div className="relative m-4 w-full max-w-[420px] rounded-[var(--radius-content-top)] bg-surface-page p-6 shadow-[0_30px_60px_rgba(2,4,24,0.5)]">
        <div className="flex flex-col gap-1.5 text-center">
          <h2 className="text-[20px] font-semibold tracking-[-0.018em]">{title}</h2>
          <p className="t-body text-text-secondary">{body}</p>
        </div>
        <div className="mt-5 flex gap-3">
          <SheetButton variant="ghost" className="flex-1" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </SheetButton>
          <SheetButton
            variant={tone === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </SheetButton>
        </div>
      </div>
    </div>
  );
}
