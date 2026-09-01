"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Minimal confirmation toast (SCREEN-22): bottom-centre, green, auto-dismiss 3s.
 */
export function useToast(duration = 3000) {
  const [message, setMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const show = useCallback(
    (text: string) => {
      setMessage(text);
      setLeaving(false);
    },
    [],
  );

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
        className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-sf-green px-6 py-4 text-sm font-medium text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] ${
          leaving ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        {message}
      </div>
    ) : null;

  return { show, node };
}
