import { bearerToken } from "@/lib/auth/authenticate";
import { todayISO } from "@/lib/format/date";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { runDailyCron } from "@/lib/recurrence/service";
import { getServiceClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env/server";

/**
 * POST /api/cron/run — the daily recurrence + fee worker (D2).
 *
 * Machine-to-machine, NOT `withAuth`: gated on a bearer equal to `CRON_SECRET`
 * (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically). No
 * user session — `runDailyCron` iterates every user on the service client.
 * Returns 404 when unconfigured so the endpoint is invisible without the secret.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request): Promise<Response> {
  const secret = serverEnv("CRON_SECRET");
  if (!secret) {
    return fail("NOT_FOUND", "Ressource introuvable.", 404);
  }
  const token = bearerToken(request);
  if (token !== secret) {
    log.warn("cron.unauthorized");
    return fail("UNAUTHORIZED", "Authentification requise.", 401);
  }

  const db = getServiceClient();
  if (!db) {
    log.error("cron.unconfigured", { missing: "SUPABASE_SERVICE_ROLE_KEY" });
    return fail("SERVICE_UNAVAILABLE", "Le service est indisponible.", 503);
  }

  try {
    const summary = await runDailyCron(db, todayISO());
    log.info("cron.completed", { ...summary });
    return ok(summary);
  } catch (err) {
    log.error("cron.failed", { err });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }
}

export const POST = handle;
// Vercel Cron issues a GET; accept both.
export const GET = handle;
