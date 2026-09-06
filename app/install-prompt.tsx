"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useConsent } from "@/components/privacy/ConsentProvider";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * "Ajouter à l'écran d'accueil".
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.6.
 *
 * Two platforms, two mechanics:
 *  - Chromium fires `beforeinstallprompt`, which we hold onto so the invitation
 *    appears in Swiftly's own sheet grammar instead of the browser's mini-bar.
 *  - Safari on iOS fires nothing and exposes no API, so there the sheet is the
 *    three manual steps and nothing more. Showing a dead button there would be
 *    worse than showing no button.
 *
 * It stays out of the way: nothing when the app is already installed
 * (`display-mode: standalone`), nothing while the consent sheet is still up —
 * that one is an `alertdialog`, and stacking an offer on top of a legal choice
 * is how you get an accidental "Accepter tout" — and nothing again once
 * dismissed on this device.
 *
 * The device facts below are read through `useSyncExternalStore`, the same
 * idiom as `lib/settings/theme` and `useMessages`: each snapshot is a boolean,
 * so it stays stable, the server render is stated rather than guessed, and
 * nothing has to be corrected with a `setState` after mount.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "sf-install-dismissed";
const DISMISS_EVENT = "sf:install-dismissed";

/** A fact that cannot change while the page is open — nothing to subscribe to. */
const noop = () => () => {};

/* — is the app already installed? — */

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void): () => void {
  const media = window.matchMedia?.(STANDALONE_QUERY);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}

function readStandalone(): boolean {
  return (
    window.matchMedia?.(STANDALONE_QUERY).matches ||
    // Safari's own flag — an older iOS launched from the home screen matches no
    // display-mode at all.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/* — has this device already said "plus tard"? — */

function subscribeDismissed(onChange: () => void): () => void {
  window.addEventListener(DISMISS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DISMISS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    // Private window / blocked site data — treat as "not dismissed". The sheet
    // is closable either way, it just will not stay closed.
    return false;
  }
}

function readIsIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

/** Persist the refusal and notify every subscriber above. */
function dismiss(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* ignore — the event below still hides it for this session */
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export function InstallPrompt() {
  const m = useMessages();
  const { ready, hasDecision } = useConsent();

  // Server snapshots are the "show nothing" answers: the sheet appears after
  // hydration or not at all, which is also what keeps the markup matching.
  const standalone = useSyncExternalStore(subscribeStandalone, readStandalone, () => true);
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  const isIOS = useSyncExternalStore(noop, readIsIOS, () => false);

  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      // Suppress Chrome's own mini-infobar; the sheet below replaces it.
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      dismiss();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* the event is single-use; either way it is spent */
    }
    setDeferred(null);
    dismiss();
  }, [deferred]);

  if (standalone || dismissed) return null;
  if (!ready || !hasDecision) return null; // the consent sheet owns the screen first
  if (!deferred && !isIOS) return null; // no mechanism to offer

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      aria-describedby="install-desc"
      className="sheet-rise fixed inset-x-0 bottom-0 z-30 rounded-t-[var(--radius-sheet-top)] bg-surface-elev shadow-[0_-20px_50px_rgba(2,4,24,0.45)]"
    >
      <div className="mx-auto flex max-w-[460px] flex-col gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
        <span
          aria-hidden="true"
          className="mx-auto h-1 w-9 flex-none rounded-full bg-surface-rail"
        />

        <h2 id="install-title" className="t-section-title text-text-primary">
          {m.pwa.title}
        </h2>
        <p id="install-desc" className="t-body text-text-secondary">
          {m.pwa.body}
        </p>

        {deferred ? (
          <button
            type="button"
            onClick={install}
            className="flex h-[var(--size-primary-button)] w-full items-center justify-center rounded-[var(--radius-pill)] bg-action-primary text-[17px] font-semibold tracking-[-0.01em] text-action-on-primary transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-standard)] active:scale-[0.97] motion-reduce:active:scale-100"
          >
            {m.pwa.install}
          </button>
        ) : (
          <>
            <p className="t-secondary text-text-secondary">{m.pwa.iosHow}</p>
            <ol className="flex flex-col gap-2">
              {[m.pwa.iosStep1, m.pwa.iosStep2, m.pwa.iosStep3].map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="t-label grid size-6 flex-none place-items-center rounded-full bg-surface-field text-text-secondary"
                  >
                    {i + 1}
                  </span>
                  <span className="t-body text-text-primary">
                    {i === 0 ? (
                      <>
                        <ShareIcon /> {step}
                      </>
                    ) : (
                      step
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        <button
          type="button"
          onClick={dismiss}
          className="flex h-[var(--size-list-button)] w-full items-center justify-center rounded-[var(--radius-pill)] bg-surface-control-off text-[17px] font-semibold tracking-[-0.01em] text-text-primary transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-standard)] active:scale-[0.97] motion-reduce:active:scale-100"
        >
          {m.pwa.later}
        </button>
      </div>
    </div>
  );
}

/** iOS Share glyph — the button the first step points at. */
function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="var(--stroke-svg)"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-1 inline-block size-[18px] align-[-3px] text-brand-accent"
    >
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
