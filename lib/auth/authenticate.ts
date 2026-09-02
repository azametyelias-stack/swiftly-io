import "server-only";

import { getAuthClient } from "@/lib/supabase/server";
import { UnauthorizedError, TokenExpiredError } from "@/lib/http/errors";
import { isExpired } from "@/lib/auth/session";
import { log } from "@/lib/log/logger";

/**
 * The authenticated caller. Keep this minimal — pull extra profile fields from
 * `public.users` in the handler if needed, scoped by `id`.
 */
export type AuthUser = {
  id: string;
  email: string | null;
};

/** Extract the bearer token from an `Authorization: Bearer <jwt>` header. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

/**
 * Verify the request's access token and return the user (SECURITY MASTERPLAN —
 * Point 6, "authenticate"). Throws:
 *  - `TokenExpiredError` (401 `TOKEN_EXPIRED`) when the token is simply expired —
 *    the client refreshes and retries (Point 9);
 *  - `UnauthorizedError` (401) when it is missing, malformed, or rejected by
 *    Supabase Auth (bad signature, revoked, unknown user) — the client re-logs-in.
 *
 * MANTRA: never trust anything from the request body for identity — the user id
 * comes from here and nowhere else.
 */
export async function authenticate(request: Request): Promise<AuthUser> {
  const token = bearerToken(request);
  if (!token) throw new UnauthorizedError();

  // Cheap, deterministic expiry check before spending a network round-trip.
  if (isExpired(token)) throw new TokenExpiredError();

  const supabase = getAuthClient();
  if (!supabase) {
    // Misconfiguration, not the caller's fault — but we still cannot establish
    // identity, so the safe answer is "not authenticated".
    log.error("auth.supabase_not_configured");
    throw new UnauthorizedError();
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    // Lost the race (expired between our check and Supabase's) → let the client refresh.
    if (/expired|jwt/i.test(error?.message ?? "")) throw new TokenExpiredError();
    throw new UnauthorizedError();
  }

  return { id: data.user.id, email: data.user.email ?? null };
}
