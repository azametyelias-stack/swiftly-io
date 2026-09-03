"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { ReportListPayload } from "@/lib/stats/model";

export type ReportStatus = "loading" | "ready" | "error";

export interface UseReport {
  periodKey: string | null;
  setPeriodKey: (k: string | null) => void;
  data: ReportListPayload | null;
  status: ReportStatus;
  reload: () => void;
}

/** SCREEN-12 — the completed report periods + the selected report. */
export function useReport(): UseReport {
  const [periodKey, setPeriodKeyState] = useState<string | null>(null);
  const [data, setData] = useState<ReportListPayload | null>(null);
  const [status, setStatus] = useState<ReportStatus>("loading");
  const [reloadKey, setReloadKey] = useState(0);

  const setPeriodKey = useCallback((k: string | null) => {
    setStatus("loading");
    setPeriodKeyState(k);
  }, []);
  const reload = useCallback(() => {
    setStatus("loading");
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    const q = periodKey ? `?period=${periodKey}` : "";
    apiJson<ReportListPayload>(`/api/report${q}`)
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
  }, [periodKey, reloadKey]);

  return { periodKey, setPeriodKey, data, status, reload };
}
