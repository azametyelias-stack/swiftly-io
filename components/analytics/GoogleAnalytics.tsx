"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { useConsent } from "@/components/privacy/ConsentProvider";
import { CONSENT_EVENT, type ConsentCategories } from "@/lib/privacy/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type GtagArgs =
  | ["js", Date]
  | ["config", string]
  | ["consent", "default" | "update", Record<string, "granted" | "denied">];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function ensureGtag() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: GtagArgs) {
      window.dataLayer!.push(args);
    };
  }
}

function updateConsent(granted: boolean) {
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}

/**
 * Google Analytics with Consent Mode v2.
 *
 * - Consent defaults to DENIED before any tag loads.
 * - gtag.js is only injected once analytics consent is granted AND
 *   NEXT_PUBLIC_GA_ID is set. Without the id this component is inert.
 * - Grant / revoke from /privacy-settings flips consent live.
 */
export function GoogleAnalytics() {
  const { categories, ready } = useConsent();
  const [loadTag, setLoadTag] = useState(false);

  // Set the Consent Mode v2 default as early as possible.
  useEffect(() => {
    ensureGtag();
    window.gtag?.("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }, []);

  // React to consent: from context and from same-tab change events.
  useEffect(() => {
    if (!ready || !GA_ID) return;

    const apply = (granted: boolean) => {
      updateConsent(granted);
      if (granted) setLoadTag(true);
    };

    apply(categories.analytics);

    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentCategories>).detail;
      apply(detail?.analytics === true);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, [ready, categories.analytics]);

  if (!GA_ID || !loadTag) return null;

  return (
    <>
      <Script
        id="ga-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
