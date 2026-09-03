import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import {
  createTransaction,
  listTransactions,
} from "@/lib/transactions/service";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import {
  transactionCreateSchema,
  transactionListQuerySchema,
} from "@/lib/validation/schemas";

/**
 * GET  /api/transactions — history list, keyset-paginated (SCREEN-6).
 * POST /api/transactions — create a transaction (SCREEN-8/9/10).
 *
 * Identity is from `withAuth`; every account / category / person id in the body
 * is re-checked against the caller in the service (BUILD-PLAN § LOT 3 · L3).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const { type, account, linked_to_type, linked_to_id, cursor, limit } =
    parseParams(
      Object.fromEntries(new URL(request.url).searchParams),
      transactionListQuerySchema,
    );

  const db = getServiceClient();
  if (!db) {
    log.error("transactions.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const page = await listTransactions(db, user.id, {
      type,
      account,
      linkedToType: linked_to_type,
      linkedToId: linked_to_id,
      cursor,
      limit,
    });
    return ok(page);
  } catch (err) {
    log.error("transactions.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, transactionCreateSchema);

  const db = getServiceClient();
  if (!db) {
    log.error("transactions.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  const result = await createTransaction(db, user, input);
  log.info("transactions.created", {
    userId: user.id,
    type: input.type,
    warning: result.warning?.code ?? null,
  });
  return ok(result, { status: 201 });
});
