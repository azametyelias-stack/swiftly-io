import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/me — the caller's profile row (name + preferences). Used by the
 * dashboard greeting and, later, SCREEN-22. Returns 404 when the invite flow
 * hasn't completed the profile yet (SCREEN-3).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) {
    log.error("me.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  const { data, error } = await db
    .from("users")
    .select("id, name, preferred_currency, theme, language, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    log.error("me.read_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  if (!data) return fail("PROFILE_INCOMPLETE", "Profil incomplet.", 404);

  return ok({ user: { ...data, email: user.email } });
});
