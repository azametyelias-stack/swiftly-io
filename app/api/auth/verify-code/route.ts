import { inviteSignupSchema } from "@/lib/auth/schemas";
import {
  inviteCodeHash,
  isValidInviteCodeShape,
  normalizeInviteCode,
} from "@/lib/auth/invite-codes";
import { mintInviteSession } from "@/lib/auth/invite-session";
import { assertInviteAttemptAllowed, RateLimitError } from "@/lib/auth/rate-limit";
import { AUTH_INVALID_CODE, AUTH_MESSAGES } from "@/lib/auth/responses";
import { withMinimumDuration } from "@/lib/auth/timing";
import { serverEnv } from "@/lib/env/server";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { getServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/verify-code — closed-beta sign-in (SCREEN-2, MASTERPLAN Point 19).
 *
 * Body: `{ code: "123456" }`. On success returns a magic-link handoff the
 * browser exchanges for a Supabase session (`verifyOtp`).
 *
 * Point 16: ONE generic message for unknown / used / expired — the differentiated
 * SCREEN-2 copy ("Code expiré", …) only comes back once Point 3 rate-limiting is
 * enforced (see lib/auth/rate-limit.ts). The Lot 1 visual already shows a single
 * "Code invalide. Vérifiez et réessayez."
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertInviteAttemptAllowed(clientIp(request));
  } catch (limitErr) {
    if (limitErr instanceof RateLimitError) {
      return fail("RATE_LIMITED", limitErr.message, 429);
    }
    throw limitErr;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("VALIDATION_ERROR", "Corps de requête JSON invalide.", 400);
  }

  const parsed = inviteSignupSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Données invalides.", 400, parsed.error.flatten());
  }

  const pepper = serverEnv("INVITE_CODE_PEPPER");
  const db = getServiceClient();
  if (!pepper || !db) {
    log.error("auth.verify_code_unconfigured", {
      missing: !pepper ? "INVITE_CODE_PEPPER" : "SUPABASE_SERVICE_ROLE_KEY",
    });
    return fail("AUTH_UNAVAILABLE", "Le service d'authentification est indisponible.", 503);
  }

  // Flat wall-clock time: an unknown code (fast) must be indistinguishable from a
  // valid one that mints a session (slow) — Point 16.
  return withMinimumDuration(250, async () => {
    const code = normalizeInviteCode(parsed.data.code);
    if (!isValidInviteCodeShape(code)) {
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }

    const nowIso = new Date().toISOString();

    // Atomic claim — the WHERE clause is the guard, so the same code can't be
    // spent twice under a race (supabase/migrations/0003_invitation_codes.sql).
    const { data: claimed, error: claimError } = await db
      .from("invitation_codes")
      .update({ used_at: nowIso })
      .eq("code_hash", inviteCodeHash(code, pepper))
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("id")
      .maybeSingle();

    if (claimError) {
      log.error("auth.verify_code_failed", { reason: claimError.message });
      return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
    }
    if (!claimed) {
      log.info("auth.invite_code_rejected");
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }

    const invitationId = claimed.id as string;

    let handoff;
    try {
      handoff = await mintInviteSession(db, invitationId);
    } catch (mintErr) {
      // Release the claim so a transient failure doesn't consume the code.
      await db.from("invitation_codes").update({ used_at: null }).eq("id", invitationId);
      log.error("auth.invite_session_mint_failed", { err: mintErr });
      return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
    }

    log.info("auth.verify_code_ok", { invitation: invitationId });
    return ok(
      { verification: { email: handoff.email, tokenHash: handoff.tokenHash } },
      { status: 201 },
    );
  });
}
