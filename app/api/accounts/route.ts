import { withAuth } from "@/lib/auth/with-auth";
import { listAccounts } from "@/lib/dashboard/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/accounts — the caller's accounts with their derived balance
 * (SCREEN-4 § 9, SCREEN-17). Balance is `public.account_balance()` (D3).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) {
    log.error("accounts.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const accounts = await listAccounts(db, user.id);
    return ok({ accounts });
  } catch (err) {
    log.error("accounts.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});
