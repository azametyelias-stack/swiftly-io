"use client";

import { createApiClient } from "@/lib/http/client";
import { getBrowserClient } from "@/lib/supabase/client";

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
      });
    supabase.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token ?? null;
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

/** Parse a Swiftly REST envelope, throwing a plain Error on failure. */
export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await api.fetch(path, init);
  const body = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; error?: string; code?: string }
    | null;
  if (!res.ok || !body?.success) {
    const message = body && !body.success && body.error ? body.error : "Requête échouée.";
    const error = new Error(message) as Error & { status?: number; code?: string };
    error.status = res.status;
    if (body && !body.success) error.code = body.code;
    throw error;
  }
  return body.data;
}
