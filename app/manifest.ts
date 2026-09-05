import type { MetadataRoute } from "next";

import { PWA } from "@/lib/pwa/config";

/**
 * The web app manifest (`/manifest.webmanifest`).
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.1.
 *
 * Next builds this into a static route at build time; nothing here reads the
 * request, so it stays cacheable and the service worker can precache it.
 *
 * Colours (voir `lib/pwa/config.ts` pour les valeurs) :
 *  - `background_color` = the night navy the app actually paints first. The
 *    splash screen is shown before React runs, and the first screen after it is
 *    SCREEN-01's full-bleed night gradient — same colour, no flash between them.
 *  - `theme_color` is the *fallback* for the system bar. Once a page is loaded,
 *    Chrome prefers `<meta name="theme-color">`, which the `viewport` export
 *    writes pre-paint and `ThemeColorMeta` keeps in sync with the applied
 *    theme — that is what stops the status bar from clashing with a dark app
 *    (règle 2 : cohérence avec le thème réellement appliqué).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: PWA.name,
    short_name: PWA.shortName,
    description: PWA.description,
    lang: "fr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: PWA.backgroundColor,
    theme_color: PWA.manifestThemeColor,
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
