"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useConsent } from "@/components/privacy/ConsentProvider";

/**
 * SCREEN-20 — Consent banner.
 * Fixed to the bottom with a dimming backdrop, sticky until the user acts.
 * Shown only when no consent decision exists for the current policy version.
 */
export function ConsentBanner() {
  const { ready, hasDecision, acceptAll } = useConsent();
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const acceptRef = useRef<HTMLButtonElement>(null);

  // Visible until a decision exists — but keep rendering through the close
  // animation (acceptAll() flips hasDecision synchronously).
  const visible = ready && !hidden && (!hasDecision || closing);

  useEffect(() => {
    if (visible && !closing) acceptRef.current?.focus();
  }, [visible, closing]);

  if (!visible) return null;

  function handleAccept() {
    setClosing(true);
    acceptAll();
    window.setTimeout(() => setHidden(true), 300);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-sf-border bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] ${
          closing ? "animate-consent-out" : "animate-consent-in"
        }`}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 p-4 sm:p-6">
          <h2
            id="consent-title"
            className="text-base font-semibold text-sf-ink sm:text-lg"
          >
            🔒 Politique de Confidentialité
          </h2>
          <p id="consent-desc" className="text-sm leading-relaxed text-sf-muted">
            Nous collectons certaines données pour améliorer ton expérience
            (email, téléphone, historique des transactions).{" "}
            <Link
              href="/privacy"
              className="font-medium text-sf-blue underline underline-offset-2 hover:text-sf-blue-dark"
            >
              Voir la politique complète →
            </Link>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <button
              ref={acceptRef}
              type="button"
              onClick={handleAccept}
              aria-label="Accepter la politique de confidentialité"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sf-blue px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-sf-blue-dark hover:shadow-[0_4px_12px_rgba(37,99,235,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sf-blue active:translate-y-0 active:bg-sf-blue-darker sm:px-8 sm:py-3"
            >
              ✅ Accepter tout
            </button>
            <button
              type="button"
              onClick={() => router.push("/privacy-settings")}
              aria-label="Personnaliser les paramètres de cookies"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d1d5db] bg-sf-surface px-6 py-2.5 text-sm font-semibold text-sf-ink transition-all hover:-translate-y-0.5 hover:border-[#9ca3af] hover:bg-sf-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sf-blue active:translate-y-0 sm:px-8 sm:py-3"
            >
              ⚙️ Personnaliser
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
