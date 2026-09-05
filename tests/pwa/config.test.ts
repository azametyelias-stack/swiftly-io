import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  LANDING_URL,
  OFFLINE_URL,
  PRECACHE_URLS,
  PWA,
  SW_CACHE_NAME,
  SW_CACHE_VERSION,
  SW_NEVER_INTERCEPT,
  SW_STATIC_PATHS,
  SW_STATIC_PREFIXES,
  THEME_COLOR,
} from "../../lib/pwa/config.ts";
import { LANG_BOOT_SCRIPT } from "../../lib/settings/boot-script.ts";

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url));
const sw = readFileSync(root("public/sw.js"), "utf8");
const manifestSource = readFileSync(root("app/manifest.ts"), "utf8");
const layoutSource = readFileSync(root("app/layout.tsx"), "utf8");
const cssSource = readFileSync(root("app/globals.css"), "utf8");
const landingSource = readFileSync(root("app/page.tsx"), "utf8");

/*
 * `public/sw.js` and `LANG_BOOT_SCRIPT` are both plain strings that ship
 * verbatim — no import can reach into either scope. These tests are the only
 * thing standing between them and lib/pwa/config.ts drifting apart.
 */

test("sw.js quotes the same cache name as lib/pwa/config", () => {
  assert.equal(SW_CACHE_NAME, `swiftly-${SW_CACHE_VERSION}`);
  assert.ok(
    sw.includes(`const CACHE_NAME = "${SW_CACHE_NAME}";`),
    `sw.js must declare CACHE_NAME = "${SW_CACHE_NAME}"`,
  );
});

test("sw.js precaches exactly the declared app shell", () => {
  assert.ok(sw.includes(`const OFFLINE_URL = "${OFFLINE_URL}";`));
  assert.ok(sw.includes(`const LANDING_URL = "${LANDING_URL}";`));
  for (const url of PRECACHE_URLS) {
    // Both of these are referenced by constant in sw.js's own list.
    if (url === OFFLINE_URL || url === LANDING_URL) continue;
    assert.ok(sw.includes(`"${url}"`), `sw.js must precache ${url}`);
  }
});

test("the landing is the only page precached, and it carries no data", () => {
  // Doc § A.2 lists "/" so the installed app opens without a network. SCREEN-01
  // is 100 % static — no session, no figure. Any OTHER page in the precache
  // would be a page about someone's money, served from a stale cache.
  const pages = PRECACHE_URLS.filter((u) => !u.startsWith("/icons/") && u !== "/manifest.webmanifest");
  assert.deepEqual([...pages].sort(), [LANDING_URL, OFFLINE_URL].sort());
});

test("the cached landing is a fallback, never preferred over the network", () => {
  const nav = sw.slice(sw.indexOf("async function navigateOrFallback"), sw.indexOf("async function cacheFirst"));
  assert.ok(nav, "sw.js must define navigateOrFallback");
  assert.ok(
    nav.indexOf("fetch(event.request)") < nav.indexOf("caches.match"),
    "the network attempt must come before any cache lookup",
  );
  assert.match(nav, /LANDING_URL \? LANDING_URL : OFFLINE_URL/);
});

test("the precached shell holds no financial data", () => {
  for (const url of PRECACHE_URLS) {
    assert.ok(!url.startsWith("/api/"), `${url} must never be precached`);
    assert.ok(
      url === OFFLINE_URL ||
        url === LANDING_URL ||
        url.startsWith("/icons/") ||
        url === "/manifest.webmanifest",
      `${url} is not part of the app shell`,
    );
  }
});

test("RULE 1 — sw.js refuses to intercept /api/", () => {
  assert.ok(SW_NEVER_INTERCEPT.includes("/api/"));
  for (const prefix of SW_NEVER_INTERCEPT) {
    assert.ok(sw.includes(`"${prefix}"`), `sw.js must list ${prefix} in NEVER_INTERCEPT`);
  }
  // The guard has to return BEFORE any respondWith, i.e. before the navigation
  // and static branches. Position in the file is the cheap proxy for that.
  const guard = sw.indexOf("NEVER_INTERCEPT.some");
  const firstRespond = sw.indexOf("event.respondWith");
  assert.ok(guard > -1, "sw.js must guard on NEVER_INTERCEPT");
  assert.ok(guard < firstRespond, "the /api/ guard must run before any respondWith");
});

test("sw.js only ever answers GET, and lets RSC payloads through", () => {
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /_rsc/);
});

test("sw.js serves cache-first only for immutable build output", () => {
  for (const prefix of SW_STATIC_PREFIXES) {
    assert.ok(sw.includes(`"${prefix}"`), `sw.js must list ${prefix} as static`);
  }
  assert.ok(
    !SW_STATIC_PREFIXES.some((p) => p.startsWith("/api")),
    "no /api prefix may ever be cache-first",
  );
});

test("everything precached is actually reachable from the cache", () => {
  // A URL in PRECACHE_URLS that no branch of the fetch handler can serve is
  // downloaded on install and then never used. That was true of the manifest:
  // it matches no STATIC_PREFIXES entry and is not a navigation, so every
  // offline launch produced a failed request for a file already in the cache.
  for (const url of PRECACHE_URLS) {
    const servedAsNavigation = url === LANDING_URL || url === OFFLINE_URL;
    const servedAsStatic =
      SW_STATIC_PREFIXES.some((p) => url.startsWith(p)) ||
      (SW_STATIC_PATHS as readonly string[]).includes(url);
    assert.ok(
      servedAsNavigation || servedAsStatic,
      `${url} is precached but no branch of the fetch handler would ever serve it`,
    );
  }
});

test("sw.js quotes the same exact-match static paths as lib/pwa/config", () => {
  for (const path of SW_STATIC_PATHS) {
    assert.ok(sw.includes(`"${path}"`), `sw.js must list ${path} in STATIC_PATHS`);
  }
  assert.match(sw, /STATIC_PATHS\.includes\(url\.pathname\)/);
  assert.ok(
    !SW_STATIC_PATHS.some((p) => p.startsWith("/api")),
    "no /api path may ever be cache-first",
  );
});

test("the landing button re-arms instead of locking for good", () => {
  // `router.push` never rejects and the RSC fetch behind it has no timeout, so
  // without a re-arm a slow link leaves the only button on the first screen
  // dead until the app is relaunched.
  assert.match(landingSource, /REARM_AFTER_MS/, "the landing must define a re-arm delay");
  assert.match(
    landingSource,
    /setTimeout\(\(\) => setLeaving\(false\), REARM_AFTER_MS\)/,
    "the re-arm must clear `leaving`",
  );
  assert.match(landingSource, /clearTimeout\(rearm\.current\)/, "the timer must be cleaned up");
});

test("sw.js cleans up the caches of previous versions", () => {
  assert.match(sw, /caches\.keys\(\)/);
  assert.match(sw, /caches\.delete/);
  assert.match(sw, /skipWaiting/);
  assert.match(sw, /clients\.claim/);
});

test("the theme colour is one static value, emitted by the viewport export", () => {
  // Une seule palette depuis le 2026-09-06 : plus de valeur a choisir au vol,
  // donc plus de raison de poser la balise par script. `viewport.themeColor`
  // la met dans le HTML initial, ce qui est strictement mieux.
  assert.match(THEME_COLOR, /^#[0-9A-F]{6}$/, "colours stay uppercase 6-digit hex");
  assert.match(layoutSource, /themeColor: THEME_COLOR/);
  assert.doesNotMatch(LANG_BOOT_SCRIPT, /theme-color/);
  // La valeur peinte sous la barre d'etat sur 21 des 22 ecrans.
  assert.ok(
    cssSource.toLowerCase().includes(`--brand-deep: ${THEME_COLOR.toLowerCase()}`),
    `globals.css must declare --brand-deep as ${THEME_COLOR}`,
  );
});

test("the manifest is built from lib/pwa/config, not from literals", () => {
  assert.match(manifestSource, /PWA\.name/);
  assert.match(manifestSource, /display: "standalone"/);
  assert.match(manifestSource, /orientation: "portrait"/);
  assert.match(manifestSource, /purpose: "maskable"/);
  for (const hex of [PWA.backgroundColor, PWA.manifestThemeColor]) {
    assert.match(hex, /^#[0-9A-F]{6}$/, "colours stay uppercase 6-digit hex");
  }
});
