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
