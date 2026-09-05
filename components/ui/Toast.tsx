"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The confirmation toast, used by every screen from Lot 3 on.
 *
 * Ink pill with a green dot, bottom-centre, three seconds — the Lot 8 artboard
 * is explicit that this is the app's one toast shape: "Un toast vert plein
 * largeur, comme le décrit la spec, serait le seul de ce genre dans l'app".
 * The full-green bar it used to be also spent `--semantic-in`, which means
 * "money in / goal reached" everywhere else, on a purely procedural "saved".
 * The green survives as the dot; the surface is ink, like the primary button.
 */
export function useToast(duration = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const show = useCallback((text: string) => {
    setMessage(text);
    setLeaving(false);
  }, []);

  useEffect(() => {
    if (!message) return;
    const outTimer = window.setTimeout(() => setLeaving(true), duration);
    const clearTimer = window.setTimeout(() => setMessage(null), duration + 300);
    return () => {
      window.clearTimeout(outTimer);
      window.clearTimeout(clearTimer);
    };
  }, [message, duration]);

  const node =
    message !== null ? (
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-[var(--radius-pill)] bg-action-primary px-5 py-3 text-[15px] font-semibold text-action-on-primary shadow-[0_12px_30px_-8px_rgba(4,6,30,0.5)] ${
          leaving ? "toast-fade" : "toast-rise"
        }`}
      >
        <span
          aria-hidden="true"
          className="size-2 flex-none rounded-full"
          style={{ backgroundColor: "var(--ink-in)" }}
        />
        {message}
      </div>
    ) : null;

  return { show, node };
}
