"use client";

import type { ReactNode } from "react";

/**
 * The transaction modal sheet (Lot 3 dc.html — "une seule feuille"): a blurred
 * night backdrop with a centred light card, radius 28. Shared by the type
 * picker, every wizard step and the success screen.
 */
export function TxSheet({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-brand-deep p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/brand/nuit.jpg)",
          filter: "blur(16px) saturate(1.05)",
          transform: "scale(1.14)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,40,0.7) 0%, rgba(4,7,40,0.86) 100%)",
        }}
      />
      <div className="relative w-full max-w-[420px] rounded-[var(--radius-content-top)] bg-surface-page p-6 text-text-primary shadow-[0_30px_60px_rgba(2,4,24,0.5)]">
        {children}
      </div>
    </div>
  );
}
