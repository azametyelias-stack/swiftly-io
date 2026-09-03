"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { BudgetListItem, BudgetPayload } from "@/lib/budgets/model";

type Status = "loading" | "ready" | "error";

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ budgets: BudgetListItem[] }>("/api/budgets")
      .then((r) => {
        if (!alive) return;
        setBudgets(r.budgets);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [key]);

  return { budgets, status, reload };
}

export async function createBudgetRequest(payload: BudgetPayload): Promise<void> {
  await apiJson("/api/budgets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export interface BudgetDetail {
  budget: BudgetListItem;
  transactions: {
    id: string;
    amount: number;
    occurred_on: string;
    note: string | null;
  }[];
}

export async function fetchBudget(id: string): Promise<BudgetDetail> {
  return apiJson<BudgetDetail>(`/api/budgets/${id}`);
}

export async function updateBudgetRequest(
  id: string,
  payload: Partial<BudgetPayload>,
): Promise<BudgetDetail> {
  return apiJson<BudgetDetail>(`/api/budgets/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteBudgetRequest(id: string): Promise<void> {
  await apiJson(`/api/budgets/${id}`, { method: "DELETE" });
}
