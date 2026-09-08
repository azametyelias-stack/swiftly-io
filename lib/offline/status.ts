"use client";

import { useSyncExternalStore } from "react";

/**
 * L'état « ce que vous regardez est-il à jour ? », lu par `OfflineBanner`.
 *
 * Deux choses, et elles ne se déduisent pas l'une de l'autre :
 *  - `online` : ce que le navigateur croit du réseau, corrigé par ce que nos
 *    requêtes ont réellement vécu. `navigator.onLine` dit surtout quand il n'y
 *    a AUCUN réseau ; il ment volontiers dans l'autre sens (wifi capté, pas
 *    d'internet). Une requête qui échoue, elle, ne ment pas.
 *  - `staleAt` : la date de la donnée affichée la plus ancienne.
 *
 * Le suivi est fait PAR CHEMIN, et c'est le point important. Un écran appelle
 * plusieurs routes ; sur un réseau intermittent, `/api/accounts` peut passer
 * pendant que `/api/dashboard` retombe sur le cache. Un simple drapeau
 * « quelque chose est frais » ferait disparaître le bandeau alors qu'un solde
 * d'hier est toujours à l'écran. Ici un chemin ne redevient frais que lorsque
 * LUI a répondu.
 */

export type OfflineState = {
  online: boolean;
  /** Epoch ms de la donnée affichée la plus ancienne, ou `null` si tout est frais. */
  staleAt: number | null;
};

const FRESH: OfflineState = { online: true, staleAt: null };

/** Chemin → date de la version servie depuis le cache. */
const stale = new Map<string, number>();

let online = true;
let state: OfflineState = FRESH;
const listeners = new Set<() => void>();
let attached = false;

function publish(): void {
  const staleAt = stale.size === 0 ? null : Math.min(...stale.values());
  if (online === state.online && staleAt === state.staleAt) return;
  state = { online, staleAt };
  for (const listener of listeners) listener();
}

/** `path` a répondu depuis le réseau : il n'est plus périmé. */
export function markFresh(path: string): void {
  stale.delete(path);
  online = true;
  publish();
}

/** `path` a été servi depuis le cache, dans la version datée de `at`. */
export function markServedFromCache(path: string, at: number): void {
  stale.set(path, at);
  online = false;
  publish();
}

/** Le réseau a échoué et rien n'était en cache — hors ligne, sans date à donner. */
export function markUnreachable(): void {
  online = false;
  publish();
}

function attach(): void {
  if (attached || typeof window === "undefined") return;
  attached = true;
  window.addEventListener("offline", () => {
    online = false;
    publish();
  });
  // Le retour du réseau ne prouve rien de ce qui est AFFICHÉ : `staleAt` ne
  // tombe qu'à la réponse effective de chaque chemin. Effacer la date ici
  // serait une promesse non tenue.
  window.addEventListener("online", () => {
    online = true;
    publish();
  });
}

function subscribe(onChange: () => void): () => void {
  attach();
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Lu par React AVANT l'abonnement. C'est donc ici, et pas dans `attach()`, que
 * l'état du réseau doit être connu : `RequireSession` décide de renvoyer ou non
 * sur la Landing au premier rendu, et une lecture trop tardive lui ferait
 * croire l'appareil en ligne alors qu'il ne l'est pas — l'app se viderait
 * pendant un instant avant de se rattraper. Idempotent, et la référence rendue
 * reste stable ensuite (React compare par identité).
 */
let probed = false;

function getSnapshot(): OfflineState {
  if (!probed && typeof navigator !== "undefined") {
    probed = true;
    if (!navigator.onLine) {
      online = false;
      state = { online: false, staleAt: state.staleAt };
    }
  }
  return state;
}

function getServerSnapshot(): OfflineState {
  return FRESH;
}

export function useOfflineState(): OfflineState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
