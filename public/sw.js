/*
 * Swiftly.io — service worker.
 * Reference: `docs/4-SETUP (Deployment Guide)/PWA-IMPLEMENTATION.md` § A.2.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÈGLE N°1 — ce worker ne touche JAMAIS à /api/.
 *
 * Swiftly is a fintech app. A solde or a transaction served from a stale cache
 * is not a degraded experience, it is wrong information about someone's money.
 * So the cache holds the *shell* only — build output, icons, the offline page —
 * and every request that could carry a figure (`/api/*`, the RSC payloads, the
 * Supabase origin) is left to the network, where it either succeeds with fresh
 * data or fails visibly.
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

const CACHE_NAME = "swiftly-v2";
const OFFLINE_URL = "/offline";
const LANDING_URL = "/";

const PRECACHE_URLS = [
  LANDING_URL,
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-512x512.png",
];

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
      // Take over as soon as the new worker is ready; `activate` then clears the
      // caches the previous version left behind.
      await self.skipWaiting();
    })(),
  );
});

/* ── activate ────────────────────────────────────────────────────────────── */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("swiftly-") && key !== CACHE_NAME)
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
  // as /api/ — always from the network, never from a cache.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  // A page. Network first; a cached fallback only if the network is gone.
  // Successful responses are deliberately NOT cached: an HTML shell of the
  // dashboard is still a page about someone's money.
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
    if (preloaded) return preloaded;
    return await fetch(event.request);
  } catch {
    // Launching the installed app with no network lands on "/" — serve the real
    // landing screen there rather than an error page. Every other route gets
    // /offline, because every other route needs data we refuse to fake.
    const fallback = url.pathname === LANDING_URL ? LANDING_URL : OFFLINE_URL;
    const cached =
      (await caches.match(fallback, { cacheName: CACHE_NAME })) ||
      (await caches.match(OFFLINE_URL, { cacheName: CACHE_NAME }));
    if (cached) return cached;
    return new Response("Hors ligne", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
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
