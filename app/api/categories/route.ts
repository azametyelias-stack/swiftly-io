import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import {
  categoryCreateSchema,
  categoryListQuerySchema,
} from "@/lib/validation/schemas";

/**
 * GET  /api/categories?kind=expense|income — the categories the caller can pick
 *      in the transaction form (SCREEN-8/9 § 2): the system set plus their own.
 * POST /api/categories — create one on the fly from the "+ Créer une catégorie"
 *      action inside the picker (SCREEN-8/9 § 2). Name + kind only; colour is a
 *      neutral default the user can change later.
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

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, categoryCreateSchema);

  const db = getServiceClient();
  if (!db) {
    log.error("categories.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  const { data, error } = await db
    .from("categories")
    .insert({
      user_id: user.id,
      name: input.name,
      kind: input.kind,
      color: input.color,
      axis: input.axis ?? null,
    })
    .select("id, name, kind, color, axis, is_system")
    .single();
  if (error) {
    log.error("categories.create_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }

  log.info("categories.created", { userId: user.id, id: data.id });
  return ok({ category: data }, { status: 201 });
});
