"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { TxDetail } from "@/lib/transactions/model";

export type TxDetailStatus = "loading" | "ready" | "error";

export interface TxDetailState {
  transaction: TxDetail | null;
  status: TxDetailStatus;
  reload: () => void;
  remove: () => Promise<boolean>;
}

/** One transaction's full detail (SCREEN-7). */
export function useTransaction(id: string): TxDetailState {
  const [transaction, setTransaction] = useState<TxDetail | null>(null);
  const [status, setStatus] = useState<TxDetailStatus>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ transaction: TxDetail }>(`/api/transactions/${id}`)
      .then((res) => {
        if (!alive) return;
        setTransaction(res.transaction);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [id, key]);

  const remove = useCallback(async () => {
    try {
      await apiJson(`/api/transactions/${id}`, { method: "DELETE" });
      return true;
    } catch {
      return false;
    }
  }, [id]);

  return { transaction, status, reload, remove };
}
