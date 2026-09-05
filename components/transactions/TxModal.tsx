"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { TxSurfaceContext } from "@/components/transactions/TxSheet";

const EXIT_MS = 280; // keep in sync with --dur-sheet

/**
 * The overlay that wraps an intercepted `/transactions/...` route (SCREEN-8/9,
 * design `08-creer-modifier-depense`). The screen you came from stays mounted
 * behind, blurred + dimmed; a centred card fades/rises in and reverses on close,
 * then the route is popped so the browser lands exactly where it was.
 *
 * Hard load / refresh of the same URL renders the full-page route instead — this
 * component is never on that path.
 */
export function TxModal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const close = useCallback(
    (path?: string) => {
      if (closing) return;
      setClosing(true);
      exitTimer.current = setTimeout(() => {
        if (path) {
          router.push(path);
        } else if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }, EXIT_MS);
    },
    [closing, router],
  );

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  const open = shown && !closing;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={() => close()}
        className="absolute inset-0 cursor-default bg-[rgba(4,7,40,0.5)] backdrop-blur-[8px] transition-opacity duration-200 motion-reduce:transition-none"
        style={{ opacity: open ? 1 : 0 }}
      />
      <div
        className="relative max-h-[88dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain transition-[transform,opacity] duration-[var(--dur-sheet)] ease-[var(--ease-emphasized)] motion-reduce:transition-none"
        style={{
          opacity: open ? 1 : 0,
          transform: open
            ? "translateY(0) scale(1)"
            : "translateY(12px) scale(0.98)",
        }}
      >
        <TxSurfaceContext.Provider value={{ variant: "modal", close }}>
          {children}
        </TxSurfaceContext.Provider>
      </div>
    </div>
  );
}
