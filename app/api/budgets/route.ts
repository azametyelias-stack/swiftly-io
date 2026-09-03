import { withAuth } from "@/lib/auth/with-auth";
import { createBudget, listBudgets } from "@/lib/budgets/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation/parse";
import { budgetCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/budgets — the caller's budgets with this month's spend (SCREEN-15).
 * POST /api/budgets — create (one per category, DB-unique).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  try {
    const budgets = await listBudgets(db, user.id);
    return ok({ budgets });
  } catch (err) {
    log.error("budgets.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, budgetCreateSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const { id } = await createBudget(db, user.id, input);
  log.info("budgets.created", { userId: user.id, id });
  return ok({ id }, { status: 201 });
});
