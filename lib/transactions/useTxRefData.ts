"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { TxType } from "@/lib/transactions/model";

/**
 * Reference data the transaction form needs (SCREEN-8/9/10 § 1-2): accounts,
 * categories for the current type, people and projects for "Lié à".
 */

export interface RefAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  is_primary: boolean;
}
export interface RefCategory {
  id: string;
  name: string;
  kind: "expense" | "income";
  color: string;
  axis: string | null;
  is_system: boolean;
}
export interface RefNamed {
  id: string;
  name: string;
}

export interface TxRefData {
  accounts: RefAccount[];
  categories: RefCategory[];
  people: RefNamed[];
  projects: RefNamed[];
  ready: boolean;
  /** create a person on the fly and return it (SCREEN-8/9 § 2) */
  createPerson: (name: string) => Promise<RefNamed | null>;
  reloadAccounts: () => void;
}

export function useTxRefData(type: TxType): TxRefData {
  const [accounts, setAccounts] = useState<RefAccount[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [people, setPeople] = useState<RefNamed[]>([]);
  const [projects, setProjects] = useState<RefNamed[]>([]);
  const [ready, setReady] = useState(false);
  const [acctKey, setAcctKey] = useState(0);

  const reloadAccounts = useCallback(() => setAcctKey((k) => k + 1), []);

  useEffect(() => {
    let alive = true;
    apiJson<{ accounts: RefAccount[] }>("/api/accounts")
      .then((r) => alive && setAccounts(r.accounts))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [acctKey]);

  useEffect(() => {
    let alive = true;
    const kind = type === "income" ? "income" : "expense";
    Promise.allSettled([
      type === "transfer"
        ? Promise.resolve({ categories: [] as RefCategory[] })
        : apiJson<{ categories: RefCategory[] }>(`/api/categories?kind=${kind}`),
      apiJson<{ people: RefNamed[] }>("/api/people"),
      apiJson<{ projects: RefNamed[] }>("/api/projects?scope=picker"),
    ]).then((res) => {
      if (!alive) return;
      if (res[0].status === "fulfilled") setCategories(res[0].value.categories);
      if (res[1].status === "fulfilled") setPeople(res[1].value.people);
      if (res[2].status === "fulfilled") setProjects(res[2].value.projects);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [type]);

  const createPerson = useCallback(async (name: string) => {
    try {
      const { person } = await apiJson<{ person: RefNamed }>("/api/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setPeople((prev) =>
        [...prev, person].sort((a, b) => a.name.localeCompare(b.name, "fr")),
      );
      return person;
    } catch {
      return null;
    }
  }, []);

  return {
    accounts,
    categories,
    people,
    projects,
    ready,
    createPerson,
    reloadAccounts,
  };
}
