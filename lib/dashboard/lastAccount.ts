"use client";

/**
 * The dashboard's selected account is shared across the app so that finishing
 * a transaction on a different account (e.g. "Compte bancaire" while the
 * dashboard was showing "Compte principal") switches the dashboard to that
 * account on return, instead of silently mixing data from two accounts.
 *
 * `localStorage` carries the value across a fresh mount (hard reload, first
 * load of /dashboard); the custom event updates a `DashboardView` that is
 * still mounted underneath the transaction modal (parallel/intercepting
 * routes never unmount it, so a storage write alone wouldn't be seen).
 */

const KEY = "sf-dashboard-account";
export const ACCOUNT_CHANGED_EVENT = "sf:dashboard-account-changed";
export const DASHBOARD_STALE_EVENT = "sf:dashboard-stale";

/**
 * Announce that the dashboard's numbers are out of date — a transaction was
 * just written. Needed for the same reason as the event above: the wizard is an
 * intercepted route rendered in the `@modal` slot, so `DashboardView` never
 * unmounts and never remounts on the way back, and nothing would otherwise
 * re-fetch. Elias: "je suis obligé d'actualiser manuellement pour voir le
 * changement". Fires even when the account is unchanged, which is why it is
 * separate from ACCOUNT_CHANGED_EVENT.
 */
export function notifyDashboardStale(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DASHBOARD_STALE_EVENT));
  }
}

export function getLastAccount(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastAccount(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore — the event below still updates the current tab */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string | null>(ACCOUNT_CHANGED_EVENT, { detail: id }));
  }
}
