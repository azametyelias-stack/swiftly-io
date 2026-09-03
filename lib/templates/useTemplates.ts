"use client";

import { useCallback, useEffect, useState } from "react";

import { apiJson } from "@/lib/http/api";
import type { TemplateListItem, TemplatePayload } from "@/lib/templates/model";

type Status = "loading" | "ready" | "error";

export function useTemplates() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [key, setKey] = useState(0);

  const reload = useCallback(() => {
    setStatus("loading");
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiJson<{ templates: TemplateListItem[] }>("/api/templates")
      .then((r) => {
        if (!alive) return;
        setTemplates(r.templates);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [key]);

  return { templates, status, reload };
}

export async function createTemplateRequest(payload: TemplatePayload): Promise<void> {
  await apiJson("/api/templates", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateTemplateRequest(
  id: string,
  payload: Partial<TemplatePayload>,
): Promise<TemplateListItem> {
  const { template } = await apiJson<{ template: TemplateListItem }>(
    `/api/templates/${id}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return template;
}

export async function deleteTemplateRequest(id: string): Promise<void> {
  await apiJson(`/api/templates/${id}`, { method: "DELETE" });
}

export async function fetchTemplate(id: string): Promise<TemplateListItem> {
  const { template } = await apiJson<{ template: TemplateListItem }>(
    `/api/templates/${id}`,
  );
  return template;
}

export async function markTemplateUsed(id: string): Promise<void> {
  try {
    await apiJson(`/api/templates/${id}/use`, { method: "POST" });
  } catch {
    /* non-critical — the counter is cosmetic */
  }
}
