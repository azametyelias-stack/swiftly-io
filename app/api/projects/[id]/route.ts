import { withAuth } from "@/lib/auth/with-auth";
import {
  deleteProject,
  getProject,
  updateProject,
} from "@/lib/projects/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { idParamSchema, projectUpdateSchema } from "@/lib/validation/schemas";

/**
 * GET    /api/projects/:id — project + linked transactions + target account balance.
 * PATCH  /api/projects/:id — edit (incl. "marquer achevé").
 * DELETE /api/projects/:id — permanent (linked transactions keep their link id).
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
  const result = await getProject(db, user, id);
  return ok(result);
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, projectUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await updateProject(db, user, id, input);
  const result = await getProject(db, user, id);
  log.info("projects.updated", { userId: user.id, id });
  return ok(result);
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await deleteProject(db, user, id);
  log.info("projects.deleted", { userId: user.id, id });
  return ok({ deleted: true });
});
