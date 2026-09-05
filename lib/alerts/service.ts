import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { assertOwnership } from "@/lib/auth/guard";
import type { AuthUser } from "@/lib/auth/authenticate";
import type { AlertItem } from "@/lib/alerts/model";
import type { AlertListQuery } from "@/lib/validation/schemas";

/**
 * Server-side reads/writes for the SCREEN-18 inbox.
 *
 * Alerts are never *created* here: they are written by the daily cron
 * (`lib/recurrence/service.ts`). SCREEN-18 § 3 is explicit that the header has
 * no "+" because there is nothing to create by hand — so this module exposes
 * read, mark-read and delete, and no insert. An inbox the user can write to is
 * not an inbox.
 */

export type { AlertItem } from "@/lib/alerts/model";

const COLUMNS =
  "id, kind, title, body, value, tone, facts, link_type, link_id, read, created_at";

/** Hard ceiling on one page — the client asks for `limit`, this bounds it. */
const MAX_LIMIT = 100;

export async function listAlerts(
  db: SupabaseClient,
  userId: string,
  query: AlertListQuery,
): Promise<{ items: AlertItem[]; hasMore: boolean }> {
  const limit = Math.min(query.limit ?? 50, MAX_LIMIT);
  let q = db
    .from("alerts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    // One extra row is what tells us there is a next page, without a count.
    .range(query.offset ?? 0, (query.offset ?? 0) + limit);

  if (query.kind && query.kind !== "all") q = q.eq("kind", query.kind);

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as unknown as AlertItem[];
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

export async function getAlert(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<AlertItem> {
  const { data } = await db
    .from("alerts")
    .select(`${COLUMNS}, user_id`)
    .eq("id", id)
    .maybeSingle();

  // 404 if missing, 403 if it belongs to someone else — never leak the row.
  assertOwnership(data, user, { resource: "alert", resourceId: id });
  // `user_id` was selected only so `assertOwnership` had something to check;
  // it does not belong in the payload. (`void` marks it deliberately dropped.)
  const { user_id, ...item } = data as AlertItem & { user_id: string };
  void user_id;
  return item;
}

/**
 * Mark one alert read or unread. SCREEN-18 § 12 leaves "toggle ou disparition
 * automatique ?" open; the artboard's long-press menu answers it — "Marquer
 * comme lue" is an explicit, reversible action, so this takes the value rather
 * than flipping whatever is there.
 */
export async function setAlertRead(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
  read: boolean,
): Promise<AlertItem> {
  await getAlert(db, user, id); // ownership first — the update itself is scoped below
  const { data, error } = await db
    .from("alerts")
    .update({ read })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as unknown as AlertItem;
}

/** Mark every unread alert read. Returns how many rows changed. */
export async function markAllRead(
  db: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await db
    .from("alerts")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

/** § 7 — swipe left deletes, after a confirmation the UI owns. Permanent. */
export async function deleteAlert(
  db: SupabaseClient,
  user: AuthUser,
  id: string,
): Promise<void> {
  await getAlert(db, user, id);
  const { error } = await db
    .from("alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}
