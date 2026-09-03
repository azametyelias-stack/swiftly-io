import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { getStats } from "@/lib/stats/service";
import { parseParams } from "@/lib/validation/parse";
import { statsQuerySchema } from "@/lib/validation/schemas";

/**
 * GET /api/stats?mode=&period=&account=&expense_by=&income_by= — SCREEN-11.
 * Overview + breakdowns follow the account selector; the Score is always global.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const q = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    statsQuerySchema,
  );

  const db = getServiceClient();
  if (!db) {
    log.error("stats.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const payload = await getStats(db, user.id, q);
    if (!payload) return fail("NOT_FOUND", "Compte introuvable.", 404);
    return ok(payload);
  } catch (err) {
    log.error("stats.read_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});
