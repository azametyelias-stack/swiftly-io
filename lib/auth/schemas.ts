/**
 * Zod validation for the auth endpoints (SECURITY MASTERPLAN — Point 19).
 *
 * FOUNDATION Day 10 (PROMPT #INPUT, Section 7): these are the MINIMAL schemas.
 * When the Input-validation foundation lands, fold them into the shared schema
 * registry (shared error codes, i18n messages, request-id plumbing). Do not let
 * this file drift into a second source of truth.
 *
 * Shape only — semantic checks (exists / unused / not expired) are done by
 * `classifyInviteCode` in `lib/auth/invite-codes.ts` against the DB row.
 */

import { z } from "zod";

/**
 * POST /api/auth/verify-code — the closed-beta sign-up (SCREEN-2).
 *
 * Accepts the 6 digits the user typed into the six boxes, tolerating spaces /
 * dashes from a paste. The handler calls `normalizeInviteCode` +
 * `isValidInviteCodeShape` before touching the DB.
 */
export const inviteSignupSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(6, "Code d'invitation incomplet.")
      .max(16, "Code d'invitation invalide.")
      .regex(/^[0-9\s-]+$/, "Le code ne contient que des chiffres."),
  })
  .strict();

export type InviteSignupRequest = z.infer<typeof inviteSignupSchema>;

/**
 * POST /api/admin/create-invitations — admin-only (authenticate + requireAdmin).
 * Mint `count` codes, each valid 30 days.
 */
export const createInvitationsSchema = z
  .object({
    count: z.number().int().min(1).max(100),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export type CreateInvitationsRequest = z.infer<typeof createInvitationsSchema>;
