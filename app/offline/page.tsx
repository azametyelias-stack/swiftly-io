import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hors ligne — Swiftly.io",
  description: "Swiftly.io n'a pas pu joindre le réseau.",
  robots: { index: false, follow: false },
};

/**
 * SCREEN "hors ligne" — served by `public/sw.js` for any navigation that cannot
 * reach the network.
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.4, which
 * asks explicitly for the Swiftly design system here rather than its own inline
 * sketch ("reprendre le design system Swiftly — couleurs navy, typo, logo").
 *
 * Three constraints shape this file, and they are why it does not look like the
 * other 22 screens:
 *
 *  1. **No client JS.** This page is displayed precisely when the network is
 *     gone. Next's hashed chunks may not be in the cache — a fresh install that
 *     never got a second controlled load has none of them — so anything that
 *     needs hydration would render as a blank screen. It is a Server Component,
 *     and what you read here is what the static HTML already contains.
 *  2. **No external stylesheet.** `globals.css` is hashed too, same risk. The
 *     styles are inline and self-contained; the values are copied from the
 *     design system rather than referenced (`--brand-accent` #152BC7, night base
 *     #05060F, Georgia logotype, pill button at `--size-primary-button` 56).
 *  3. **The identity zone, on purpose.** The night gradient never theme-flips
 *     (`DESIGN-HANDOFF` § Couleur), so this page is correct in light and dark
 *     without a single media query — and it is the same surface as SCREEN-01,
 *     which is what a user who just opened the app expects to see.
 *
 * FR/EN without JS: the boot script in `app/layout.tsx` sets `<html lang>` from
 * `sf-lang` before paint, so `:root[lang="en"]` swaps the copy in CSS.
 */
export default function OfflinePage() {
  return (
    <main className="sf-offline">
      <style>{OFFLINE_CSS}</style>

      <div className="sf-offline__inner">
        <span className="sf-offline__logo">Swiftly.io</span>

        <h1 className="sf-offline__title">
          <span data-lang="fr">Pas de connexion</span>
          <span data-lang="en">No connection</span>
        </h1>

        <p className="sf-offline__body">
          <span data-lang="fr">
            Swiftly n&apos;a pas pu joindre le réseau. Tes données sont intactes — elles
            vivent sur le serveur, pas sur cet écran. Reconnecte-toi et tout revient.
          </span>
          <span data-lang="en">
            Swiftly could not reach the network. Your data is untouched — it lives on the
            server, not on this screen. Get back online and everything returns.
          </span>
        </p>

        {/*
          eslint-disable-next-line @next/next/no-html-link-for-pages --
          `next/link` is a client component and a client-side navigation. This
          page exists for the case where the client runtime is not available,
          and a full document load is precisely the retry we want. A plain <a>
          is the behaviour, not a shortcut around it.
        */}
        <a className="sf-offline__button" href="/" id="sf-offline-retry">
          <span data-lang="fr">Réessayer</span>
          <span data-lang="en">Try again</span>
        </a>
      </div>

      {/*
        Progressive enhancement, nothing more. The link above already works with
        JS disabled (it navigates, and a navigation is what a retry is). When
        scripting is available, reload the URL the user actually asked for
        instead of sending them to the landing screen.

        Compile-time constant, no interpolation, nothing user-supplied — same
        shape as LANG_BOOT_SCRIPT in app/layout.tsx.
      */}
      {/* nosemgrep: swiftly-no-dangerously-set-inner-html */}
      <script dangerouslySetInnerHTML={{ __html: RETRY_SCRIPT }} />
    </main>
  );
}

const RETRY_SCRIPT = `(function(){var a=document.getElementById('sf-offline-retry');
if(a){a.addEventListener('click',function(e){e.preventDefault();location.reload()})}})()`;

const OFFLINE_CSS = `
/* z-index 100: above the consent sheet (z-50) and the install sheet (z-30),
   both of which the root layout keeps rendering here. Offline is a system
   state that owns the viewport — and neither of those offers is actionable
   without a network anyway. */
.sf-offline{
  position:fixed; inset:0; z-index:100; display:flex; align-items:flex-end;
  background:radial-gradient(125% 85% at 50% 4%, #0E1875 0%, #0A1466 26%, #070A2E 58%, #05060F 92%);
  color:#FFFFFF;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Helvetica Neue",Helvetica,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.sf-offline__inner{
  display:flex; flex-direction:column; gap:16px; width:100%; max-width:460px;
  margin:0 auto; padding:96px 24px max(48px, env(safe-area-inset-bottom));
}
.sf-offline__logo{
  font-family:Georgia,"Times New Roman",serif; font-size:26px; letter-spacing:-0.015em;
}
.sf-offline__title{
  margin:8px 0 0; font-size:34px; font-weight:600; line-height:1.06;
  letter-spacing:0.005em; text-transform:uppercase;
}
.sf-offline__body{
  margin:0; max-width:340px; font-size:15px; line-height:1.45; color:rgba(255,255,255,0.7);
}
.sf-offline__button{
  display:flex; align-items:center; justify-content:center;
  height:56px; margin-top:16px; border-radius:999px;
  background:#152BC7; color:#FFFFFF; text-decoration:none;
  font-size:17px; font-weight:600; letter-spacing:-0.01em;
  transition:transform 180ms cubic-bezier(0.23,1,0.32,1);
}
.sf-offline__button:active{ transform:scale(0.97); }
@media (prefers-reduced-motion:reduce){
  .sf-offline__button{ transition:none; }
  .sf-offline__button:active{ transform:none; }
}
.sf-offline [data-lang="en"]{ display:none; }
:root[lang="en"] .sf-offline [data-lang="en"]{ display:inline; }
:root[lang="en"] .sf-offline [data-lang="fr"]{ display:none; }
`;
