"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { AlertItem, KindFilter } from "@/lib/alerts/model";

type Status = "loading" | "ready" | "error";

/**
 * The SCREEN-18 inbox. The kind filter is a server query (it selects rows); the
 * sort is applied in the screen, because three of the four modes rank rows
 * against each other rather than narrowing them — paging those server-side
 * would rank a page, not the list.
 */
export function useAlerts(initialKind: KindFilter = "all") {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [key, setKey] = useState(0);

  // `status` is moved by whatever *asks* for a refetch, never by the effect
  // itself — a setState in an effect body cascades a render (and is a lint
  // error here). Same shape as `useBudgets` / `useAccounts`.
  const refetch = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  const changeKind = useCallback((next: KindFilter) => {
    setStatus("loading");
    setKind(next);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ items: AlertItem[] }>(`/api/alerts?kind=${kind}`)
      .then((r) => {
        if (!alive) return;
        setItems(r.items);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [kind, key]);

  /** Drop the row locally too — the list must not flash the deleted item back. */
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiJson(`/api/alerts/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((it) => it.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  const setRead = useCallback(async (id: string, read: boolean): Promise<boolean> => {
    try {
      await apiJson(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ read }),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, read } : it)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const readAll = useCallback(async (): Promise<boolean> => {
    try {
      await apiJson("/api/alerts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
      setItems((prev) => prev.map((it) => ({ ...it, read: true })));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    items,
    status,
    kind,
    setKind: changeKind,
    reload: refetch,
    remove,
    setRead,
    readAll,
  };
}

export async function fetchAlert(id: string): Promise<AlertItem> {
  const r = await apiJson<{ alert: AlertItem }>(`/api/alerts/${id}`);
  return r.alert;
}

export async function markAlertRead(id: string): Promise<void> {
  await apiJson(`/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ read: true }),
  });
}
