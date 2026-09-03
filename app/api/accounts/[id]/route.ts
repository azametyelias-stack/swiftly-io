import { withAuth } from "@/lib/auth/with-auth";
import {
  deleteAccount,
  getAccountCard,
  updateAccount,
} from "@/lib/accounts/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { accountUpdateSchema, idParamSchema } from "@/lib/validation/schemas";

/**
 * GET    /api/accounts/:id — full card + tx count (SCREEN-17 § 8).
 * PATCH  /api/accounts/:id — edit, or the favori / archivé toggles.
 * DELETE /api/accounts/:id — hard delete when unused, else archive (soft).
 *                            The primary account is never deletable (D5).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db500() {
  log.error("accounts.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
  return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
}

export const GET = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  const account = await getAccountCard(db, user, id);
  return ok({ account });
});

export const PATCH = withAuth(async (request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const input = await parseJsonBody(request, accountUpdateSchema);
  const db = getServiceClient();
  if (!db) return db500();
  await updateAccount(db, user, id, input);
  const account = await getAccountCard(db, user, id);
  log.info("accounts.updated", { userId: user.id, id });
  return ok({ account });
});

export const DELETE = withAuth(async (_request, { params, user }) => {
  const { id } = parseParams(params, idParamSchema);
  const db = getServiceClient();
  if (!db) return db500();
  const result = await deleteAccount(db, user, id);
  log.info("accounts.deleted", { userId: user.id, id, ...result });
  return ok(result);
});
