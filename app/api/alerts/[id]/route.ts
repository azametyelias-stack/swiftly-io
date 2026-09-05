import { withAuth } from "@/lib/auth/with-auth";
import { deleteAlert, getAlert, setAlertRead } from "@/lib/alerts/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { alertUpdateSchema, idParamSchema } from "@/lib/validation/schemas";

/**
 * GET    /api/alerts/:id — one alert, for the detail screen (SCREEN-18 § 8).
 * PATCH  /api/alerts/:id — read / unread, the only mutable field.
 * DELETE /api/alerts/:id — swipe-left, permanent (§ 7).
 *
 * Every handler resolves the row through `getAlert`, which runs
 * `assertOwnership` — so a valid id belonging to another user is a 403, not a
 * silent read.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db500() {
  return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
}

export const GET = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  return ok({ alert: await getAlert(db, user, id) });
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const { read } = await parseJsonBody(request, alertUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500();
  const alert = await setAlertRead(db, user, id, read);
  return ok({ alert });
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await deleteAlert(db, user, id);
  log.info("alerts.deleted", { userId: user.id, id });
  return ok({ deleted: true });
});
