/**
 * Public environment variables (SECURITY MASTERPLAN — Point 1: API keys in env,
 * never hardcoded).
 *
 * Everything here is `NEXT_PUBLIC_*` and is inlined into the browser bundle at
 * build time, so it must contain NO secrets — only values that are safe to ship
 * to the client (project URL, anon key, analytics id, public app URL).
 *
 * Import from this module instead of reading `process.env` directly so every
 * variable has a single definition site. The member accesses below are static
 * (`process.env.NEXT_PUBLIC_FOO`) on purpose — Next.js only inlines static
 * references, never dynamic `process.env[key]` lookups.
 *
 * FOUNDATION Day 10 (PROMPT #INPUT §7): tighten these into a Zod schema with
 * format checks (URL, `G-` prefix, …) and fail the build on malformed values.
 */

export const publicEnv = {
  /** Supabase project URL, e.g. https://xxxx.supabase.co */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  /** Supabase anon (publishable) key — safe for the browser, RLS-scoped. */
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  /** GA4 measurement id (e.g. G-XXXXXXXXXX). Empty ⇒ analytics stays inert. */
  gaId: process.env.NEXT_PUBLIC_GA_ID,
  /** Canonical public origin, used for absolute URLs. */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
