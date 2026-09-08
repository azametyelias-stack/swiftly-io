/*
 * Swiftly.io — service worker.
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.2.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÈGLE N°1 — ce worker ne touche JAMAIS à /api/.
 *
 * Swiftly is a fintech app. A solde or a transaction served from a stale cache
 * is not a degraded experience, it is wrong information about someone's money.
 * Un worker répond sans que l'interface sache d'où vient la réponse : un solde
 * d'hier y serait indiscernable d'un solde de maintenant. Donc tout ce qui peut
 * porter un chiffre (`/api/*`, les charges RSC, l'origine Supabase) va au
 * réseau, où il réussit avec des données fraîches ou échoue visiblement.
 *
 * Ce que le worker garde, c'est la COQUILLE : la sortie de build, les icônes,
 * la page hors ligne, et le HTML des écrans — qui ne contient aucun montant,
 * puisque les 22 écrans vont chercher leurs chiffres dans `/api/*` après
 * l'hydratation. Les chiffres, eux, sont mis en cache un étage plus haut, par
 * `lib/offline/*`, qui les date et fait afficher « Hors ligne — données du … ».
 * Le worker garde la mise en page, la couche applicative garde les chiffres :
 * c'est la seule des deux qui peut dire de quand ils datent.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Not built, not bundled: this file ships byte-for-byte from `public/`. The
 * constants below are mirrored from `lib/pwa/config.ts` and re-checked by
 * `tests/pwa/config.test.ts`, since no import can cross into this scope.
 *
 * Served with `Cache-Control: no-store` (next.config.ts) and registered with
 * `updateViaCache: "none"`, so the browser always re-fetches this file and a
 * deploy actually reaches installed users.
 */

const CACHE_NAME = "swiftly-v3";
const PAGES_CACHE_NAME = "swiftly-pages-v3";
const OFFLINE_URL = "/offline";
const LANDING_URL = "/";
const DASHBOARD_URL = "/dashboard";

/** Coquilles gardées au maximum. Au-delà, la plus ancienne visite est évincée. */
const MAX_CACHED_PAGES = 24;

/** Garde-fou : une page anormalement riche en fragments ne vide pas le quota. */
const MAX_WARMED_CHUNKS = 60;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

const PRECACHE_PAGES = [LANDING_URL, DASHBOARD_URL];

const NEVER_INTERCEPT = ["/api/", "/sw.js"];
const STATIC_PREFIXES = ["/_next/static/", "/icons/", "/brand/"];
const STATIC_PATHS = ["/manifest.webmanifest"];

/* ── install ─────────────────────────────────────────────────────────────── */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // One `add` per URL rather than `addAll`: a single 404 must not abort the
      // whole install and leave the user with no offline page at all.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch {
            /* keep going — the rest of the shell is still worth having */
          }
        }),
      );

      // Les coquilles ensuite : elles rangent leurs fragments dans le cache de
      // ressources ouvert ci-dessus.
      await Promise.all(PRECACHE_PAGES.map(precachePage));

      // Take over as soon as the new worker is ready; `activate` then clears the
      // caches the previous version left behind.
      await self.skipWaiting();
    })(),
  );
});

async function precachePage(pathname) {
  try {
    const response = await fetch(new Request(pathname, { cache: "reload" }));
    if (!isCacheableDocument(response)) return;
    await storeShell(pathname, response);
  } catch {
    /* pas de réseau à l'installation — la coquille arrivera à la prochaine visite */
  }
}

/* ── activate ────────────────────────────────────────────────────────────── */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const mine = [CACHE_NAME, PAGES_CACHE_NAME];
      await Promise.all(
        keys
          .filter((key) => key.startsWith("swiftly-") && !mine.includes(key))
          .map((key) => caches.delete(key)),
      );

      // Lets the browser start the network request for a navigation in parallel
      // with booting this worker, so network-first costs nothing when online.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* not supported — plain fetch below still works */
        }
      }

      await self.clients.claim();
    })(),
  );
});

/* ── fetch ───────────────────────────────────────────────────────────────── */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only ever GET. A POST /api/transactions must never come near this worker.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Cross-origin (Supabase, Google Analytics) — not ours to cache or to replay.
  if (url.origin !== self.location.origin) return;

  // RÈGLE N°1.
  if (NEVER_INTERCEPT.some((prefix) => url.pathname.startsWith(prefix))) return;

  // React Server Component payloads: the data half of a navigation. Same reason
  // as /api/ — always from the network, never from a cache. Hors ligne, Next
  // retombe alors sur une navigation complète du navigateur, qui repasse par le
  // gestionnaire ci-dessous et y trouve la coquille.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  // Une page. Réseau d'abord, toujours ; la coquille en cache seulement si le
  // réseau est absent. Une réponse réussie est rangée au passage — c'est ce qui
  // rend l'écran consultable au prochain trajet sans réseau.
  if (request.mode === "navigate") {
    event.respondWith(navigateOrFallback(event, url));
    return;
  }

  // Build output and identity assets: content-addressed or stable, so a cache
  // hit can never be wrong. STATIC_PATHS covers the manifest, which is in the
  // precache but matches no prefix. Everything else falls through to the network.
  if (
    STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    STATIC_PATHS.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function navigateOrFallback(event, url) {
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (isCacheableDocument(response)) {
      // `waitUntil`, pas `await` : la page part tout de suite, le rangement se
      // fait derrière.
      event.waitUntil(storeShell(url.pathname, response.clone()));
    }
    return response;
  } catch {
    // Réseau absent. La coquille de CETTE route d'abord — c'est l'écran qui a
    // été demandé. À défaut, /offline : mieux vaut dire « pas de connexion »
    // que d'afficher la mise en page d'un autre écran.
    const pages = await caches.open(PAGES_CACHE_NAME);
    const shell = await pages.match(url.pathname);
    if (shell) return shell;

    const fallback = await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME });
    if (fallback) return fallback;

    return new Response("Hors ligne", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/**
 * Une réponse de navigation digne d'être gardée : du HTML de notre origine, en
 * 200. `redirected` est écarté — le navigateur refuse qu'un worker réponde à
 * une navigation avec une réponse portant ce drapeau, et l'erreur
 * n'apparaîtrait qu'une fois hors ligne, c'est-à-dire trop tard.
 */
function isCacheableDocument(response) {
  if (!response || !response.ok || response.redirected) return false;
  if (response.type !== "basic" && response.type !== "default") return false;
  return (response.headers.get("Content-Type") || "").includes("text/html");
}

/**
 * Range une coquille sous son chemin seul : la requête d'origine peut porter
 * une query (`?period=month`), la coquille est la même — elle ne contient
 * aucune donnée, seulement la mise en page.
 */
async function storeShell(pathname, response) {
  const forChunks = response.clone();
  const pages = await caches.open(PAGES_CACHE_NAME);
  await pages.put(new Request(pathname), response);
  await trimPages(pages);
  await warmChunks(forChunks);
}

/**
 * Une coquille sans ses fragments JS s'affiche figée sur son squelette : rien
 * ne s'hydrate, aucun bouton ne répond — pire que la page hors ligne. On relit
 * donc le HTML pour y trouver ses `/_next/static/*.js|css` et on les cache
 * aussi. Ces URL sont adressées par empreinte : les garder ne peut jamais
 * donner une version fausse.
 */
async function warmChunks(response) {
  try {
    const html = await response.text();
    // Déclaré ici : un littéral /g au niveau module garderait son `lastIndex`
    // d'un appel à l'autre et sauterait des fragments.
    const pattern = /\/_next\/static\/[A-Za-z0-9._/-]+?\.(?:js|css)/g;
    const urls = new Set();
    let match;
    while ((match = pattern.exec(html)) !== null) {
      urls.add(match[0]);
      if (urls.size >= MAX_WARMED_CHUNKS) break;
    }

    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      [...urls].map(async (url) => {
        if (await cache.match(url)) return;
        try {
          await cache.add(new Request(url, { cache: "reload" }));
        } catch {
          /* un fragment manquant vaut mieux qu'une installation avortée */
        }
      }),
    );
  } catch {
    /* corps illisible — la coquille reste utile, elle sera juste plus lente */
  }
}

/** Plafonne le cache des coquilles, sans jamais évincer celles du précache. */
async function trimPages(cache) {
  const keys = await cache.keys();
  let excess = keys.length - MAX_CACHED_PAGES;
  if (excess <= 0) return;

  // `keys()` rend l'ordre d'insertion : la plus ancienne visite d'abord.
  for (const key of keys) {
    if (excess <= 0) break;
    let pathname;
    try {
      pathname = new URL(key.url).pathname;
    } catch {
      pathname = "";
    }
    if (PRECACHE_PAGES.includes(pathname)) continue;
    await cache.delete(key);
    excess -= 1;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  const hit = await cache.match(request);
  if (hit) return hit;

  // Not cached and no network → this rejects, which is exactly what would have
  // happened without a service worker. The browser reports a failed subresource.
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone());
  }
  return response;
}
