import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody } from "@/lib/validation/parse";
import { personCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/people — the caller's "Lié à" people (SCREEN-8/9 § 2).
 * POST /api/people — create one on the fly from the transaction form.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_request, { user }) => {
  const db = getServiceClient();
  if (!db) {
    log.error("people.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  const { data, error } = await db
    .from("people")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (error) {
    log.error("people.list_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ people: data ?? [] });
});

export const POST = withAuth(async (request, { user }) => {
  const { name } = await parseJsonBody(request, personCreateSchema);
  const db = getServiceClient();
  if (!db) {
    log.error("people.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  const { data, error } = await db
    .from("people")
    .insert({ user_id: user.id, name })
    .select("id, name")
    .single();
  if (error) {
    log.error("people.create_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ person: data }, { status: 201 });
});
