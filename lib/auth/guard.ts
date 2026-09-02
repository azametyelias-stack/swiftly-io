import "server-only";

import { serverEnv } from "@/lib/env/server";
import { log } from "@/lib/log/logger";
import {
  ForbiddenError,
  NotFoundError,
  ReauthRequiredError,
} from "@/lib/http/errors";
import type { AuthUser } from "@/lib/auth/authenticate";
import { isOwner, type Owned } from "@/lib/auth/ownership";

/**
 * Server-side authorization guards (SECURITY MASTERPLAN — Point 6).
 * MANTRA: NEVER TRUST THE CLIENT. RLS is the safety net; these run first.
 */

type SecurityEvent = {
  event: "unauthorized_access_attempt" | "admin_access_denied" | "reauth_required";
  userId: string | null;
  resource?: string;
  resourceId?: string | null;
  reason?: string;
};

/** Structured security log (SECURITY MASTERPLAN — Point 15). Meta is auto-redacted. */
export function logSecurityEvent(e: SecurityEvent): void {
  const { event, ...rest } = e;
  log.warn(`security.${event}`, rest);
}

/**
 * Assert that `resource` exists and belongs to `user`. On failure this logs an
 * "unauthorized access attempt" and throws:
 *   - `NotFoundError` (404) when the row is missing
 *   - `ForbiddenError` (403) when it exists but is owned by someone else
 *
 * Narrows `resource` to non-null for the caller.
 *
 * Note: returning 403 (not 404) for a wrong-owner row follows the Point 6
 * checklist. If enumeration of ids becomes a concern, switch the mismatch branch
 * to `NotFoundError` so "not yours" and "doesn't exist" look identical.
 */
export function assertOwnership<T extends Owned>(
  resource: T,
  user: AuthUser,
  meta: { resource: string; resourceId?: string | null },
): asserts resource is NonNullable<T> {
  if (!resource) {
    throw new NotFoundError();
  }
  if (!isOwner(resource, user.id)) {
    logSecurityEvent({
      event: "unauthorized_access_attempt",
      userId: user.id,
      resource: meta.resource,
      resourceId: meta.resourceId ?? null,
      reason: "owner_mismatch",
    });
    throw new ForbiddenError();
  }
}

let adminIds: Set<string> | undefined;

function getAdminIds(): Set<string> {
  if (adminIds === undefined) {
    adminIds = new Set(
      (serverEnv("ADMIN_USER_IDS") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return adminIds;
}

/**
 * Assert the caller is an admin (allow-list in `ADMIN_USER_IDS`, comma-separated
 * user ids). Throws `ForbiddenError` otherwise. There is no roles table in the
 * MVP; this is the deliberate stopgap.
 */
export function requireAdmin(user: AuthUser): void {
  if (!getAdminIds().has(user.id)) {
    logSecurityEvent({
      event: "admin_access_denied",
      userId: user.id,
      reason: "not_in_allowlist",
    });
    throw new ForbiddenError("Réservé aux administrateurs.");
  }
}

/**
 * Extra layer for high-risk endpoints (delete account, change payout details, …).
 * The route re-verifies a fresh credential (password or one-time code) and passes
 * the boolean result here. Throws `ReauthRequiredError` (403) when not confirmed.
 *
 *   const confirmed = await verifyConfirmation(request, user); // route-specific
 *   assertStepUp(confirmed, user);
 */
export function assertStepUp(confirmed: boolean, user: AuthUser): void {
  if (!confirmed) {
    logSecurityEvent({
      event: "reauth_required",
      userId: user.id,
      reason: "missing_or_invalid_confirmation",
    });
    throw new ReauthRequiredError();
  }
}
