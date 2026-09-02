import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation/parse";
import { profileCreateSchema } from "@/lib/validation/schemas";

/**
 * POST /api/auth/profile — completes the account after the invite code is
 * redeemed (SCREEN-3). Auth: the Supabase session issued at SCREEN-2
 * (`Authorization: Bearer`). Identity comes from `withAuth`, never the body.
 *
 * Side effect (DESIGN-RECONCILIATION D5): a "Compte Principal" is auto-created
 * at 0 F the first time the profile is completed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIMARY_ACCOUNT_NAME = "Compte Principal";

export const POST = withAuth(async (request, { user }) => {
  const { name } = await parseJsonBody(request, profileCreateSchema);

  // Service role: `withAuth` already proved identity; we mirror the privacy
  // endpoints and write server-side.
  const db = getServiceClient();
  if (!db) {
    log.error("auth.profile_unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("AUTH_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  const profile = await db
    .from("users")
    .upsert({ id: user.id, name }, { onConflict: "id" })
    .select("id, name")
    .single();
  if (profile.error) {
    log.error("auth.profile_upsert_failed", { reason: profile.error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }

  // Compte Principal — created once, idempotent under a race (unique index
  // accounts_one_primary_per_user → 23505 means someone beat us to it).
  const primary = await db
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (!primary.data) {
    const insert = await db.from("accounts").insert({
      user_id: user.id,
      name: PRIMARY_ACCOUNT_NAME,
      type: "cash",
      is_primary: true,
      initial_balance: 0,
      currency: "XOF",
    });
    if (insert.error && insert.error.code !== "23505") {
      log.error("auth.primary_account_create_failed", { reason: insert.error.message });
      return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
    }
  }

  log.info("auth.profile_ok", { userId: user.id });
  return ok({ user: profile.data });
});
