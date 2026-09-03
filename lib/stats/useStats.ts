"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { BreakdownDimension, StatsPayload } from "@/lib/stats/model";

export type StatsMode = "apercu" | "expense" | "income" | "patrimoine";
export type StatsPeriod = "day" | "week" | "month" | "year";
export type StatsStatus = "loading" | "ready" | "error";

export interface StatsAccount {
  id: string;
  name: string;
  is_primary: boolean;
}

export interface UseStats {
  mode: StatsMode;
  setMode: (m: StatsMode) => void;
  period: StatsPeriod;
  setPeriod: (p: StatsPeriod) => void;
  accountId: string | null;
  setAccountId: (id: string | null) => void;
  expenseBy: BreakdownDimension;
  setExpenseBy: (d: BreakdownDimension) => void;
  incomeBy: BreakdownDimension;
  setIncomeBy: (d: BreakdownDimension) => void;
  accounts: StatsAccount[];
  data: StatsPayload | null;
  status: StatsStatus;
  reload: () => void;
}

export function useStats(): UseStats {
  const [mode, setMode] = useState<StatsMode>("apercu");
  const [period, setPeriod] = useState<StatsPeriod>("month");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [expenseBy, setExpenseBy] = useState<BreakdownDimension>("category");
  const [incomeBy, setIncomeBy] = useState<BreakdownDimension>("category");
  const [accounts, setAccounts] = useState<StatsAccount[]>([]);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [status, setStatus] = useState<StatsStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ accounts: StatsAccount[] }>("/api/accounts")
      .then((r) => alive && setAccounts(r.accounts))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({
      mode,
      period,
      expense_by: expenseBy,
      income_by: incomeBy,
    });
    if (accountId) q.set("account", accountId);
    apiJson<StatsPayload>(`/api/stats?${q.toString()}`)
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
  }, [mode, period, accountId, expenseBy, incomeBy, reloadKey]);

  return {
    mode,
    setMode,
    period,
    setPeriod,
    accountId,
    setAccountId,
    expenseBy,
    setExpenseBy,
    incomeBy,
    setIncomeBy,
    accounts,
    data,
    status,
    reload,
  };
}
