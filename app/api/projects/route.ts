import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/projects — minimal list for the transaction form's "Lié à → Projet"
 * picker (SCREEN-8/9 § 2). The full Projets screen (16) is built in Lot 5.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) {
    log.error("projects.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  const { data, error } = await db
    .from("projects")
    .select("id, name, status")
    .eq("user_id", user.id)
    .in("status", ["active", "paused", "onhold"])
    .order("created_at", { ascending: true });
  if (error) {
    log.error("projects.list_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ projects: data ?? [] });
});
