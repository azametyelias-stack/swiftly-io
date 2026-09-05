"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ChevronLeftIcon } from "@/components/nav/icons";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * The shared "night header + rounded light sheet" screen shell used by
 * Historiques, Détails, Statistiques, Rapport, Aides. Fixed nuit.jpg background,
 * a back chevron, a centred title, an optional right action and an optional
 * band under the header (still on the night). The sheet scrolls; the background
 * stays put.
 */
export function NightScreen({
  title,
  right,
  belowHeader,
  errorTone = false,
  children,
  contentClassName = "",
}: {
  title: string;
  right?: ReactNode;
  belowHeader?: ReactNode;
  errorTone?: boolean;
  children: ReactNode;
  contentClassName?: string;
}) {
  const m = useMessages();
  const router = useRouter();

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-brand-deep">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: errorTone
            ? "linear-gradient(180deg, rgba(52,6,16,0.55) 0%, rgba(10,8,44,0.78) 100%)"
            : "linear-gradient(180deg, rgba(6,10,60,0.5) 0%, rgba(6,10,60,0.72) 100%)",
        }}
      />

      {/* pt = safe area: the status bar is translucent, so this row would sit
          under the clock without it. The two `fixed inset-0` layers above
          already reach the top edge, so the gradient flows behind the clock —
          which is the whole point of the translucent bar. */}
      <div className="relative flex flex-none items-center gap-2 px-2 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-ink-on-surface">
        <button
          type="button"
          aria-label={m.common.back}
          onClick={() =>
            window.history.length > 1 ? router.back() : router.push("/dashboard")
          }
          className="grid size-10 flex-none place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <span className="t-screen-title flex-1 truncate">{title}</span>
        <span className="flex flex-none items-center gap-2">{right}</span>
      </div>

      {belowHeader ? (
        <div className="relative flex-none px-4 pb-6 text-ink-on-surface">
          {belowHeader}
        </div>
      ) : null}

      <div
        className={`relative flex flex-1 flex-col rounded-t-[var(--radius-content-top)] bg-surface-page ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
