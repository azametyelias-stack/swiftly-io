import { withAuth } from "@/lib/auth/with-auth";
import { deleteBudget, getBudget, updateBudget } from "@/lib/budgets/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { budgetUpdateSchema, idParamSchema } from "@/lib/validation/schemas";

/**
 * GET    /api/budgets/:id — budget + this month's transactions in the category.
 * PATCH  /api/budgets/:id — edit montant / favori.
 * DELETE /api/budgets/:id — permanent.
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
  const result = await getBudget(db, user, id);
  return ok(result);
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, budgetUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await updateBudget(db, user, id, input);
  const result = await getBudget(db, user, id);
  log.info("budgets.updated", { userId: user.id, id });
  return ok(result);
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await deleteBudget(db, user, id);
  log.info("budgets.deleted", { userId: user.id, id });
  return ok({ deleted: true });
});
