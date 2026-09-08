import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  EMPTY_OFFLINE_CACHE,
  OFFLINE_MAX_AGE_MS,
  OFFLINE_MAX_BYTES,
  OFFLINE_MAX_ENTRIES,
  OFFLINE_MAX_ENTRY_BYTES,
  isCacheableRequest,
  isNetworkFailure,
  parseCache,
  pruneCache,
  recall,
  remember,
  type OfflineCache,
} from "../../lib/offline/store.ts";

/*
 * Le cache hors ligne garde de vrais montants sur l'appareil. Ce qui suit
 * verifie les quatre proprietes qui rendent ca acceptable : rien n'entre sans
 * date, rien ne sort sans que le reseau ait echoue, rien ne survit a un
 * changement de compte, et rien ne grossit sans fin.
 */

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 8, 7, 8, 24); // 7 sept. 2026, 08:24 — la capture d'Elias

function cacheWith(entries: Record<string, { at: number; data: unknown }>, user = "u1"): OfflineCache {
  return { user, entries };
}

/* ── ce qui a le droit d'entrer ──────────────────────────────────────────── */

test("seules les lectures /api/ sont mises en cache", () => {
  assert.equal(isCacheableRequest("/api/dashboard?period=day"), true);
  assert.equal(isCacheableRequest("/api/dashboard", "get"), true, "la methode est insensible a la casse");

  // Une ecriture ne se rejoue pas et ne se met pas en file : hors ligne elle
  // echoue, visiblement. Une depense rejouee plus tard, c'est un doublon.
  assert.equal(isCacheableRequest("/api/transactions", "POST"), false);
  assert.equal(isCacheableRequest("/api/transactions/1", "PATCH"), false);
  assert.equal(isCacheableRequest("/api/transactions/1", "DELETE"), false);

  // Hors du REST Swiftly, rien n'est garde.
  assert.equal(isCacheableRequest("/dashboard"), false);
  assert.equal(isCacheableRequest("https://evil.example/api/x"), false);
});

test("une reponse n'entre jamais sans sa date", () => {
  const next = remember(EMPTY_OFFLINE_CACHE, {
    path: "/api/dashboard",
    data: { balance: 125_000 },
    at: T0,
    user: "u1",
  });
  assert.equal(next.entries["/api/dashboard"].at, T0);
  assert.deepEqual(next.entries["/api/dashboard"].data, { balance: 125_000 });
  assert.equal(next.user, "u1");

  // C'est cette date que le bandeau affiche. Sans elle, un solde d'hier serait
  // indiscernable d'un solde de maintenant — le mensonge qu'on refuse.
  for (const entry of Object.values(next.entries)) {
    assert.equal(typeof entry.at, "number");
  }
});

test("une reponse trop grosse est refusee plutot que d'evincer tout le reste", () => {
  const huge = { rows: "x".repeat(OFFLINE_MAX_ENTRY_BYTES + 10) };
  const before = remember(EMPTY_OFFLINE_CACHE, {
    path: "/api/dashboard",
    data: { balance: 1 },
    at: T0,
    user: "u1",
  });
  const after = remember(before, { path: "/api/historiques", data: huge, at: T0, user: "u1" });

  assert.equal(after.entries["/api/historiques"], undefined);
  assert.ok(after.entries["/api/dashboard"], "le reste du cache survit intact");
});

/* ── ce qui a le droit de sortir ─────────────────────────────────────────── */

test("recall rend la reponse et sa date", () => {
  const cache = remember(EMPTY_OFFLINE_CACHE, {
    path: "/api/dashboard",
    data: { balance: 125_000 },
    at: T0,
    user: "u1",
  });
  const hit = recall(cache, { path: "/api/dashboard", user: "u1", now: T0 + HOUR });
  assert.deepEqual(hit, { at: T0, data: { balance: 125_000 } });
});

test("rien n'est servi au-dela de l'age maximum", () => {
  const cache = cacheWith({ "/api/dashboard": { at: T0, data: { balance: 1 } } });
  assert.ok(recall(cache, { path: "/api/dashboard", user: "u1", now: T0 + OFFLINE_MAX_AGE_MS }));
  assert.equal(
    recall(cache, { path: "/api/dashboard", user: "u1", now: T0 + OFFLINE_MAX_AGE_MS + 1 }),
    null,
    "« donnees du 31 aout » sur un solde n'informe plus, il induit en erreur",
  );
});

test("les chiffres d'un compte ne sortent jamais sous un autre compte", () => {
  const cache = cacheWith({ "/api/dashboard": { at: T0, data: { balance: 1 } } }, "u1");
  assert.equal(recall(cache, { path: "/api/dashboard", user: "u2", now: T0 }), null);

  // Session illisible (jeton expire, rafraichissement impossible) : c'est le
  // cas normal hors ligne. Le cache etant efface a la deconnexion, ce qui reste
  // appartient au dernier compte connecte sur cet appareil.
  assert.ok(recall(cache, { path: "/api/dashboard", user: null, now: T0 }));
});

test("changer de compte vide le cache", () => {
  const cache = cacheWith({ "/api/dashboard": { at: T0, data: { balance: 999 } } }, "u1");
  const next = remember(cache, { path: "/api/me", data: { name: "B" }, at: T0, user: "u2" });

  assert.equal(next.user, "u2");
  assert.deepEqual(Object.keys(next.entries), ["/api/me"]);
});

test("un chemin jamais charge ne rend rien", () => {
  assert.equal(recall(EMPTY_OFFLINE_CACHE, { path: "/api/dashboard", user: "u1", now: T0 }), null);
});

/* ── ce qui borne la taille ──────────────────────────────────────────────── */

test("le nombre d'entrees est plafonne, la plus ancienne part d'abord", () => {
  let cache: OfflineCache = EMPTY_OFFLINE_CACHE;
  for (let i = 0; i < OFFLINE_MAX_ENTRIES + 5; i += 1) {
    cache = remember(cache, { path: `/api/p${i}`, data: { i }, at: T0 + i, user: "u1" });
  }

  assert.equal(Object.keys(cache.entries).length, OFFLINE_MAX_ENTRIES);
  assert.equal(cache.entries["/api/p0"], undefined, "la plus ancienne est evincee");
  assert.ok(cache.entries[`/api/p${OFFLINE_MAX_ENTRIES + 4}`], "la plus recente est gardee");
});

test("la taille totale est plafonnee", () => {
  let cache: OfflineCache = EMPTY_OFFLINE_CACHE;
  const chunk = { rows: "x".repeat(200_000) };
  for (let i = 0; i < 12; i += 1) {
    cache = remember(cache, { path: `/api/big${i}`, data: chunk, at: T0 + i, user: "u1" });
  }
  assert.ok(
    JSON.stringify(cache).length <= OFFLINE_MAX_BYTES,
    "localStorage tourne autour de 5 Mo et heberge deja la session Supabase",
  );
  assert.ok(Object.keys(cache.entries).length > 0, "on garde au moins les plus recentes");
});

test("pruneCache jette d'abord ce qui est perime", () => {
  const cache = cacheWith({
    "/api/vieux": { at: T0 - OFFLINE_MAX_AGE_MS - 1, data: 1 },
    "/api/frais": { at: T0, data: 2 },
  });
  const pruned = pruneCache(cache, T0);
  assert.deepEqual(Object.keys(pruned.entries), ["/api/frais"]);
});

/* ── robustesse ──────────────────────────────────────────────────────────── */

test("un stockage abime repart d'un cache vide, sans jeter", () => {
  assert.deepEqual(parseCache(null), EMPTY_OFFLINE_CACHE);
  assert.deepEqual(parseCache("pas du json"), EMPTY_OFFLINE_CACHE);
  assert.deepEqual(parseCache("[]"), EMPTY_OFFLINE_CACHE);
  assert.deepEqual(parseCache('{"user":"u1"}'), EMPTY_OFFLINE_CACHE);

  // Une entree sans date est inexploitable : on ne pourrait pas l'annoncer.
  const partial = parseCache('{"user":"u1","entries":{"/api/a":{"data":1},"/api/b":{"at":5,"data":2}}}');
  assert.deepEqual(Object.keys(partial.entries), ["/api/b"]);
});

/* ── la frontiere entre « pas de reseau » et « le serveur dit non » ──────── */

test("seule une panne reseau ouvre le cache", () => {
  // fetch rejette avec un TypeError quand la requete n'aboutit pas.
  assert.equal(isNetworkFailure(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkFailure(new TypeError("Load failed")), true, "formulation Safari");

  // Une vraie reponse d'erreur reste une erreur : le cache ne sert jamais de
  // filet a un serveur qui repond non. Un 401 doit deconnecter, pas reafficher
  // un solde ; un 500 doit se voir.
  assert.equal(isNetworkFailure(Object.assign(new Error("Non autorise"), { status: 401 }), ), false);
  assert.equal(isNetworkFailure(Object.assign(new TypeError("bizarre"), { status: 500 })), false);
  assert.equal(isNetworkFailure(new Error("Requete echouee.")), false);
  assert.equal(isNetworkFailure(null), false);
  assert.equal(isNetworkFailure("hors ligne"), false);
});

/* ── le contrat avec le service worker ───────────────────────────────────── */

test("le cache des donnees vit dans l'app, pas dans le service worker", () => {
  // Les deux moities de la meme decision : le worker garde la coquille et ne
  // touche pas a /api/ (il repondrait sans que l'interface sache d'ou vient la
  // reponse) ; cette couche-ci garde les chiffres, et peut les dater.
  const sw = readFileSync(fileURLToPath(new URL("../../public/sw.js", import.meta.url)), "utf8");
  assert.match(sw, /NEVER_INTERCEPT = \["\/api\/"/);
  assert.ok(!sw.includes("sf-offline-data"), "le worker ne connait pas le cache de donnees");

  const api = readFileSync(fileURLToPath(new URL("../../lib/http/api.ts", import.meta.url)), "utf8");
  // Le cache n'est lu que dans la branche d'echec reseau, jamais avant l'appel.
  assert.ok(
    api.indexOf("await api.fetch(path, init)") < api.indexOf("recallResponse(path)"),
    "le reseau doit toujours etre tente en premier",
  );
  assert.ok(
    api.indexOf("if (!isNetworkFailure(error)) throw error;") < api.indexOf("recallResponse(path)"),
    "une reponse d'erreur du serveur ne doit jamais faire ressortir un chiffre perime",
  );
});
