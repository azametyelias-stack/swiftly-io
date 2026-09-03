import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { getReport } from "@/lib/stats/service";
import { parseParams } from "@/lib/validation/parse";
import { reportQuerySchema } from "@/lib/validation/schemas";

/**
 * GET /api/report?period=YYYY-MM — SCREEN-12. Returns the available completed
 * periods plus the report for `period` (or the most recent one). Content is
 * computed on the fly from the period's transactions (§ 5). Score + criteria are
 * global; D6 scope = sections 1-6 + 10.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const { period } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    reportQuerySchema,
  );

  const db = getServiceClient();
  if (!db) {
    log.error("report.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const payload = await getReport(db, user.id, period);
    return ok(payload);
  } catch (err) {
    log.error("report.read_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});
