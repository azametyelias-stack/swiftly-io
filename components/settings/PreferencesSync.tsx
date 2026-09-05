"use client";

import { useEffect } from "react";

import { apiJson } from "@/lib/http/api";
import { adoptStoredPreferences, type StoredPreferences } from "@/lib/settings/preferences";

/**
 * Pulls the account's theme and language down once per session — audit
 * 2026-09-05, point 3.
 *
 * Renders nothing. It sits in the authenticated shell rather than the root
 * layout because it needs a session: `/privacy` is readable logged out, and
 * asking `/api/me` there would be a guaranteed 401 on every visit.
 *
 * Runs once, not once per navigation. `adoptStoredPreferences` dispatches theme
 * and locale change events, so re-running it on every route change would push a
 * re-render through every subscriber for a value that has not moved. The guard
 * is module-level on purpose: a component-level ref resets when the shell
 * remounts, which is exactly when navigating between two app pages.
 */
let synced = false;

export function PreferencesSync() {
  useEffect(() => {
    if (synced) return;
    synced = true;
    let alive = true;
    apiJson<{ user: Partial<StoredPreferences> }>("/api/me")
      .then((r) => {
        if (alive) adoptStoredPreferences(r.user);
      })
      .catch(() => {
        // Offline or logged out mid-flight. The device keeps the theme it
        // painted with, which is the right failure: a preference is not worth
        // an error message, and the next load tries again.
        synced = false;
      });
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
