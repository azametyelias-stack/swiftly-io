import { withAuth } from "@/lib/auth/with-auth";
import { allocateToProject } from "@/lib/projects/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { idParamSchema, projectAllocateSchema } from "@/lib/validation/schemas";

/**
 * POST /api/projects/:id/allocate — "Affecter au solde" / "Retirer du solde" (D4).
 * Atomic; a positive allocation is refused (400) when the target account's
 * balance is insufficient — never a silent partial move.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, projectAllocateSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const result = await allocateToProject(db, user, id, input);
  log.info("projects.allocated", {
    userId: user.id,
    id,
    direction: input.direction,
  });
  return ok(result);
});
