/**
 * The handful of constants the PWA pieces have to agree on.
 *
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md`, partie A.
 *
 * Three files describe the same install: `app/manifest.ts` (what the OS shows),
 * `public/sw.js` (what survives offline) and `lib/settings/boot-script.ts` (the
 * status-bar colour, written before the first paint). `sw.js` and the boot
 * script are plain strings that ship verbatim — no import can reach them — so
 * `tests/pwa/config.test.ts` asserts they still quote the values below rather
 * than trusting them to stay in step by hand.
 *
 * Pure and import-free, so `node --test` can load it directly.
 */

/** Cache key. BUMP THIS whenever `public/sw.js` or `PRECACHE_URLS` changes. */
export const SW_CACHE_VERSION = "v2";

/**
 * The one cache the service worker owns (doc § A.2). `activate` deletes every
 * other `swiftly-*` key rather than every other key on the origin — a future
 * feature caching under its own name must not be wiped by a worker update.
 */
export const SW_CACHE_NAME = `swiftly-${SW_CACHE_VERSION}`;

/** Served for any navigation that cannot reach the network. */
export const OFFLINE_URL = "/offline";

/**
 * SCREEN-01. Precached because the doc asks the installed app to *open* without
 * a network ("l'app s'ouvre même quand le réseau coupe — 3G instable"), and the
 * landing is the one page that can honour that: 100 % static, no session, no
 * figure on it (screen doc § 3). It is a fallback for a navigation to "/" only,
 * never preferred over the network.
 */
export const LANDING_URL = "/";

/** The app shell — structure and identity only. NEVER a balance, never a transaction. */
export const PRECACHE_URLS = [
  LANDING_URL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
] as const;

/**
 * Paths the service worker must never answer for. `/api/` is the important one:
 * this is a fintech app, and a balance served from a stale cache is a lie.
 * Everything under it goes to the network or fails — no third option.
 */
export const SW_NEVER_INTERCEPT = ["/api/", "/sw.js"] as const;

/** Content-addressed, immutable output — safe to serve cache-first. */
export const SW_STATIC_PREFIXES = ["/_next/static/", "/icons/", "/brand/"] as const;

/**
 * Exact paths, not prefixes, that are also safe cache-first.
 *
 * The manifest is in `PRECACHE_URLS` but matches no prefix above and is not a
 * navigation, so without this list it fell through to the network every time —
 * precached for nothing, and a failed request on every offline launch. It
 * describes the install, never a figure, so a cache hit cannot be wrong.
 */
export const SW_STATIC_PATHS = ["/manifest.webmanifest"] as const;

/**
 * Manifest identity, verbatim from the doc § A.1 — except the two colours.
 *
 * These strings are the manifest's, not the site's: `name` is what an install
 * dialog and the app drawer show, which is why it carries the full descriptor
 * while `<title>` in `app/layout.tsx` stays the bare "Swiftly.io".
 */
export const PWA = {
  name: "Swiftly.io — Gestion financière",
  shortName: "Swiftly",
  description: "Suivi de vos finances personnelles pour l'Afrique francophone",
  /**
   * The doc says `#0a1628` and adds "ajuster si la palette définie dans Claude
   * Design diffère" — it does. `#0a1628` exists nowhere in `globals.css`; the
   * night base actually painted is `#05060F` (the bottom of SCREEN-01's
   * gradient, `--brand-deep` #0A1466 above it). Using the real value makes the
   * splash and the first screen one surface instead of two close navies.
   */
  backgroundColor: "#05060F",
  /** Manifest fallback for the system bar; the runtime meta below wins on load. */
  manifestThemeColor: "#05060F",
} as const;

/**
 * `<meta name="theme-color">` — la couleur que le système peint derrière la
 * barre d'état. Une seule valeur depuis le retrait du thème sombre (2026-09-06).
 *
 * C'est `--brand-deep` de `app/globals.css`, pas `--surface-page`. Erreur
 * corrigée le 2026-09-06 : j'avais pris `--surface-page` en me fiant à
 * `AppHeader`, qui peint bien cette couleur — mais `AppHeader` n'est rendu que
 * par SCREEN-22. Les 21 autres écrans laissent voir le `--brand-deep` de
 * `NavShell`, d'où un bandeau clair au-dessus d'un en-tête navy.
 *
 * Sur iOS la question ne se pose plus (`black-translucent` ne peint aucun
 * fond) ; cette valeur sert à Android, à Chrome de bureau, et de repli partout
 * ailleurs. `--brand-deep` est marqué « invariant » dans globals.css : il ne
 * dépendait déjà d'aucun thème.
 */
export const THEME_COLOR = "#0A1466";
