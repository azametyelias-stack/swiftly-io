"use client";

import { useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";

/**
 * Unread-alert count for the menu badge (SCREEN-5 § 8). Best-effort — any
 * failure just leaves the badge hidden. Re-checked when `pathname` changes so
 * the badge stays roughly current as the user moves around.
 */
export function useUnreadAlerts(pathname: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    apiJson<{ count: number }>("/api/alerts/unread-count")
      .then((res) => {
        if (alive) setCount(res.count);
      })
      .catch(() => {
        /* leave the badge hidden */
      });
    return () => {
      alive = false;
    };
  }, [pathname]);

  return count;
}
