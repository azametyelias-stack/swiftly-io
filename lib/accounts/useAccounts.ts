"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { AccountCardData } from "@/lib/accounts/model";
import type { AccountPayload } from "@/lib/accounts/model";

type Status = "loading" | "ready" | "error";

export function useAccounts(includeArchived = false) {
  const [accounts, setAccounts] = useState<AccountCardData[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ accounts: AccountCardData[] }>(
      includeArchived ? "/api/accounts?archived=1" : "/api/accounts",
    )
      .then((r) => {
        if (!alive) return;
        setAccounts(r.accounts);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [key, includeArchived]);

  const create = useCallback(async (payload: AccountPayload) => {
    await apiJson("/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, []);

  return { accounts, status, reload, create };
}

export async function updateAccountRequest(
  id: string,
  patch: Partial<AccountPayload> & { is_archived?: boolean },
): Promise<AccountCardData> {
  const { account } = await apiJson<{ account: AccountCardData }>(
    `/api/accounts/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return account;
}

export async function deleteAccountRequest(
  id: string,
): Promise<{ deleted: boolean; archived: boolean }> {
  return apiJson<{ deleted: boolean; archived: boolean }>(
    `/api/accounts/${id}`,
    { method: "DELETE" },
  );
}

export async function fetchAccount(id: string): Promise<AccountCardData> {
  const { account } = await apiJson<{ account: AccountCardData }>(
    `/api/accounts/${id}`,
  );
  return account;
}
