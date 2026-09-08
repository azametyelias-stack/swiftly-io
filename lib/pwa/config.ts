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

/** Cache key. BUMP THIS whenever `public/sw.js` or the precache lists change. */
export const SW_CACHE_VERSION = "v3";

/**
 * Le cache des RESSOURCES : sortie de build, icônes, manifeste, page hors ligne.
 * Contenu adressé par empreinte ou strictement identitaire — un hit ne peut pas
 * être faux. `activate` supprime toute autre clé `swiftly-*` (et seulement
 * celles-là : une future fonctionnalité qui cacherait sous son propre nom ne
 * doit pas être balayée par une mise à jour du worker).
 */
export const SW_CACHE_NAME = `swiftly-${SW_CACHE_VERSION}`;

/**
 * Le cache des COQUILLES d'écran : le HTML des routes de l'app.
 *
 * Séparé du précédent parce qu'il ne suit pas les mêmes règles — plafonné,
 * renouvelé à chaque visite en ligne, et jamais préféré au réseau.
 *
 * Pourquoi c'est sans danger alors que la v2 refusait de cacher la moindre
 * page : les 22 écrans sont des composants client qui vont chercher leurs
 * chiffres dans `/api/*` APRÈS l'hydratation. Le HTML servi par le serveur ne
 * contient donc aucun montant — c'est une mise en page vide. Les chiffres, eux,
 * passent par `lib/offline/*`, qui les date et fait afficher « Hors ligne —
 * données du … ». Le worker garde la coquille, la couche applicative garde les
 * chiffres : c'est la seule des deux qui peut dire de quand ils datent.
 */
export const SW_PAGES_CACHE_NAME = `swiftly-pages-${SW_CACHE_VERSION}`;

/** Coquilles gardées au maximum, les plus anciennes évincées d'abord. */
export const SW_MAX_CACHED_PAGES = 24;

/** Served for any navigation that cannot reach the network. */
export const OFFLINE_URL = "/offline";

/** SCREEN-01, et `start_url` du manifeste : l'app installée s'ouvre ici. */
export const LANDING_URL = "/";

/** SCREEN-04 — le premier écran réel, celui qu'on attend en ouvrant l'app. */
export const DASHBOARD_URL = "/dashboard";

/** Ressources précachées à l'installation. Aucune n'est une page de données. */
export const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
] as const;

/**
 * Coquilles précachées à l'installation, pour que le tout premier lancement
 * hors ligne tombe sur l'app et non sur la page « Pas de connexion ».
 *
 * Le worker relit chaque coquille pour y repérer ses `/_next/static/*.js|css`
 * et les cacher aussi : une coquille sans ses fragments s'affiche figée sur son
 * squelette, ce qui serait pire que la page hors ligne.
 *
 * Les autres écrans arrivent dans ce cache au fil des visites en ligne.
 */
export const PRECACHE_PAGES = [LANDING_URL, DASHBOARD_URL] as const;

/**
 * Paths the service worker must never answer for. `/api/` is the important one,
 * et il n'a pas bougé d'un pouce en v3 : un worker sert une réponse sans que
 * l'interface sache d'où elle vient, donc un solde périmé y serait
 * indiscernable d'un solde frais. Le mode hors ligne des données est monté un
 * étage plus haut (`lib/offline/*`), là où la date peut remonter jusqu'à
 * l'écran. Ici : le réseau ou l'échec, pas de troisième option.
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
