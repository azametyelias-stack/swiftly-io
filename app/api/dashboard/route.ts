import { withAuth } from "@/lib/auth/with-auth";
import { getDashboard } from "@/lib/dashboard/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseParams } from "@/lib/validation/parse";
import { dashboardQuerySchema } from "@/lib/validation/schemas";

/**
 * GET /api/dashboard?account=<uuid>&period=day|week|month|year — the balance,
 * period breakdown (début / revenus / dépenses), variation vs the equivalent
 * previous period, and the balance curve (SCREEN-4 § 3-5).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const { account, period } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    dashboardQuerySchema,
  );

  const db = getServiceClient();
  if (!db) {
    log.error("dashboard.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const payload = await getDashboard(db, user.id, account ?? null, period);
    if (!payload) return fail("NOT_FOUND", "Compte introuvable.", 404);
    return ok(payload);
  } catch (err) {
    log.error("dashboard.read_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});
