"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { Period } from "@/lib/dashboard/period";
import type { Variation } from "@/lib/dashboard/aggregates";

export interface AccountSummary {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_primary: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  balance: number;
}

export interface DashboardData {
  account: { id: string; name: string; currency: string };
  period: Period;
  balance: number;
  startBalance: number;
  income: number;
  expenses: number;
  variation: Variation;
  curve: { date: string; balance: number; at?: string }[] | null;
  granularity: "hour" | "day" | "month";
  hasTransactions: boolean;
}

export type DashboardStatus = "loading" | "ready" | "error";

export interface DashboardState {
  name: string | null;
  accounts: AccountSummary[];
  /** null ⇒ the primary account */
  accountId: string | null;
  setAccountId: (id: string | null) => void;
  period: Period;
  setPeriod: (p: Period) => void;
  data: DashboardData | null;
  status: DashboardStatus;
  /** bumps to re-fetch + replay the curve/odometer (e.g. return from a tx) */
  refresh: () => void;
}

/**
 * Dashboard data (SCREEN-4). `data` keeps its last value across a refetch so the
 * error state can show "dernière valeur connue" and the odometer animates from
 * the old balance. setState only ever runs in async callbacks (no
 * set-state-in-effect).
 */
export function useDashboard(): DashboardState {
  const [name, setName] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("day");
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    apiJson<{ accounts: AccountSummary[] }>("/api/accounts")
      .then((res) => {
        if (alive) setAccounts(res.accounts);
      })
      .catch(() => {
        /* the accounts strip just stays empty */
      });
    apiJson<{ user: { name: string } }>("/api/me")
      .then((res) => {
        if (alive) setName(res.user.name);
      })
      .catch(() => {
        /* greeting falls back to a generic hello */
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let alive = true;
    const query = new URLSearchParams({ period });
    if (accountId) query.set("account", accountId);
    apiJson<DashboardData>(`/api/dashboard?${query.toString()}`)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setStatus("ready");
      })
      .catch(() => {
        if (alive) setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [accountId, period, reloadKey]);

  return {
    name,
    accounts,
    accountId,
    setAccountId,
    period,
    setPeriod,
    data,
    status,
    refresh,
  };
}
