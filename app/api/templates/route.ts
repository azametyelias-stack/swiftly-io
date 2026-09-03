import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { createTemplate, listTemplates } from "@/lib/templates/service";
import { parseJsonBody } from "@/lib/validation/parse";
import { templateCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/templates — the caller's templates, names resolved (SCREEN-14).
 * POST /api/templates — create (full screen) or "Enregistrer comme template"
 * from a transaction's success screen (SCREEN-8/9 § 6). A recurring template
 * gets its `next_run_on` cursor set here (D2).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  try {
    const templates = await listTemplates(db, user.id);
    return ok({ templates });
  } catch (err) {
    log.error("templates.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, templateCreateSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const { id } = await createTemplate(db, user.id, input);
  log.info("templates.created", { userId: user.id, id });
  return ok({ template: { id } }, { status: 201 });
});
