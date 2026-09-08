import { withAuth } from "@/lib/auth/with-auth";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import {
  peopleListQuerySchema,
  personCreateSchema,
} from "@/lib/validation/schemas";

/**
 * GET  /api/people?kind=expense|income — the caller's "Lié à" people for that
 *      side of the form (SCREEN-8/9 § 2). Le carnet du revenu (« qui m'a
 *      payé ») et celui de la dépense (« à qui j'ai payé ») sont deux listes
 *      distinctes : sans `kind` on rend tout, comme avant, pour ne pas casser
 *      un client servi depuis le cache du service worker.
 * POST /api/people — create one on the fly from the transaction form, dans le
 *      carnet du formulaire ouvert.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { user }) => {
  const { kind } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    peopleListQuerySchema,
  );
  const db = getServiceClient();
  if (!db) {
    log.error("people.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  let q = db
    .from("people")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name", { ascending: true });
  if (kind) q = q.eq("kind", kind);

  const { data, error } = await q;
  if (error) {
    log.error("people.list_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ people: data ?? [] });
});

export const POST = withAuth(async (request, { user }) => {
  const { name, kind } = await parseJsonBody(request, personCreateSchema);
  const db = getServiceClient();
  if (!db) {
    log.error("people.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }
  const { data, error } = await db
    .from("people")
    .insert({ user_id: user.id, name, kind: kind ?? "expense" })
    .select("id, name")
    .single();
  if (error) {
    log.error("people.create_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
  return ok({ person: data }, { status: 201 });
});
