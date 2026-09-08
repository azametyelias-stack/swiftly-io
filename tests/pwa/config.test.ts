import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DASHBOARD_URL,
  LANDING_URL,
  OFFLINE_URL,
  PRECACHE_PAGES,
  PRECACHE_URLS,
  SW_MAX_CACHED_PAGES,
  SW_PAGES_CACHE_NAME,
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

test("les deux caches sont nommes et versionnes ensemble", () => {
  // v3 : les coquilles d'ecran vivent dans un cache a part, plafonne et
  // renouvele a chaque visite, la ou les ressources sont immuables.
  assert.equal(SW_PAGES_CACHE_NAME, `swiftly-pages-${SW_CACHE_VERSION}`);
  assert.ok(sw.includes(`const PAGES_CACHE_NAME = "${SW_PAGES_CACHE_NAME}";`));
  assert.ok(sw.includes(`const MAX_CACHED_PAGES = ${SW_MAX_CACHED_PAGES};`));
  // `activate` doit garder les DEUX, sinon chaque mise a jour vide les coquilles.
  const activate = sw.slice(sw.indexOf('addEventListener("activate"'), sw.indexOf('addEventListener("fetch"'));
  assert.match(activate, /\[CACHE_NAME, PAGES_CACHE_NAME\]/);
});

test("seules des coquilles sont precachees — aucune ne porte de chiffre", () => {
  // v2 ne precachait que la Landing : toute autre page aurait ete « une page
  // sur l'argent de quelqu'un, servie depuis un cache perime ». v3 en cache
  // d'autres, et l'argument tient toujours — mais autrement : ces pages sont
  // des composants client dont le HTML ne contient aucun montant. Les chiffres
  // passent par lib/offline/*, qui les date. Ce que ce test garde, c'est que
  // rien de precache ici ne puisse etre une reponse de donnees.
  for (const url of [...PRECACHE_URLS, ...PRECACHE_PAGES]) {
    assert.ok(!url.startsWith("/api/"), `${url} ne doit jamais etre precache`);
  }
  assert.deepEqual([...PRECACHE_PAGES], [LANDING_URL, DASHBOARD_URL]);
  for (const page of PRECACHE_PAGES) {
    assert.ok(sw.includes(`"${page}"`), `sw.js doit precacher la coquille ${page}`);
  }
  // Une seule page dans le cache de ressources : /offline, le repli ultime.
  const documents = PRECACHE_URLS.filter(
    (u) => !u.startsWith("/icons/") && u !== "/manifest.webmanifest",
  );
  assert.deepEqual([...documents], [OFFLINE_URL]);
});

test("une coquille est un repli, jamais preferee au reseau", () => {
  const nav = sw.slice(sw.indexOf("async function navigateOrFallback"), sw.indexOf("function isCacheableDocument"));
  assert.ok(nav, "sw.js must define navigateOrFallback");
  assert.ok(
    nav.indexOf("fetch(event.request)") < nav.indexOf("caches.open(PAGES_CACHE_NAME)"),
    "the network attempt must come before any cache lookup",
  );
  // Le repli est celui de CETTE route, sinon /offline — jamais la coquille
  // d'un autre ecran, qui afficherait une mise en page qu'on n'a pas demandee.
  assert.match(nav, /pages\.match\(url\.pathname\)/);
  assert.ok(
    nav.indexOf("pages.match(url.pathname)") < nav.indexOf("OFFLINE_URL"),
    "the requested route's shell must win over the offline page",
  );
});

test("une coquille n'est rangee que depuis la branche navigation", () => {
  // storeShell est le seul chemin d'ecriture du cache de pages. S'il devenait
  // atteignable depuis la branche generique, une reponse /api/ pourrait y
  // entrer — c'est exactement ce que la REGLE N°1 interdit.
  const handler = sw.slice(sw.indexOf('addEventListener("fetch"'), sw.indexOf("async function navigateOrFallback"));
  assert.ok(!handler.includes("storeShell"), "le gestionnaire fetch ne doit pas ranger de coquille lui-meme");
  const callers = sw.split("storeShell(").length - 1;
  assert.equal(callers, 3, "storeShell : sa definition, precachePage, et navigateOrFallback");
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
