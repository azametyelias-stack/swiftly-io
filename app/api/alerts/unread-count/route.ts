import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/alerts/unread-count — the number for the "Alertes & notifications"
 * badge in the menu (SCREEN-5 § 8, answered by the Lot 2 design pass). The
 * alerts inbox itself is SCREEN-18 (Lot 6).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) return ok({ count: 0 });

  const { count, error } = await db
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  if (error) {
    log.error("alerts.unread_count_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }

  return ok({ count: count ?? 0 });
});
