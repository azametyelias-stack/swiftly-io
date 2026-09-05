import { withAuth } from "@/lib/auth/with-auth";
import { listAlerts, markAllRead } from "@/lib/alerts/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { alertBulkSchema, alertListQuerySchema } from "@/lib/validation/schemas";

/**
 * GET   /api/alerts — the SCREEN-18 inbox for the caller.
 * PATCH /api/alerts — bulk "mark everything read".
 *
 * There is no POST: SCREEN-18 § 3 has no "+" in the header because alerts are
 * generated (daily cron), never authored. Letting a client insert one would
 * make the inbox forgeable.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const query = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    alertListQuerySchema,
  );
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  try {
    return ok(await listAlerts(db, user.id, query));
  } catch (err) {
    log.error("alerts.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const PATCH = withAuth(async (request, { user }) => {
  await parseJsonBody(request, alertBulkSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const updated = await markAllRead(db, user.id);
  log.info("alerts.read_all", { userId: user.id, updated });
  return ok({ updated });
});
