/**
 * Session / token lifetime helpers (SECURITY MASTERPLAN — Point 9: short access
 * token, long revocable refresh token).
 *
 * The masterplan describes a hand-rolled `jsonwebtoken` + `refresh_tokens` table.
 * Swiftly.io uses **Supabase Auth**, which already provides exactly this:
 *   - a short-lived access JWT (lifetime set in the Supabase dashboard — target
 *     `SESSION_POLICY.accessTokenTtlSeconds`);
 *   - an opaque refresh token in `auth.refresh_tokens` (Supabase-managed,
 *     server-side revocation, rotation + reuse detection);
 *   - `supabase.auth.refreshSession()` / `signOut()` for refresh / logout.
 * So there is nothing to install and no `public.refresh_tokens` to create.
 *
 * This module is the small amount of glue Supabase does NOT give us: reading a
 * token's expiry without a network call, deciding when to refresh, and mapping an
 * API failure to "refresh" vs "send the user back to login". Pure and
 * dependency-free (unit-tested in `tests/auth/session.test.ts`).
 */

/** Target lifetimes. `accessTokenTtlSeconds` must match Supabase → Auth → JWT expiry. */
export const SESSION_POLICY = {
  /** Access JWT: 15 minutes. Set the same value in the Supabase dashboard. */
  accessTokenTtlSeconds: 15 * 60,
  /** Refresh token: 30 days of inactivity before it dies. */
  refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
  /** Refresh this many seconds *before* the access token actually expires. */
  proactiveRefreshSkewSeconds: 60,
} as const;

/** Decode a JWT payload WITHOUT verifying the signature (that is the server's job). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("binary");
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** The `exp` claim in epoch seconds, or `null` if absent / unparseable. */
export function jwtExpiry(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp : null;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** True once the token is past its `exp` (a token with no `exp` is treated as expired). */
export function isExpired(token: string, now: number = nowSeconds()): boolean {
  const exp = jwtExpiry(token);
  if (exp === null) return true;
  return now >= exp;
}

/**
 * True when the token is expired OR close enough to expiry that we should refresh
 * now rather than let the next request 401. Drives proactive refresh.
 */
export function shouldRefresh(
  token: string,
  now: number = nowSeconds(),
  skew: number = SESSION_POLICY.proactiveRefreshSkewSeconds,
): boolean {
  const exp = jwtExpiry(token);
  if (exp === null) return true;
  return now + skew >= exp;
}

export type AuthFailureAction = "refresh" | "reauth" | "none";

/**
 * Given an API error response, decide what the client should do:
 *  - `refresh` — 401 `TOKEN_EXPIRED`: try `refreshSession()` then retry the request.
 *  - `reauth`  — any other 401: the session is gone, send the user to login.
 *  - `none`    — not an auth failure, handle it normally.
 */
export function classifyAuthFailure(input: { status: number; code?: string | null }): AuthFailureAction {
  if (input.status !== 401) return "none";
  return input.code === "TOKEN_EXPIRED" ? "refresh" : "reauth";
}
