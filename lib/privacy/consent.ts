/**
 * Privacy / consent domain model.
 *
 * There is no auth system yet, so a consent decision is tied to an anonymous
 * "subject id" (sf_sid cookie). `user_id` stays nullable everywhere for when
 * authentication lands and we backfill it.
 *
 * Designs: docs/3-PRODUCT (Design et Wireframes)/Les 22 ECRANS/
 *   19-consentement-privacy-banner.md (SCREEN-20)
 *   20-privacy-page.md               (SCREEN-21)
 *   21-privacy-settings.md           (SCREEN-22)
 */

/** Bump when the policy text or the set of categories changes. */
export const CONSENT_VERSION = "1.0";

/** Shown in the /privacy hero. */
export const PRIVACY_LAST_UPDATED = "Septembre 2026";

/** Non-httpOnly so the client can read "a decision exists" without a round-trip. */
export const CONSENT_COOKIE = "sf_consent";
/** Anonymous subject identifier. */
export const SUBJECT_COOKIE = "sf_sid";
/** localStorage key holding the full StoredConsent JSON (client source of truth). */
export const CONSENT_STORAGE_KEY = "privacy_consent";
/** Fired on `window` after every local consent change so listeners (GA) can react. */
export const CONSENT_EVENT = "sf:consent-change";

/** 13 months, the CNIL / GDPR guidance ceiling for consent lifetime. */
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 400;

export type ConsentCategory =
  | "essential"
  | "analytics"
  | "marketing"
  | "location";

export type ConsentCategories = Record<ConsentCategory, boolean>;

/** What the user did. `update` = later change from /privacy-settings. */
export type ConsentAction =
  | "accept_all"
  | "customize"
  | "reject"
  | "update";

export interface StoredConsent {
  categories: ConsentCategories;
  version: string;
  action: ConsentAction;
  /** ISO timestamp of the decision. */
  updatedAt: string;
}

/** essential is always granted; location is not available yet. */
export const DEFAULT_CATEGORIES: ConsentCategories = {
  essential: true,
  analytics: false,
  marketing: false,
  location: false,
};

/**
 * Force the invariants no matter what the caller passed:
 * essential is always true, location is always false (feature not shipped).
 */
export function withEssential(
  categories: Partial<ConsentCategories>,
): ConsentCategories {
  return {
    essential: true,
    analytics: categories.analytics === true,
    marketing: categories.marketing === true,
    location: false,
  };
}

/** True when the stored decision matches the current policy version. */
export function hasCurrentDecision(
  stored: StoredConsent | null | undefined,
): stored is StoredConsent {
  return !!stored && stored.version === CONSENT_VERSION;
}

/** Parse the localStorage value defensively (may be absent / corrupt / stale). */
export function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredConsent>;
    if (!value || typeof value !== "object" || !value.categories) return null;
    return {
      categories: withEssential(value.categories),
      version: typeof value.version === "string" ? value.version : "",
      action: (value.action as ConsentAction) ?? "customize",
      updatedAt:
        typeof value.updatedAt === "string"
          ? value.updatedAt
          : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export interface ConsentRow {
  user_id: string | null;
  subject_id: string;
  consent_version: string;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  location: boolean;
  action: ConsentAction;
  ip_address: string | null;
  user_agent: string | null;
}

export interface ConsentMeta {
  subjectId: string;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** Pure: shape a consent_logs row from a validated request + request metadata. */
export function buildConsentRow(
  input: { categories: ConsentCategories; action: ConsentAction },
  meta: ConsentMeta,
): ConsentRow {
  const categories = withEssential(input.categories);
  return {
    user_id: meta.userId ?? null,
    subject_id: meta.subjectId,
    consent_version: CONSENT_VERSION,
    essential: categories.essential,
    analytics: categories.analytics,
    marketing: categories.marketing,
    location: categories.location,
    action: input.action,
    ip_address: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
  };
}
