import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/lib/transactions/service";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import {
  idParamSchema,
  transactionUpdateSchema,
} from "@/lib/validation/schemas";

/**
 * GET    /api/transactions/:id — full detail (SCREEN-7).
 * PATCH  /api/transactions/:id — edit; reopens the same wizard pre-filled.
 * DELETE /api/transactions/:id — permanent (SCREEN-6 § 10).
 *
 * Ownership of the row AND of every id it references is checked server-side.
 * The derived balance (D3) recomputes itself — no reconciliation on edit/delete.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db500(label: string) {
  log.error(label, { missing: "SUPABASE_SERVICE_ROLE_KEY" });
  return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
}

export const GET = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500("transactions.unconfigured");
  const transaction = await getTransaction(db, user, id);
  return ok({ transaction });
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, transactionUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500("transactions.unconfigured");
  const result = await updateTransaction(db, user, id, input);
  log.info("transactions.updated", {
    userId: user.id,
    id,
    warning: result.warning?.code ?? null,
  });
  return ok(result);
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500("transactions.unconfigured");
  await deleteTransaction(db, user, id);
  log.info("transactions.deleted", { userId: user.id, id });
  return ok({ deleted: true });
});
