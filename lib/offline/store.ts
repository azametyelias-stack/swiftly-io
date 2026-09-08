/**
 * Le cache hors ligne — la partie pure.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RÈGLE : un chiffre servi depuis ce cache arrive TOUJOURS avec sa date.
 *
 * `public/sw.js` ne touche pas à `/api/` et n'y touchera jamais : un service
 * worker sert une réponse sans que l'interface sache d'où elle vient, donc un
 * solde périmé y serait indiscernable d'un solde frais. Le cache des données
 * vit donc ici, dans la couche applicative, où `at` remonte jusqu'au bandeau
 * « Hors ligne — données du … ». Le worker garde la coquille, cette couche
 * garde les chiffres, et seule celle-ci peut dater ce qu'elle affiche.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Le cache n'est lu QUE lorsque le réseau a échoué (`lib/http/api.ts`) : en
 * ligne, il ne peut jamais devancer une vraie réponse.
 *
 * Pur et sans import, pour que `node --test` le charge directement — les accès
 * à `localStorage` sont dans `lib/offline/cache.ts`.
 */

/** Clé `localStorage`. Effacée à la déconnexion (SCREEN-22). */
export const OFFLINE_STORAGE_KEY = "sf-offline-data";

/** Nombre maximum de réponses gardées, les plus anciennes partent d'abord. */
export const OFFLINE_MAX_ENTRIES = 60;

/**
 * Plafonds de taille. `localStorage` tourne autour de 5 Mo par origine et il
 * héberge déjà la session Supabase et les préférences : on s'en tient à une
 * fraction. Une réponse seule au-dessus de `ENTRY` (un historique très long)
 * n'est pas gardée plutôt que d'évincer tout le reste.
 */
export const OFFLINE_MAX_BYTES = 1_000_000;
export const OFFLINE_MAX_ENTRY_BYTES = 250_000;

/**
 * Passé ce délai, une donnée n'est plus servie du tout. Sept jours : au-delà,
 * « données du 31 août » sur un solde n'informe plus, il induit en erreur.
 */
export const OFFLINE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type OfflineEntry = {
  /** Epoch ms de la réponse réseau — c'est ce que le bandeau affiche. */
  at: number;
  data: unknown;
};

export type OfflineCache = {
  /** Le compte auquel ces réponses appartiennent. */
  user: string | null;
  entries: Record<string, OfflineEntry>;
};

export const EMPTY_OFFLINE_CACHE: OfflineCache = { user: null, entries: {} };

/**
 * Seules les lectures `/api/` sont gardées. Un POST/PATCH/DELETE ne se rejoue
 * pas et ne se met pas en file : hors ligne il échoue, visiblement.
 */
export function isCacheableRequest(path: string, method?: string): boolean {
  if ((method ?? "GET").toUpperCase() !== "GET") return false;
  return path.startsWith("/api/");
}

/** Tolérant : un JSON abîmé ou d'une ancienne forme repart d'un cache vide. */
export function parseCache(raw: string | null): OfflineCache {
  if (!raw) return EMPTY_OFFLINE_CACHE;
  try {
    const parsed = JSON.parse(raw) as Partial<OfflineCache> | null;
    if (!parsed || typeof parsed !== "object") return EMPTY_OFFLINE_CACHE;
    const entries = parsed.entries;
    if (!entries || typeof entries !== "object") return EMPTY_OFFLINE_CACHE;
    const clean: Record<string, OfflineEntry> = {};
    for (const [path, entry] of Object.entries(entries)) {
      if (entry && typeof entry === "object" && typeof (entry as OfflineEntry).at === "number") {
        clean[path] = { at: (entry as OfflineEntry).at, data: (entry as OfflineEntry).data };
      }
    }
    return { user: typeof parsed.user === "string" ? parsed.user : null, entries: clean };
  } catch {
    return EMPTY_OFFLINE_CACHE;
  }
}

export function serializeCache(cache: OfflineCache): string {
  return JSON.stringify(cache);
}

function sizeOf(cache: OfflineCache): number {
  return serializeCache(cache).length;
}

/**
 * Applique les plafonds : l'âge d'abord, puis le nombre, puis la taille — en
 * évinçant toujours l'entrée la plus ancienne.
 */
export function pruneCache(cache: OfflineCache, now: number): OfflineCache {
  const kept = Object.entries(cache.entries).filter(([, e]) => now - e.at <= OFFLINE_MAX_AGE_MS);
  // Plus récent en tête, pour que `pop()` retire toujours le plus ancien.
  kept.sort((a, b) => b[1].at - a[1].at);
  while (kept.length > OFFLINE_MAX_ENTRIES) kept.pop();

  let next: OfflineCache = { user: cache.user, entries: Object.fromEntries(kept) };
  while (kept.length > 0 && sizeOf(next) > OFFLINE_MAX_BYTES) {
    kept.pop();
    next = { user: cache.user, entries: Object.fromEntries(kept) };
  }
  return next;
}

/**
 * Range une réponse. Changer de compte vide le cache : les chiffres d'un compte
 * ne doivent jamais s'afficher sous le nom d'un autre.
 */
export function remember(
  cache: OfflineCache,
  input: { path: string; data: unknown; at: number; user: string | null },
): OfflineCache {
  const entry: OfflineEntry = { at: input.at, data: input.data };
  if (JSON.stringify(entry).length > OFFLINE_MAX_ENTRY_BYTES) return cache;

  const base: OfflineCache =
    cache.user === input.user ? cache : { user: input.user, entries: {} };

  return pruneCache(
    { user: input.user, entries: { ...base.entries, [input.path]: entry } },
    input.at,
  );
}

/**
 * Relit une réponse. `user` vaut `null` quand la session n'est pas lisible —
 * le cas normal hors ligne, jeton expiré et rafraîchissement impossible. Ce
 * n'est pas une faille : le cache est effacé à la déconnexion, donc ce qu'il
 * reste appartient au dernier compte connecté sur cet appareil, c'est-à-dire à
 * la personne qui tient le téléphone.
 */
export function recall(
  cache: OfflineCache,
  input: { path: string; user: string | null; now: number },
): OfflineEntry | null {
  if (input.user && cache.user && cache.user !== input.user) return null;
  const entry = cache.entries[input.path];
  if (!entry) return null;
  if (input.now - entry.at > OFFLINE_MAX_AGE_MS) return null;
  return entry;
}

/**
 * « Le réseau n'a pas répondu », par opposition à « le serveur a répondu non ».
 *
 * `fetch` rejette avec un `TypeError` quand la requête n'aboutit pas (avion,
 * tunnel, DNS mort). Les erreurs d'enveloppe fabriquées par `apiJson` portent
 * un `status` numérique : un 401 ou un 500 est une réponse, pas une absence de
 * réseau, et ne doit jamais faire ressortir un chiffre périmé.
 */
export function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (typeof (error as { status?: unknown }).status === "number") return false;
  return (error as { name?: unknown }).name === "TypeError";
}
