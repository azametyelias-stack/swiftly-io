"use client";

import { createApiClient } from "@/lib/http/client";
import { getBrowserClient } from "@/lib/supabase/client";
import { getMessages, isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/useMessages";
import { recallResponse, rememberResponse, setOfflineUser } from "@/lib/offline/cache";
import { markFresh, markServedFromCache, markUnreachable } from "@/lib/offline/status";
import { isCacheableRequest, isNetworkFailure } from "@/lib/offline/store";

/**
 * The browser API client every screen uses for authenticated calls
 * (`api.fetch("/api/dashboard?…")`). Wires `lib/http/client.ts` to the Supabase
 * browser session — SECURITY MASTERPLAN Point 9: on `401 TOKEN_EXPIRED` it
 * refreshes once and replays, transparently.
 *
 * The access token is read from a module variable kept fresh by Supabase's own
 * `onAuthStateChange` (per lib/auth/README.md), so a retry always sends the new
 * token even though the client instance is a singleton.
 */

let accessToken: string | null = null;

if (typeof window !== "undefined") {
  const supabase = getBrowserClient();
  if (supabase) {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        accessToken = data.session?.access_token ?? null;
        setOfflineUser(data.session?.user.id ?? null);
      });
    supabase.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token ?? null;
      // Le cache hors ligne suit le compte : une session qui change fait
      // repartir `remember()` de zéro plutôt que d'empiler deux comptes.
      setOfflineUser(session?.user.id ?? null);
    });
  }
}

export const api = createApiClient({
  authHeader: () => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  },
  refreshSession: async () => {
    const supabase = getBrowserClient();
    if (!supabase) return false;
    return !(await supabase.auth.refreshSession()).error;
  },
  onSessionExpired: () => {
    // Hard reset to the landing page — the session is gone, not just stale.
    if (typeof window !== "undefined") {
      window.location.assign(`${window.location.origin}/`);
    }
  },
});

/** `code` porté par l'erreur levée quand le réseau manque. */
export const OFFLINE_ERROR_CODE = "OFFLINE";

export type ApiError = Error & { status?: number; code?: string };

function currentLocale(): Locale {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(value)) return value;
  } catch {
    /* stockage indisponible */
  }
  return DEFAULT_LOCALE;
}

function offlineError(kind: "write" | "read"): ApiError {
  const messages = getMessages(currentLocale()).offline;
  const error = new Error(
    kind === "write" ? messages.writeBlocked : messages.readBlocked,
  ) as ApiError;
  error.code = OFFLINE_ERROR_CODE;
  return error;
}

/**
 * Parse a Swiftly REST envelope, throwing a plain Error on failure.
 *
 * Le point unique où le mode hors ligne s'applique — les 22 écrans passent
 * tous par ici, aucun n'a été modifié :
 *
 *  - `GET /api/*` réussi → la réponse est rangée, datée, et le bandeau tombe ;
 *  - `GET /api/*` sans réseau → la dernière réponse connue est renvoyée, et le
 *    bandeau « Hors ligne — données du … » s'affiche avec sa date. L'écran ne
 *    sait pas la différence, mais l'utilisateur, lui, la voit ;
 *  - écriture sans réseau → échec net, message explicite. Rien n'est mis en
 *    file d'attente : une dépense rejouée plus tard, c'est un doublon ou un
 *    solde faux, et ça ne se répare pas tout seul ;
 *  - une VRAIE réponse d'erreur (401, 500…) reste une erreur. Le cache ne sert
 *    jamais de filet à un serveur qui répond non.
 */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const cacheable = isCacheableRequest(path, init?.method);

  let res: Response;
  try {
    res = await api.fetch(path, init);
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;

    if (cacheable) {
      const cached = recallResponse(path);
      if (cached) {
        markServedFromCache(path, cached.at);
        return cached.data as T;
      }
    }
    markUnreachable();
    throw offlineError(cacheable ? "read" : "write");
  }

  const body = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; error?: string; code?: string }
    | null;
  if (!res.ok || !body?.success) {
    const message = body && !body.success && body.error ? body.error : "Requête échouée.";
    const error = new Error(message) as ApiError;
    error.status = res.status;
    if (body && !body.success) error.code = body.code;
    throw error;
  }

  markFresh(path);
  if (cacheable) rememberResponse(path, body.data);
  return body.data;
}
