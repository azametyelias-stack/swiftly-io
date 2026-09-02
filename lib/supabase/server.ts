import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import { log } from "@/lib/log/logger";

/**
 * Server-only Supabase client using the service-role key.
 *
 * The service role bypasses RLS, so this must NEVER be imported into a Client
 * Component (`import "server-only"` enforces it). It is used for privileged
 * writes such as the consent audit trail.
 *
 * Graceful degradation: if SUPABASE_SERVICE_ROLE_KEY is not configured we return
 * null and the caller keeps working (the consent UX must never be blocked by a
 * missing env var). Add the key from Supabase → Project Settings → API
 * (see .env.example).
 */

let cached: SupabaseClient | null | undefined;
let warned = false;

export function getServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = publicEnv.supabaseUrl;
  const serviceKey = serverEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    if (!warned) {
      log.warn("supabase.service_role_key_missing", {
        impact: "privileged writes (e.g. consent audit trail) disabled; persisted:false",
      });
      warned = true;
    }
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

let cachedAuth: SupabaseClient | null | undefined;

/**
 * Anon-key client used only to VERIFY an incoming access token
 * (`.auth.getUser(jwt)`). Safe to keep server-side; RLS-scoped. Returns null if
 * Supabase env is not configured.
 */
export function getAuthClient(): SupabaseClient | null {
  if (cachedAuth !== undefined) return cachedAuth;

  const url = publicEnv.supabaseUrl;
  const anonKey = publicEnv.supabaseAnonKey;

  cachedAuth =
    url && anonKey
      ? createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return cachedAuth;
}
