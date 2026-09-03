"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { ProjectListItem, ProjectPayload } from "@/lib/projects/model";

type Status = "loading" | "ready" | "error";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ projects: ProjectListItem[] }>("/api/projects")
      .then((r) => {
        if (!alive) return;
        setProjects(r.projects);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [key]);

  return { projects, status, reload };
}

export interface ProjectDetail {
  project: ProjectListItem;
  transactions: {
    id: string;
    amount: number;
    occurred_on: string;
    status: string;
    note: string | null;
  }[];
  accountBalance: number | null;
}

export async function createProjectRequest(payload: ProjectPayload): Promise<void> {
  await apiJson("/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchProject(id: string): Promise<ProjectDetail> {
  return apiJson<ProjectDetail>(`/api/projects/${id}`);
}

export async function updateProjectRequest(
  id: string,
  payload: Partial<ProjectPayload>,
): Promise<ProjectDetail> {
  return apiJson<ProjectDetail>(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteProjectRequest(id: string): Promise<void> {
  await apiJson(`/api/projects/${id}`, { method: "DELETE" });
}

export async function allocateRequest(
  id: string,
  amount: number,
  direction: "add" | "withdraw",
): Promise<{ allocated_amount: number }> {
  return apiJson<{ allocated_amount: number }>(`/api/projects/${id}/allocate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount, direction }),
  });
}
