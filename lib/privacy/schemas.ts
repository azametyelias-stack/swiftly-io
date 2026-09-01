/**
 * Zod validation for the privacy/consent endpoints.
 *
 * FOUNDATION Day 10 (PROMPT #INPUT, Section 7): these are the MINIMAL schemas.
 * When the Input-validation foundation lands, fold them into the shared schema
 * registry (shared error codes, i18n messages, request-id plumbing) and expand
 * coverage — do not let this file drift into a second source of truth.
 */

import { z } from "zod";

/**
 * `essential` must be literally `true` (it is not refusable), `location` is not
 * available yet so it defaults to false. Unknown keys are rejected.
 */
export const consentCategoriesSchema = z
  .object({
    essential: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
    location: z.boolean().optional().default(false),
  })
  .strict();

export type ConsentCategoriesInput = z.infer<typeof consentCategoriesSchema>;

/** POST /api/privacy/consent — the first decision from the consent banner. */
export const consentRequestSchema = z
  .object({
    categories: consentCategoriesSchema,
    action: z.enum(["accept_all", "customize", "reject"]),
  })
  .strict();

export type ConsentRequest = z.infer<typeof consentRequestSchema>;

/** POST /api/privacy/update-consent — a later change from /privacy-settings. */
export const updateConsentRequestSchema = z
  .object({
    categories: consentCategoriesSchema,
    action: z.literal("update"),
  })
  .strict();

export type UpdateConsentRequest = z.infer<typeof updateConsentRequestSchema>;
