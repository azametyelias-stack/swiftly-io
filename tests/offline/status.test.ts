import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * L'etat qui decide de ce que le bandeau annonce.
 *
 * Le store garde son etat au niveau du module et ne le publie qu'a travers
 * `useSyncExternalStore`, qui n'est appelable que depuis un composant React.
 * On verifie donc ses invariants sur la source — exactement la technique que
 * `tests/pwa` emploie pour `public/sw.js`, et pour la meme raison : le
 * comportement vit dans un scope qu'un test ne peut pas instancier.
 */

const SOURCE = readFileSync(
  fileURLToPath(new URL("../../lib/offline/status.ts", import.meta.url)),
  "utf8",
);
const API = readFileSync(
  fileURLToPath(new URL("../../lib/http/api.ts", import.meta.url)),
  "utf8",
);
const BANNER = readFileSync(
  fileURLToPath(new URL("../../components/offline/OfflineBanner.tsx", import.meta.url)),
  "utf8",
);

test("une reponse fraiche ne libere que sa propre route", () => {
  // Le bug qu'on empeche : `/api/accounts` repond, `/api/dashboard` retombe sur
  // le cache, et le bandeau disparait alors qu'un solde d'hier est a l'ecran.
  assert.match(SOURCE, /export function markFresh\(path: string\)/);
  assert.match(SOURCE, /stale\.delete\(path\)/);
  assert.match(SOURCE, /export function markServedFromCache\(path: string, at: number\)/);
  assert.match(SOURCE, /stale\.set\(path, at\)/);
});

test("le retour du reseau n'efface pas la date a lui seul", () => {
  const handler = SOURCE.slice(SOURCE.indexOf('addEventListener("online"'));
  assert.ok(!handler.includes("stale.clear()"), "l'evenement online ne doit rien liberer");
});

test("l'etat du reseau est connu des le PREMIER rendu, pas a l'abonnement", () => {
  // Attrape le 2026-09-08 en pilotant un vrai Chrome : lu seulement dans
  // `subscribe`, l'etat arrivait apres que `RequireSession` ait deja decide, et
  // l'app renvoyait sur la Landing alors que l'appareil etait hors ligne.
  // React appelle `getSnapshot` AVANT de s'abonner : c'est donc la que
  // `navigator.onLine` doit etre lu.
  const snapshot = SOURCE.slice(SOURCE.indexOf("function getSnapshot"));
  assert.match(snapshot, /navigator\.onLine/, "getSnapshot doit interroger le navigateur");
  const attach = SOURCE.slice(SOURCE.indexOf("function attach"), SOURCE.indexOf("function subscribe"));
  assert.ok(!attach.includes("navigator.onLine"), "…et attach() ne doit plus etre le seul a le faire");
});

test("les marqueurs sont poses aux trois bons endroits dans apiJson", () => {
  // Servi depuis le cache → on annonce la date. Reponse reseau → la route
  // redevient fraiche. Echec sans cache → hors ligne, sans date a donner.
  assert.match(API, /markServedFromCache\(path, cached\.at\)/);
  assert.match(API, /markFresh\(path\)/);
  assert.match(API, /markUnreachable\(\)/);
  assert.ok(
    API.indexOf("markServedFromCache(path, cached.at)") < API.indexOf("markUnreachable()"),
    "le cache doit etre tente avant de declarer l'ecran vide",
  );
  assert.ok(
    API.indexOf("markFresh(path)") > API.indexOf("if (!res.ok || !body?.success)"),
    "une reponse d'erreur ne doit pas passer pour une donnee fraiche",
  );
});

test("le bandeau distingue « hors ligne » de « en ligne mais perime »", () => {
  assert.match(BANNER, /staleAt === null\s*\?\s*m\.offline\.banner/);
  assert.match(BANNER, /online \? m\.offline\.staleDated : m\.offline\.bannerDated/);
  // Une date, jamais un « il y a 3 h » qui se perime tout seul a l'ecran.
  assert.match(BANNER, /day: "numeric"/);
  assert.match(BANNER, /minute: "2-digit"/);
});

test("le bandeau ne recouvre pas l'ecran, il lui prend sa place", () => {
  // `sticky` et non `fixed` : hors ligne il pousse le contenu vers le bas au
  // lieu de masquer le titre. `AppHeader` se colle en dessous via la variable.
  assert.match(BANNER, /sticky top-0 z-40/);
  assert.match(BANNER, /--sf-offline-bar/);
  const header = readFileSync(
    fileURLToPath(new URL("../../components/nav/AppHeader.tsx", import.meta.url)),
    "utf8",
  );
  assert.match(header, /top: "var\(--sf-offline-bar, 0px\)"/);
  assert.ok(!header.includes("sticky top-0"), "l'en-tete ne doit plus coller a 0 en dur");
});
