/**
 * Browser API client with transparent token refresh (SECURITY MASTERPLAN —
 * Point 9, step 4: "si expiré → 401 TOKEN_EXPIRED → /refresh → retry → l'user ne
 * remarque rien").
 *
 * On a `401 { code: "TOKEN_EXPIRED" }` it calls `refreshSession` once, then
 * replays the request one time. Any other 401 means the session is really gone —
 * it fires `onSessionExpired` and returns the response untouched. Concurrent
 * requests that all 401 share a single refresh.
 *
 * With Supabase Auth, `refreshSession` is
 * `async () => !(await supabase.auth.refreshSession()).error` and `authHeader` is
 * `() => ({ Authorization: 'Bearer ' + session.access_token })`.
 *
 * Dependency-free (no `@/` imports, no `server-only`) so it is unit-testable with
 * a fake `fetch` — see `tests/http/client.test.ts`.
 */

const TOKEN_EXPIRED_CODE = "TOKEN_EXPIRED"; // keep in sync with lib/http/errors.ts

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ApiClientOptions = {
  /** Defaults to the global `fetch`. */
  fetch?: FetchLike;
  /** Obtain a new session. Return `true` on success, `false` if the user must re-login. */
  refreshSession: () => Promise<boolean>;
  /** Fresh auth headers, re-read on every (re)try so the retry uses the new token. */
  authHeader?: () => Record<string, string>;
  /** Called when the session cannot be recovered (non-expiry 401, or refresh failed). */
  onSessionExpired?: () => void;
};

async function isTokenExpired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  try {
    const body = (await res.clone().json()) as { code?: unknown };
    return body?.code === TOKEN_EXPIRED_CODE;
  } catch {
    return false;
  }
}

export type ApiClient = {
  /** Same signature as `fetch`, with refresh-and-retry baked in. */
  fetch: FetchLike;
};

export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  let inFlightRefresh: Promise<boolean> | null = null;

  const withAuth = (init?: RequestInit): RequestInit => {
    const extra = options.authHeader?.() ?? {};
    return { ...init, headers: { ...(init?.headers as Record<string, string>), ...extra } };
  };

  const refreshOnce = (): Promise<boolean> => {
    inFlightRefresh ??= options.refreshSession().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  };

  const apiFetch: FetchLike = async (input, init) => {
    const first = await doFetch(input, withAuth(init));

    if (!(await isTokenExpired(first))) {
      if (first.status === 401) options.onSessionExpired?.();
      return first;
    }

    const refreshed = await refreshOnce();
    if (!refreshed) {
      options.onSessionExpired?.();
      return first;
    }

    const second = await doFetch(input, withAuth(init));
    if (second.status === 401) options.onSessionExpired?.();
    return second;
  };

  return { fetch: apiFetch };
}
