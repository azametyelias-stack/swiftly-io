/**
 * Canonical auth responses (SECURITY MASTERPLAN — Point 16: single auth error
 * message → no e-mail / account enumeration).
 *
 * Every credential-submission endpoint — sign-in, sign-up, forgot-password,
 * reset-password, invite-code redemption — MUST return the message from this
 * file that matches its category, **byte-for-byte identical across the "exists"
 * and "doesn't exist" / "wrong secret" branches**. The real reason is logged
 * server-side (`log.info("auth.…", { email: masked, reason })`), never sent to
 * the client.
 *
 * Pair every failure with `AUTH_INVALID_CODE` so the error code doesn't leak the
 * distinction the message hides.
 *
 * Dependency-free — unit-tested in `tests/auth/responses.test.ts`.
 */

export const AUTH_MESSAGES = {
  /**
   * Sign-in failure. IDENTICAL for: unknown identifier, wrong password, wrong
   * OTP, unconfirmed / disabled account. Status 401.
   */
  invalidCredentials: "Identifiants incorrects. Vérifiez vos informations et réessayez.",

  /**
   * Sign-up accepted. IDENTICAL whether the address was free or already
   * registered. Status 200/201 — never 409, never "e-mail déjà utilisé".
   */
  signupAccepted:
    "Si cette adresse n'est pas déjà utilisée, un e-mail de confirmation vient d'être envoyé.",

  /**
   * Forgot-password accepted. IDENTICAL whether the address is known or not.
   * Status 200.
   */
  passwordResetRequested:
    "Si un compte est associé à cette adresse, un lien de réinitialisation vient d'être envoyé.",

  /**
   * Reset / confirmation link consumed with a bad token. IDENTICAL for: unknown,
   * expired, already used, malformed. Status 400.
   */
  invalidResetLink: "Ce lien est invalide ou a expiré. Demandez-en un nouveau.",

  /**
   * Invite-code redemption failure. IDENTICAL for: unknown, expired, already
   * used. Status 400. This is the API-layer default.
   *
   * NOTE: the code is 6 digits (SCREEN-2 decision, 2026-09-02), so the endpoint
   * is only safe behind a hard rate-limit + per-code lockout (Point 3) — not the
   * code's entropy. The check is constant-time (`verifyInviteCode`, HMAC-peppered).
   * SCREEN-2's three differentiated messages ("Code invalide" / "Code expiré" /
   * "Ce code a déjà été utilisé") may be shown by the UI from `classifyInviteCode`;
   * invite codes aren't an e-mail-enumeration target. See `lib/auth/README.md`
   * "Invite-code auth".
   */
  invalidInviteCode: "Ce code d'invitation est invalide ou a déjà été utilisé.",
} as const;

/** The single error code that goes with the single sign-in message. */
export const AUTH_INVALID_CODE = "AUTH_INVALID";
