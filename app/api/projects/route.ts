import { z } from "zod";

import { withAuth } from "@/lib/auth/with-auth";
import { createProject, listProjects } from "@/lib/projects/service";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";
import { parseJsonBody, parseParams } from "@/lib/validation/parse";
import { projectCreateSchema } from "@/lib/validation/schemas";

/**
 * GET  /api/projects               — full list for SCREEN-16 (spent + progress).
 * GET  /api/projects?scope=picker  — minimal active list for the "Lié à → Projet"
 *                                    picker (SCREEN-8/9 § 2).
 * POST /api/projects               — create (SCREEN-16 § 8).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z
  .object({ scope: z.enum(["picker"]).optional() })
  .strict();

export const GET = withAuth(async (request, { user }) => {
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);

  const { scope } = parseParams(
    Object.fromEntries(new URL(request.url).searchParams),
    querySchema,
  );

  try {
    if (scope === "picker") {
      const { data, error } = await db
        .from("projects")
        .select("id, name, status")
        .eq("user_id", user.id)
        .in("status", ["active", "paused", "onhold"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ok({ projects: data ?? [] });
    }
    const projects = await listProjects(db, user.id);
    return ok({ projects });
  } catch (err) {
    log.error("projects.list_failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
});

export const POST = withAuth(async (request, { user }) => {
  const input = await parseJsonBody(request, projectCreateSchema);
  const db = getServiceClient();
  if (!db) return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  const { id } = await createProject(db, user.id, input);
  log.info("projects.created", { userId: user.id, id });
  return ok({ id }, { status: 201 });
});
