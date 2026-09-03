/**
 * Server-side environment variables (SECURITY MASTERPLAN — Point 1).
 *
 * These are SECRETS: service-role keys, provider secret keys, webhook signing
 * secrets. They are read from `process.env` at runtime and MUST never reach the
 * browser.
 *
 * This module is a pure accessor over `process.env` (no secret values are baked
 * in) so it stays unit-testable, but it is still server-only by contract: NEVER
 * import it from a Client Component — client code reads config from
 * `lib/env/public.ts` instead. Consumers that pull in real secrets (e.g.
 * `lib/supabase/server.ts`) carry their own `import "server-only"` guard.
 *
 * Read secrets through `serverEnv()` / `requireServerEnv()` rather than touching
 * `process.env` directly, so there is one definition site per variable and a
 * missing required var fails loudly instead of silently becoming `undefined`.
 *
 * FOUNDATION Day 10 (PROMPT #INPUT §7): promote `KNOWN_SERVER_ENV` to a Zod
 * schema (format + presence rules per phase) and validate it from
 * `instrumentation.ts` on server startup.
 */

/** Every server-side secret the app knows about. Add new keys here. */
export type ServerEnvKey =
  // --- MVP ---
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "UPSTASH_REDIS_REST_URL"
  | "UPSTASH_REDIS_REST_TOKEN"
  | "SENTRY_DSN"
  | "ADMIN_USER_IDS"
  // Pepper for invite-code hashing (Point 19). Secret — a long random string,
  // kept OUT of the DB so a database leak alone can't brute-force the 6-digit
  // code space. Read via serverEnv() by the redeem / create-invitations routes.
  | "INVITE_CODE_PEPPER"
  // Shared secret for the daily cron worker (D2 — POST /api/cron/run). Vercel
  // Cron sends it as `Authorization: Bearer <CRON_SECRET>`. Empty ⇒ the endpoint
  // 404s. `openssl rand -base64 32`.
  | "CRON_SECRET"
  // CORS allow-list override (Point 13). Not a secret; read directly by the
  // dependency-free `lib/http/cors.ts` (runs in `proxy.ts`), not via serverEnv().
  | "CORS_ALLOWED_ORIGINS"
  // Log verbosity (Point 15): debug | info | warn | error. Not a secret; read
  // directly by `lib/log/logger.ts`. Empty ⇒ "info".
  | "LOG_LEVEL"
  // --- Phase 2 (structure ready, not used yet) ---
  | "PAYSTACK_SECRET_KEY"
  | "PAYSTACK_WEBHOOK_SECRET"
  | "SENDGRID_API_KEY"
  | "EMAIL_FROM"
  | "SMS_ACCOUNT_SID"
  | "SMS_AUTH_TOKEN"
  | "SMS_FROM_NUMBER";

/**
 * Return a server env var, or `undefined` when it is unset or empty.
 * Empty strings are treated as "not configured" so a blank line in `.env`
 * behaves the same as a missing one.
 */
export function serverEnv(key: ServerEnvKey): string | undefined {
  const value = process.env[key];
  return value !== undefined && value.length > 0 ? value : undefined;
}

/**
 * Return a server env var or throw. Use for values the current code path cannot
 * run without (e.g. a webhook secret inside the webhook handler). For optional
 * integrations that should degrade gracefully, use `serverEnv()` and null-check.
 */
export function requireServerEnv(key: ServerEnvKey): string {
  const value = serverEnv(key);
  if (value === undefined) {
    throw new Error(
      `[env] Missing required server environment variable: ${key}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}
