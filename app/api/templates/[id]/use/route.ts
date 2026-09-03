import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { getServiceClient } from "@/lib/supabase/server";
import { bumpTemplateUsage } from "@/lib/templates/service";
import { parseParams } from "@/lib/validation/parse";
import { idParamSchema } from "@/lib/validation/schemas";

/**
 * POST /api/templates/:id/use — increment the "plus utilisé" counter after the
 * user confirms the transaction launched from this template (SCREEN-14 § 4/6).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  await bumpTemplateUsage(db, user, id);
  return ok({ ok: true });
});
