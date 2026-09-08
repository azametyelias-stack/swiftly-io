"use client";

import {
  EMPTY_OFFLINE_CACHE,
  OFFLINE_STORAGE_KEY,
  parseCache,
  recall,
  remember,
  serializeCache,
  type OfflineCache,
  type OfflineEntry,
} from "@/lib/offline/store";

/**
 * `lib/offline/store.ts` branché sur `localStorage`. Toute la logique est dans
 * le module pur ; ici il n'y a que des accès au stockage, chacun protégé —
 * navigation privée, quota plein, stockage désactivé : dans tous ces cas
 * l'application doit continuer à marcher en ligne comme si de rien n'était.
 *
 * Ce que ce cache contient : les réponses `GET /api/*` déjà reçues, en clair,
 * dans le `localStorage` de l'appareil — au même endroit que le jeton de
 * session Supabase, qui y est déjà. C'est le prix du mode hors ligne, et il est
 * borné : effacé à la déconnexion, effacé au changement de compte, et jamais
 * plus vieux que `OFFLINE_MAX_AGE_MS`.
 */

/**
 * Le compte courant, tenu à jour par `lib/http/api.ts` sur les événements
 * Supabase. Mémorisé aussi dans le cache lui-même, pour que le prochain
 * démarrage hors ligne sache à qui appartiennent ces chiffres.
 */
let currentUser: string | null = null;

export function setOfflineUser(userId: string | null): void {
  currentUser = userId;
}

function read(): OfflineCache {
  try {
    return parseCache(localStorage.getItem(OFFLINE_STORAGE_KEY));
  } catch {
    return EMPTY_OFFLINE_CACHE;
  }
}

function write(cache: OfflineCache): void {
  try {
    localStorage.setItem(OFFLINE_STORAGE_KEY, serializeCache(cache));
  } catch {
    // Quota dépassé : on abandonne le cache plutôt que de le laisser à moitié
    // écrit. Le mode hors ligne se dégrade, l'app en ligne ne bouge pas.
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
    } catch {
      /* rien à faire de plus */
    }
  }
}

/** Range une réponse fraîche. Appelé après chaque `GET /api/*` réussi. */
export function rememberResponse(path: string, data: unknown, at: number = Date.now()): void {
  write(remember(read(), { path, data, at, user: currentUser }));
}

/** Relit une réponse. `null` = rien de connu pour ce chemin. */
export function recallResponse(path: string, now: number = Date.now()): OfflineEntry | null {
  return recall(read(), { path, user: currentUser, now });
}

/**
 * Reste-t-il des données d'un compte sur cet appareil ? C'est ce qui autorise
 * `RequireSession` à afficher l'app hors ligne au lieu de renvoyer sur la
 * Landing quand le jeton a expiré et ne peut pas être rafraîchi.
 */
export function hasOfflineData(): boolean {
  const cache = read();
  return Boolean(cache.user) && Object.keys(cache.entries).length > 0;
}

/** Déconnexion (SCREEN-22) : plus un chiffre ne reste sur l'appareil. */
export function clearOfflineData(): void {
  try {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
  } catch {
    /* déjà inaccessible */
  }
  currentUser = null;
}
