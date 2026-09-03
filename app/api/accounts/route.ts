import { z } from "zod";

import { withAuth } from "@/lib/auth/with-auth";
import { createAccount, listAccountCards } from "@/lib/accounts/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { accountCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/accounts        — the caller's accounts + derived balance (D3).
 *   ?archived=1 also returns archived accounts (SCREEN-17 detail / management).
 * POST /api/accounts        — create an account (SCREEN-17 § 7). Never primary.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listQuerySchema = z
  .object({ archived: z.enum(["0", "1"]).optional() })
  .strict();

export const GET = withAuth(async (request, { user }) => {
  const db = getServiceClient();
  if (!db) {
    log.error("accounts.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  const { archived } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    listQuerySchema,
  );
  try {
    const accounts = await listAccountCards(db, user.id, {
      includeArchived: archived === "1",
    });
    return ok({ accounts });
  } catch (err) {
    log.error("accounts.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, accountCreateSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const { id } = await createAccount(db, user.id, input);
  log.info("accounts.created", { userId: user.id, id });
  return ok({ id }, { status: 201 });
});
