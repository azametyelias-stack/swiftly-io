"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { ProfilePatch, SettingsProfile } from "@/lib/settings/model";

type Status = "loading" | "ready" | "error";

/**
 * The caller's profile for SCREEN-22. `save` is optimistic: the artboard says
 * currency / language / theme apply on tap with a toast and no "Enregistrer"
 * button, so the row must show the new value in the same frame as the tap.
 * A failed write puts the previous profile back and reports false, and the
 * screen turns that into the error toast — the row never keeps a value the
 * server refused.
 */
export function useProfile() {
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ user: SettingsProfile }>("/api/me")
      .then((r) => {
        if (!alive) return;
        setProfile(r.user);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [key]);

  const save = useCallback(
    async (patch: ProfilePatch): Promise<boolean> => {
      const previous = profile;
      if (previous) setProfile({ ...previous, ...patch });
      try {
        const r = await apiJson<{ user: SettingsProfile }>("/api/me", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        setProfile(r.user);
        return true;
      } catch {
        if (previous) setProfile(previous);
        return false;
      }
    },
    [profile],
  );

  return { profile, status, reload, save };
}
