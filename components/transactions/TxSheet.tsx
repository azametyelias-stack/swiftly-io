"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The transaction surface (Lot 3 dc.html — "une seule feuille"). Shared by the
 * type picker, every wizard step and the success screen.
 *
 * Two presentations, chosen by `TxSurfaceContext`:
 *  - "page"  (default): a full-screen blurred night backdrop with a centred
 *    light card — used on a hard load / refresh of `/transactions/...`.
 *  - "modal": just the card — `TxModal` supplies the blurred backdrop over the
 *    screen you came from and the slide-up animation (SCREEN-8/9 feedback:
 *    "overlay, le fond reste derrière, la feuille monte du bas").
 */

export interface TxSurface {
  variant: "page" | "modal";
  /** present in "modal" — animate the sheet out, then leave the route */
  close?: () => void;
}

export const TxSurfaceContext = createContext<TxSurface>({ variant: "page" });

export function useTxSurface(): TxSurface {
  return useContext(TxSurfaceContext);
}

export function TxSheet({ children }: { children: ReactNode }) {
  const { variant } = useTxSurface();

  if (variant === "modal") {
    return (
      <div className="w-full rounded-[var(--radius-content-top)] bg-surface-page p-6 text-text-primary shadow-[0_30px_60px_rgba(2,4,24,0.5)]">
        {children}
      </div>
    );
  }

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
