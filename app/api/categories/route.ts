import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseParams } from "@/lib/validation/parse";
import { categoryListQuerySchema } from "@/lib/validation/schemas";

/**
 * GET /api/categories?kind=expense|income — the categories the caller can pick
 * in the transaction form (SCREEN-8/9 § 2): the system set plus their own.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const { kind } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    categoryListQuerySchema,
  );

  const db = getServiceClient();
  if (!db) {
    log.error("categories.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  let q = db
    .from("categories")
    .select("id, name, kind, color, axis, is_system")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });
  if (kind) q = q.eq("kind", kind);

  const { data, error } = await q;
  if (error) {
    log.error("categories.list_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ categories: data ?? [] });
});
