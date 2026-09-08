import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { syntheticInviteEmail } from "@/lib/auth/invite-codes";
import { log } from "@/lib/log/logger";

/**
 * Turn a freshly claimed invitation into a Supabase session handoff (SCREEN-2).
 *
 * `admin.createUser` does not return a session, so — per Elias's decision
 * (2026-09-02: OTP / magic-link exchange, no password on the wire) — we:
 *   1. create the auth user (synthetic e-mail, e-mail pre-confirmed),
 *   2. link `used_by` back onto the invitation row,
 *   3. generate a magic-link token the browser exchanges for a real session
 *      via `supabase.auth.verifyOtp({ type: "magiclink", token_hash })`.
 *
 * Throws on failure — the caller rolls the claim back so a transient Supabase
 * outage doesn't burn the code.
 *
 * Rejouable, et c'est ce qui fait marcher la reconnexion (2026-09-08) : l'e-mail
 * synthétique se déduit de l'invitation, donc rappeler cette fonction avec la
 * même invitation retombe sur le MÊME utilisateur — `createUser` échoue sur
 * l'e-mail déjà pris, et on récupère l'existant. Jamais un second compte.
 */

export interface InviteSessionHandoff {
  /** Synthetic e-mail of the invite user (informational; the client uses tokenHash). */
  email: string;
  /** Hashed magic-link token — exchanged client-side for a Supabase session. */
  tokenHash: string;
  /**
   * L'utilisateur derrière ce code. Rendu depuis le 2026-09-08 : sur une
   * reconnexion, l'appelant doit savoir si ce compte a déjà un profil pour
   * décider où renvoyer la personne (le tableau de bord, ou l'écran du prénom).
   */
  userId: string;
}

export async function mintInviteSession(
  db: SupabaseClient,
  invitationId: string,
  /**
   * L'utilisateur, quand l'appelant le connaît déjà (`used_by` de l'invitation).
   * C'est le cas d'une reconnexion : on tient l'identité par la base, donc on ne
   * crée rien et on ne cherche personne — on refabrique seulement le lien.
   */
  knownUserId?: string | null,
): Promise<InviteSessionHandoff> {
  const email = syntheticInviteEmail(invitationId);

  if (knownUserId) return { email, tokenHash: await magicLink(db, email), userId: knownUserId };

  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { invited_via: invitationId },
  });

  let userId = created.data.user?.id ?? null;
  if (created.error || !userId) {
    // A prior attempt may have created the user then failed before returning —
    // reuse it rather than duplicate.
    userId = await findUserIdByEmail(db, email);
    if (!userId) {
      log.error("auth.invite_user_create_failed", { reason: created.error?.message });
      throw new Error("invite user creation failed");
    }
  }

  const linked = await db
    .from("invitation_codes")
    .update({ used_by: userId })
    .eq("id", invitationId);
  if (linked.error) {
    // Non-fatal: the row already shows `used_at`, the user can still sign in.
    log.error("auth.invite_link_used_by_failed", { reason: linked.error.message });
  }

  return { email, tokenHash: await magicLink(db, email), userId };
}

/** Le jeton que le navigateur échange contre une session (`verifyOtp`). */
async function magicLink(db: SupabaseClient, email: string): Promise<string> {
  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    log.error("auth.invite_generate_link_failed", { reason: link.error?.message });
    throw new Error("invite session handoff failed");
  }
  return tokenHash;
}

/**
 * `listUsers` is paged (default 50/page). The closed beta is a handful of
 * testers, so page 1 is enough; revisit if the invite list ever grows.
 */
/**
 * Le repli, quand l'invitation n'a pas gardé son `used_by`.
 *
 * `listUsers()` PAGINE — 50 par page par défaut. S'arrêter à la première page
 * passait inaperçu tant que ce chemin n'était qu'un rattrapage après une panne :
 * la bêta tient sur une page. Depuis que la reconnexion existe (2026-09-08), il
 * peut porter le retour d'un compte, et rendre le 51e inscrit introuvable —
 * c'est-à-dire produire exactement le sinistre qu'on répare, en silence et
 * derrière un « Une erreur est survenue ».
 *
 * On parcourt donc les pages jusqu'à la dernière. La borne évite qu'une réponse
 * inattendue ne fasse tourner la boucle sans fin.
 */
const PAGE_SIZE = 200;
const MAX_PAGES = 40;

async function findUserIdByEmail(
  db: SupabaseClient,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return null;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < PAGE_SIZE) return null; // dernière page
  }
  log.error("auth.invite_user_lookup_exhausted", { pages: MAX_PAGES });
  return null;
}
