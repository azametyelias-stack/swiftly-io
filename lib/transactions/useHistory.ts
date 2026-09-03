"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { TxListItem } from "@/lib/transactions/model";
import type { TypeFilter } from "@/lib/transactions/model";

interface TxListPage {
  items: TxListItem[];
  nextCursor: string | null;
}

export type HistoryStatus = "loading" | "ready" | "error";

export interface HistoryState {
  items: TxListItem[];
  status: HistoryStatus;
  filter: TypeFilter;
  setFilter: (f: TypeFilter) => void;
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  remove: (id: string) => Promise<boolean>;
  reload: () => void;
}

/**
 * Transaction history (SCREEN-6). One server page ordered by date desc; the
 * client re-sorts + groups the loaded window (`lib/transactions/model`). More
 * rows load on scroll via the keyset cursor. setState only in async callbacks.
 */
export function useHistory(
  initialFilter: TypeFilter = "all",
  account?: string,
): HistoryState {
  const [items, setItems] = useState<TxListItem[]>([]);
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [filter, setFilterState] = useState<TypeFilter>(initialFilter);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);
  const setFilter = useCallback((f: TypeFilter) => {
    setStatus("loading");
    setFilterState(f);
  }, []);

  const query = (extra?: Record<string, string>) => {
    const q = new URLSearchParams(extra);
    if (filter !== "all") q.set("type", filter);
    if (account) q.set("account", account);
    return q.toString();
  };

  useEffect(() => {
    let alive = true;
    apiJson<TxListPage>(`/api/transactions?${query()}`)
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setCursor(res.nextCursor);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, reloadKey]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    apiJson<TxListPage>(`/api/transactions?${query({ cursor })}`)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loadingMore, filter]);

  const remove = useCallback(async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== id));
    try {
      await apiJson(`/api/transactions/${id}`, { method: "DELETE" });
      return true;
    } catch {
      setItems(snapshot);
      return false;
    }
  }, [items]);

  return {
    items,
    status,
    filter,
    setFilter,
    hasMore: cursor !== null,
    loadMore,
    loadingMore,
    remove,
    reload,
  };
}
