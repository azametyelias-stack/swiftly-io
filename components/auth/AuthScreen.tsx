"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ChevronLeftIcon } from "@/components/nav/icons";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * Shared shell for SCREEN-2 and SCREEN-3 (Lot 1 visual § "Système" — the two are
 * the same screen, only the field changes): night identity band + back chevron +
 * centred "Connexion", then a light sheet pulled up 24 px over the band
 * (radius 28 — the only depth cue in the lot).
 *
 * The identity band never theme-flips (always --brand-deep / --ink-*).
 */

interface AuthScreenProps {
  heading: string;
  help: ReactNode;
  /** Field + submit button. */
  children: ReactNode;
  /** e.g. the "Je n'ai pas de code" link. */
  footer?: ReactNode;
  /** Where the back chevron goes. Defaults to `router.back()`. */
  backTo?: string;
}

export function AuthScreen({
  heading,
  help,
  children,
  footer,
  backTo,
}: AuthScreenProps) {
  const m = useMessages();
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-field">
      <div
        className="flex-none bg-brand-deep bg-cover bg-center pb-6 text-ink-on-surface"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      >
        <div style={{ height: "env(safe-area-inset-top)" }} />
        <div className="flex h-14 items-center px-1">
          <button
            type="button"
            onClick={() => (backTo ? router.push(backTo) : router.back())}
            aria-label={m.common.back}
            className="grid size-11 place-items-center text-ink-on-surface transition-transform active:scale-[0.94] motion-reduce:active:scale-100"
          >
            <ChevronLeftIcon />
          </button>
          <span className="t-section-title flex-1 text-center">{m.auth.title}</span>
          <span className="size-11" aria-hidden="true" />
        </div>
      </div>

      <div className="-mt-6 flex-1 rounded-t-[var(--radius-content-top)] bg-surface-field px-6 pt-5 pb-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.018em] text-text-primary">
              {heading}
            </h1>
            <p className="t-body text-text-secondary" aria-live="polite">
              {help}
            </p>
          </div>
          {children}
        </div>
        {footer ? <div className="mt-8 flex justify-center">{footer}</div> : null}
      </div>
    </div>
  );
}
