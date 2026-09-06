"use client";

import { useEffect } from "react";

/**
 * Registers `public/sw.js`. Renders nothing.
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.3.
 *
 * Production only, and the dev branch actively *unregisters*. The doc suggests
 * testing with `next dev --experimental-https`, but a worker installed that way
 * keeps serving cache-first `/_next/static/*` back to a later `next dev`, where
 * those paths are not content-addressed — it looks exactly like "my edit did
 * nothing", and it survives until someone thinks to open DevTools. The local
 * equivalent is `npm run pwa:preview` (build + start on localhost, which browsers
 * treat as a secure origin), which is how this was verified.
 *
 * Registration waits for `load`: the service worker's `install` competes with
 * the page's own requests for bandwidth, and the page wins.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => void r.unregister()))
        .catch(() => {
          /* nothing to clean up */
        });
      return;
    }

    const register = () => {
      // `updateViaCache: "none"` — never let the HTTP cache answer for sw.js, so
      // a deploy reaches installed users on their next visit.
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* unsupported, blocked, or private window — the app works without it */
        });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
