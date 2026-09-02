"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The Lot 1 onboarding button — brand-blue pill, height 56, one shape across
 * screens 01/02/03 (Lot 1 visual § "Quatre pièces"). Press: scale 0.97 over
 * --dur-toggle. Loading: spinner + label, input locked.
 *
 * The canonical black PrimaryButton for the other 21 screens is built in Lot 2
 * (the "parts store"). This one stays local to onboarding.
 */

interface AuthButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  loading?: boolean;
  loadingLabel?: ReactNode;
  children: ReactNode;
}

export function AuthButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  type = "button",
  ...rest
}: AuthButtonProps) {
  const locked = disabled || loading;

  return (
    <button
      type={type}
      disabled={locked}
      aria-busy={loading || undefined}
      className={[
        "flex h-[var(--size-primary-button)] w-full items-center justify-center gap-2.5",
        "rounded-[var(--radius-pill)] text-[17px] font-semibold tracking-[-0.01em]",
        "transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-standard)]",
        "active:scale-[0.97] motion-reduce:active:scale-100",
        locked
          ? "cursor-not-allowed bg-surface-control-off text-text-tertiary"
          : "bg-brand-accent text-ink-on-surface",
      ].join(" ")}
      {...rest}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="size-[18px] animate-spin rounded-full border-2 border-ink-on-surface/30 border-t-ink-on-surface motion-reduce:animate-none"
          />
          <span className="text-ink-on-surface/85">{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
