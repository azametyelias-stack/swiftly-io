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
 */

export interface InviteSessionHandoff {
  /** Synthetic e-mail of the invite user (informational; the client uses tokenHash). */
  email: string;
  /** Hashed magic-link token — exchanged client-side for a Supabase session. */
  tokenHash: string;
}

export async function mintInviteSession(
  db: SupabaseClient,
  invitationId: string,
): Promise<InviteSessionHandoff> {
  const email = syntheticInviteEmail(invitationId);

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

  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) {
    log.error("auth.invite_generate_link_failed", { reason: link.error?.message });
    throw new Error("invite session handoff failed");
  }

  return { email, tokenHash };
}

/**
 * `listUsers` is paged (default 50/page). The closed beta is a handful of
 * testers, so page 1 is enough; revisit if the invite list ever grows.
 */
async function findUserIdByEmail(
  db: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await db.auth.admin.listUsers();
  if (error) return null;
  return data.users.find((u) => u.email === email)?.id ?? null;
}
