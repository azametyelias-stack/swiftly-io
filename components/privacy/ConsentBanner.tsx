"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useConsent } from "@/components/privacy/ConsentProvider";

/**
 * SCREEN-19 — the consent sheet. Reconciled onto Swiftly's grammar for Lot 6
 * (artboard `Swiftly - Lot 8 Privacy.dc.html`); it used to be a web cookie
 * banner in a borrowed skin, and the artboard says why that mattered: this is
 * the first thing a new user sees, before their balance — "s'il ressemble à un
 * bandeau de cookies emprunté à un autre produit, il apprend que Swiftly n'est
 * pas un lieu sérieux pour son argent".
 *
 * Four decisions carried over from the artboard, each of which changed the code:
 *  - a bottom-fixed banner becomes a rising sheet with a 26 radius, like every
 *    other sheet since Lot 5;
 *  - "Accepter tout" is BLACK, not blue. Black is Swiftly's action colour since
 *    Lot 2; blue is links and active switches only, and giving it a primary
 *    button would open a second action hierarchy across the whole app;
 *  - both buttons carry the same visual weight — same height, same full width,
 *    stacked. A shrunken or grey "Personnaliser" is a disguised refusal, and
 *    GDPR compliance rests precisely on the choice being equally easy both ways;
 *  - no close affordance. The doc says "sticky jusqu'à action"; closing without
 *    choosing would leave consent in an undefined state.
 *
 * The balance stays visible behind, dimmed: the sheet is a step, not a wall.
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
      <div
        className="fixed inset-0 z-40 bg-[rgba(4,7,40,0.55)] backdrop-blur-[2px]"
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        aria-describedby="consent-desc"
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-[var(--radius-sheet-top)] bg-surface-page shadow-[0_-20px_50px_rgba(2,4,24,0.45)] ${
          closing ? "sheet-fall" : "sheet-rise"
        }`}
      >
        <div className="mx-auto flex max-w-[460px] flex-col gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
          {/* Decorative handle — the sheet does not drag away (see above). */}
          <span
            aria-hidden="true"
            className="mx-auto h-1 w-9 flex-none rounded-full bg-surface-rail"
          />

          <h2 id="consent-title" className="t-section-title">
            Politique de confidentialité
          </h2>
          <p id="consent-desc" className="t-body text-text-secondary">
            Nous collectons certaines données pour améliorer ton expérience :
            email, téléphone, historique des transactions.
          </p>
          <Link
            href="/privacy"
            className="t-body font-semibold text-brand-accent underline underline-offset-2"
          >
            Voir la politique complète
          </Link>

          <div className="mt-1 flex flex-col gap-2.5">
            <button
              ref={acceptRef}
              type="button"
              onClick={handleAccept}
              className="flex h-[var(--size-primary-button)] w-full items-center justify-center rounded-[var(--radius-pill)] bg-action-primary text-[17px] font-semibold text-action-on-primary transition-transform active:scale-[0.975] motion-reduce:active:scale-100"
            >
              Accepter tout
            </button>
            <button
              type="button"
              onClick={() => router.push("/privacy-settings")}
              className="flex h-[var(--size-primary-button)] w-full items-center justify-center rounded-[var(--radius-pill)] border border-surface-rail bg-surface-card text-[17px] font-semibold text-text-primary transition-transform active:scale-[0.975] motion-reduce:active:scale-100"
            >
              Personnaliser
            </button>
          </div>

          <p className="text-center t-secondary text-text-tertiary">
            Les données essentielles au fonctionnement de l&apos;app sont
            toujours collectées.
          </p>
        </div>
      </div>
    </>
  );
}
