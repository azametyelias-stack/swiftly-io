import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key.
 *
 * The service role bypasses RLS, so this must NEVER be imported into a Client
 * Component. It is used for privileged writes such as the consent audit trail.
 *
 * Graceful degradation: if SUPABASE_SERVICE_ROLE_KEY is not configured we return
 * null and the caller keeps working (the consent UX must never be blocked by a
 * missing env var). Add the key from Supabase → Project Settings → API.
 */

let cached: SupabaseClient | null | undefined;
let warned = false;

export function getServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    if (!warned) {
      console.warn(
        "[supabase] SUPABASE_SERVICE_ROLE_KEY not set — privileged writes " +
          "(e.g. consent audit trail) are disabled and will report persisted:false.",
      );
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
