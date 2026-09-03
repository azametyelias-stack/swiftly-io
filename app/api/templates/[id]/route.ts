import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import {
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/lib/templates/service";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { idParamSchema, templateUpdateSchema } from "@/lib/validation/schemas";

/**
 * GET    /api/templates/:id — single template (edit prefill).
 * PATCH  /api/templates/:id — edit; toggling recurrence (re)sets the cron cursor.
 * DELETE /api/templates/:id — permanent (SCREEN-14 § 6 swipe droite).
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
  const template = await getTemplate(db, user, id);
  return ok({ template });
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, templateUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500();
  const template = await updateTemplate(db, user, id, input);
  log.info("templates.updated", { userId: user.id, id });
  return ok({ template });
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await deleteTemplate(db, user, id);
  log.info("templates.deleted", { userId: user.id, id });
  return ok({ deleted: true });
});
