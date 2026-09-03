import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { NotFoundError } from "@/lib/http/errors";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation/parse";
import { templateCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/templates — the caller's templates (dashboard strip / SCREEN-14).
 * POST /api/templates — "Enregistrer comme template" from a transaction's
 * success screen (SCREEN-8/9 § 6). The full Templates screen is Lot 5; this is
 * the "création à la volée" the BUILD-PLAN calls for.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const { data, error } = await db
    .from("templates")
    .select(
      "id, name, description, kind, amount, category_id, linked_to_type, linked_to_id, account_id, recurrence, is_favorite, usage_count",
    )
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    log.error("templates.list_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ templates: data ?? [] });
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, templateCreateSchema);

  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);

  // Re-check every referenced id belongs to the caller (or is a system category).
  if (input.account_id) {
    const { data } = await db
      .from("accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", input.account_id)
      .maybeSingle();
    if (!data) throw new NotFoundError("Compte introuvable.");
  }
  if (input.category_id) {
    const { data } = await db
      .from("categories")
      .select("id, kind, user_id")
      .eq("id", input.category_id)
      .maybeSingle();
    if (!data || (data.user_id !== null && data.user_id !== user.id)) {
      throw new NotFoundError("Catégorie introuvable.");
    }
  }
  if (input.linked_to_type && input.linked_to_id) {
    const table = input.linked_to_type === "person" ? "people" : "projects";
    const { data } = await db
      .from(table)
      .select("id")
      .eq("user_id", user.id)
      .eq("id", input.linked_to_id)
      .maybeSingle();
    if (!data) throw new NotFoundError("« Lié à » introuvable.");
  }

  const { data, error } = await db
    .from("templates")
    .insert({ ...input, user_id: user.id })
    .select("id, name")
    .single();
  if (error) {
    log.error("templates.create_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  log.info("templates.created", { userId: user.id, id: data.id });
  return ok({ template: data }, { status: 201 });
});
