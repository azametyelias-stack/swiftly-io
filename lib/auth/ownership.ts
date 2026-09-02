/**
 * Pure ownership check (SECURITY MASTERPLAN — Point 6).
 *
 * Dependency-free so it can be unit-tested directly. The throwing wrapper that
 * turns a `false` here into a 403 + security log lives in `lib/auth/guard.ts`.
 */

/** A row that carries an owner column. `null`/`undefined` = row not found. */
export type Owned = { user_id?: string | null } | null | undefined;

/**
 * True only when `resource` exists AND its `user_id` matches `userId`.
 * A missing/empty `user_id` or a missing `userId` is never a match.
 */
export function isOwner(resource: Owned, userId: string): boolean {
  if (!resource) return false;
  if (!userId) return false;
  return resource.user_id != null && resource.user_id === userId;
}
