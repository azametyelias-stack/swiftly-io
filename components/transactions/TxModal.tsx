"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { CloseIcon } from "@/components/nav/icons";
import { TxSurfaceContext } from "@/components/transactions/TxSheet";

const EXIT_MS = 280; // keep in sync with --dur-sheet

/**
 * The overlay that wraps an intercepted `/transactions/...` route (SCREEN-8/9
 * feedback). The screen you came from stays mounted behind, blurred + dimmed;
 * the sheet slides up from the bottom and slides back down on close, then the
 * route is popped so the browser lands exactly where it was.
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

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    exitTimer.current = setTimeout(() => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/dashboard");
      }
    }, EXIT_MS);
  }, [closing, router]);

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
      className="fixed inset-0 z-[60] flex flex-col items-center justify-end"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={close}
        className="absolute inset-0 cursor-default bg-[rgba(4,7,40,0.5)] backdrop-blur-[8px] transition-opacity duration-200 motion-reduce:transition-none"
        style={{ opacity: open ? 1 : 0 }}
      />
      <div
        className="relative max-h-[92dvh] w-full max-w-[440px] overflow-y-auto overscroll-contain transition-transform duration-[var(--dur-sheet)] ease-[var(--ease-emphasized)] motion-reduce:transition-none"
        style={{ transform: open ? "translateY(0)" : "translateY(100%)" }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-surface-card/85 text-text-secondary shadow-sm"
        >
          <CloseIcon width={16} height={16} />
        </button>
        <TxSurfaceContext.Provider value={{ variant: "modal", close }}>
          {children}
        </TxSurfaceContext.Provider>
      </div>
    </div>
  );
}
