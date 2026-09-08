import { inviteSignupSchema } from "@/lib/auth/schemas";
import {
  inviteCodeHash,
  isValidInviteCodeShape,
  normalizeInviteCode,
} from "@/lib/auth/invite-codes";
import { mintInviteSession } from "@/lib/auth/invite-session";
import {
  assertInviteAttemptAllowed,
  isInviteCodeLockedOut,
  RateLimitError,
  RateLimitUnavailableError,
  recordInviteFailure,
} from "@/lib/auth/rate-limit";
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
 * browser exchanges for a Supabase session (`verifyOtp`), plus `returning` —
 * `true` quand le compte est déjà installé, pour que le client saute
 * l'onboarding.
 *
 * Deux chemins depuis le 2026-09-08 : un code neuf ouvre un compte (201), un
 * code déjà utilisé ROUVRE le sien (200). Un compte de bêta n'ayant ni mot de
 * passe ni vraie adresse, le code est le seul chemin de retour après une
 * désinstallation — voir le bloc « Retour au compte » plus bas.
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
  // Point 3 — gate on the IP before reading the body, so a flood costs the
  // attacker a connection and costs us one Redis command: no JSON parsing, no
  // database round-trip.
  try {
    await assertInviteAttemptAllowed(clientIp(request));
  } catch (limitErr) {
    if (limitErr instanceof RateLimitError) {
      const res = fail("RATE_LIMITED", limitErr.message, 429);
      // Tells an honest client when to come back; an attacker learns nothing it
      // could not measure with a clock.
      res.headers.set("Retry-After", String(limitErr.retryAfterSeconds));
      return res;
    }
    if (limitErr instanceof RateLimitUnavailableError) {
      // The limiter is the only thing standing between a 6-digit secret and a
      // brute force. Without it we refuse rather than serve unlimited.
      return fail("AUTH_UNAVAILABLE", limitErr.message, 503);
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

    const codeHash = inviteCodeHash(code, pepper);

    // Second layer (Point 3): a botnet spreading its guesses over many IPs
    // slips past the per-IP window but not past the code's own counter. Only
    // failures feed it, so a valid unused code can never be locked out — it
    // would have to fail to be counted. The answer is the ordinary
    // invalid-code message, which at five failures is also the true one.
    if (await isInviteCodeLockedOut(codeHash)) {
      log.warn("auth.invite_code_locked_out");
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }

    const nowIso = new Date().toISOString();

    // Atomic claim — the WHERE clause is the guard, so the same code can't be
    // spent twice under a race (supabase/migrations/0003_invitation_codes.sql).
    const { data: claimed, error: claimError } = await db
      .from("invitation_codes")
      .update({ used_at: nowIso })
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .select("id")
      .maybeSingle();

    if (claimError) {
      log.error("auth.verify_code_failed", { reason: claimError.message });
      return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
    }

    let invitationId = (claimed?.id as string | undefined) ?? undefined;
    /** Le code avait déjà été utilisé : on rouvre son compte au lieu de refuser. */
    let reentry = false;
    /** L'utilisateur derrière une invitation déjà consommée (`used_by`). */
    let knownUserId: string | null = null;

    if (!invitationId) {
      /*
       * Retour au compte (décision d'Elias, 2026-09-08).
       *
       * Un compte de bêta n'a ni mot de passe ni vraie adresse : la session
       * posée sur l'appareil était le SEUL chemin vers les données. Désinstaller
       * l'app — ou vider les données du navigateur — rendait le compte
       * définitivement inaccessible, ses lignes toujours en base. Le code cesse
       * donc d'être une invitation à usage unique une fois consommé : il devient
       * la clé du compte qu'il a ouvert.
       *
       * `expires_at` n'entre pas dans cette recherche, et c'est délibéré : la
       * date de péremption borne la durée pendant laquelle une invitation reste
       * OFFERTE, pas la durée de vie du compte qu'elle a créé. La faire jouer
       * ici enfermerait quelqu'un dehors trente jours après son inscription.
       *
       * Ce que ça coûte, en clair : six chiffres deviennent un secret permanent.
       * Ce sont les limites de `rate-limit.ts` qui portent maintenant toute la
       * charge (5 essais / 15 min par IP, blocage du code après 5 échecs,
       * fermeture en cas d'indisponibilité). L'invariant du blocage par code
       * tient toujours — seuls les ÉCHECS comptent, et un code valide ne peut
       * plus échouer, donc personne ne peut verrouiller le compte d'un autre.
       * Le vrai durcissement reste un code plus long (`INVITE_CODE_LENGTH`).
       */
      const { data: spent, error: spentError } = await db
        .from("invitation_codes")
        .select("id, used_by")
        .eq("code_hash", codeHash)
        .not("used_at", "is", null)
        .maybeSingle();

      if (spentError) {
        log.error("auth.verify_code_failed", { reason: spentError.message });
        return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
      }
      if (spent) {
        invitationId = spent.id as string;
        // L'identité vient de la base, pas d'une recherche : c'est ce qui rend
        // le retour au compte sûr même avec beaucoup d'inscrits.
        knownUserId = (spent.used_by as string | null) ?? null;
        reentry = true;
      }
    }

    if (!invitationId) {
      // Inconnu ou périmé sans avoir jamais servi — les deux nourrissent le
      // blocage par code et l'alarme globale. Une redemption réussie n'enregistre
      // rien.
      await recordInviteFailure(codeHash);
      log.info("auth.invite_code_rejected");
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }

    let handoff;
    try {
      handoff = await mintInviteSession(db, invitationId, knownUserId);
    } catch (mintErr) {
      /*
       * On ne relâche QUE ce qu'on vient de prendre. Remettre `used_at` à null
       * sur une reconnexion rendrait le code réclamable à neuf — et le premier
       * à le retaper repartirait sur un compte vierge, l'ancien devenant
       * inaccessible pour de bon. C'est exactement le sinistre qu'on est en
       * train d'éviter.
       */
      if (!reentry) {
        await db.from("invitation_codes").update({ used_at: null }).eq("id", invitationId);
      }
      log.error("auth.invite_session_mint_failed", { err: mintErr, reentry });
      return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
    }

    /*
     * Où renvoyer la personne. La question n'est pas « ce code a-t-il déjà
     * servi ? » mais « ce compte a-t-il déjà un profil ? » — quelqu'un qui a
     * abandonné à l'écran du prénom a un code consommé et rien derrière : il
     * doit reprendre là où il s'était arrêté, pas atterrir sur un tableau de
     * bord sans nom ni compte principal.
     */
    const profile = await db
      .from("users")
      .select("id")
      .eq("id", handoff.userId)
      .maybeSingle();
    if (profile.error) {
      log.error("auth.verify_code_profile_lookup_failed", { reason: profile.error.message });
    }
    const returning = Boolean(profile.data);

    log.info(reentry ? "auth.verify_code_reentry" : "auth.verify_code_ok", {
      invitation: invitationId,
    });
    return ok(
      {
        verification: { email: handoff.email, tokenHash: handoff.tokenHash },
        /** `true` = ce compte est déjà installé ; le client saute l'onboarding. */
        returning,
      },
      { status: reentry ? 200 : 201 },
    );
  });
}
