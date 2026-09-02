"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  CONSENT_COOKIE,
  CONSENT_EVENT,
  CONSENT_MAX_AGE,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  DEFAULT_CATEGORIES,
  hasCurrentDecision,
  parseStoredConsent,
  withEssential,
  type ConsentAction,
  type ConsentCategories,
  type StoredConsent,
} from "@/lib/privacy/consent";
import { log } from "@/lib/log/logger";

interface ConsentContextValue {
  /** Current category state (defaults until a decision is made). */
  categories: ConsentCategories;
  /** The stored decision, or null if none for the current version. */
  decision: StoredConsent | null;
  /** True once the client has hydrated (avoids an SSR flash of the banner). */
  ready: boolean;
  /** True when a decision exists for the current policy version. */
  hasDecision: boolean;
  acceptAll: () => void;
  reject: () => void;
  /** Persist an explicit set of categories (from /privacy-settings). */
  save: (
    next: Partial<ConsentCategories>,
    action?: Extract<ConsentAction, "customize" | "update">,
  ) => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

/** Subscribe to consent changes: same-tab custom event + cross-tab storage event. */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeCookie(value: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(value)}` +
    `; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
}

function endpointFor(action: ConsentAction): string {
  return action === "update"
    ? "/api/privacy/update-consent"
    : "/api/privacy/consent";
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const decision = useMemo<StoredConsent | null>(() => {
    const stored = parseStoredConsent(raw);
    return hasCurrentDecision(stored) ? stored : null;
  }, [raw]);

  const commit = useCallback(
    (categoriesInput: Partial<ConsentCategories>, action: ConsentAction) => {
      const categories = withEssential(categoriesInput);
      const stored: StoredConsent = {
        categories,
        version: CONSENT_VERSION,
        action,
        updatedAt: new Date().toISOString(),
      };

      // Local write first — the UX must not wait on the network.
      try {
        window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
      } catch {
        /* private mode / storage disabled — cookie still carries the decision */
      }
      writeCookie(JSON.stringify(stored));
      // Drives useSyncExternalStore in this tab (storage event only fires elsewhere).
      window.dispatchEvent(
        new CustomEvent<ConsentCategories>(CONSENT_EVENT, { detail: categories }),
      );

      void fetch(endpointFor(action), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories, action }),
        keepalive: true,
      }).catch((err) => {
        log.warn("privacy.consent_post_failed_client", { action, err });
      });
    },
    [],
  );

  const acceptAll = useCallback(
    () =>
      commit(
        { essential: true, analytics: true, marketing: true, location: false },
        "accept_all",
      ),
    [commit],
  );

  const reject = useCallback(
    () =>
      commit(
        { essential: true, analytics: false, marketing: false, location: false },
        "reject",
      ),
    [commit],
  );

  const save = useCallback<ConsentContextValue["save"]>(
    (next, action = "update") => commit(next, action),
    [commit],
  );

  const value = useMemo<ConsentContextValue>(
    () => ({
      categories: decision?.categories ?? DEFAULT_CATEGORIES,
      decision,
      ready,
      hasDecision: hasCurrentDecision(decision),
      acceptAll,
      reject,
      save,
    }),
    [decision, ready, acceptAll, reject, save],
  );

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within <ConsentProvider>");
  }
  return ctx;
}
