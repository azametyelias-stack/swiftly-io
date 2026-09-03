"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { TxWizard } from "@/components/transactions/TxWizard";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchTemplate } from "@/lib/templates/useTemplates";
import { templateToDraft, type TemplateListItem } from "@/lib/templates/model";
import type { TxDraft } from "@/lib/transactions/model";

/**
 * SCREEN-14 § 6 — "tap simple" launches the transaction wizard pre-filled from a
 * template. The user only has to confirm.
 */
export function LaunchTemplate({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    { tpl: TemplateListItem; draft: TxDraft } | "loading" | "error"
  >("loading");

  useEffect(() => {
    let alive = true;
    fetchTemplate(id)
      .then((tpl) => alive && setState({ tpl, draft: templateToDraft(tpl) }))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-brand-deep p-6">
        <Skeleton className="h-72 w-full max-w-[420px]" rounded="rounded-[28px]" />
      </div>
    );
  }
  if (state === "error") {
    router.replace("/templates");
    return null;
  }

  return (
    <TxWizard
      type={state.tpl.kind}
      initialDraft={state.draft}
      launchedTemplateId={state.tpl.id}
    />
  );
}
