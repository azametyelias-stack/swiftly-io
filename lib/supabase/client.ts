/**
 * Browser Supabase client — the one the UI uses to hold the session and call
 * `auth.*` (sign-in with the invite code in Lot 1, refresh, sign-out).
 *
 * Anon key only (RLS-scoped, safe in the bundle — SECURITY MASTERPLAN Point 7).
 * NEVER import `@/lib/supabase/server` from a component; this is its client-side
 * counterpart. `persistSession` keeps the user logged in across reloads;
 * `autoRefreshToken` renews the short access JWT in the background (Point 9).
 *
 * Returns `null` when Supabase env is not configured so callers can degrade
 * gracefully rather than throw at import time.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";

let cached: SupabaseClient | null | undefined;

export function getBrowserClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const { supabaseUrl, supabaseAnonKey } = publicEnv;
  cached =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        })
      : null;
  return cached;
}
