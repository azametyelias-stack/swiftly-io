"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AllocateSheet } from "@/components/projects/AllocateSheet";
import { ProjectFormSheet } from "@/components/projects/ProjectFormSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NightScreen } from "@/components/ui/NightScreen";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatLongDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { projectProgress } from "@/lib/projects/model";
import {
  allocateRequest,
  deleteProjectRequest,
  fetchProject,
  updateProjectRequest,
  type ProjectDetail,
} from "@/lib/projects/useProjects";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";
import type { Locale } from "@/lib/i18n";

export function ProjectDetailScreen({ id }: { id: string }) {
  const m = useMessages();
  const t = m.projects;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();

  const [data, setData] = useState<ProjectDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchProject(id)
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(load, [load]);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteProjectRequest(id);
      toast.show(t.deletedToast);
      router.push("/projets");
    } catch {
      toast.show(m.common.genericError);
      setBusy(false);
      setConfirming(false);
    }
  };

  const p = data?.project ?? null;
  const funded = p ? p.allocated_amount + p.spent : 0;
  const progress = p ? projectProgress(funded, p.target_amount) : null;

  return (
    <NightScreen title={t.detailTitle}>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 pb-16">
        {status === "loading" ? (
          <Skeleton className="h-48 w-full" rounded="rounded-[20px]" />
        ) : status === "error" || !data || !p ? (
          <div className="py-16 text-center">
            <p className="t-body text-text-secondary">{t.loadErrorBody}</p>
            <button
              onClick={() => {
                setStatus("loading");
                load();
              }}
              className="mt-3 text-[13px] font-semibold text-brand-accent"
            >
              {m.common.retry}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="t-section-title">{p.name}</span>
                <span className="t-label rounded-full bg-surface-field px-2 py-0.5 text-text-tertiary">
                  {t.statuses[p.status]}
                </span>
              </div>
              <p className="t-secondary text-text-secondary">{p.description}</p>
              <p className="t-secondary text-text-tertiary">
                {t.categories[p.category as "other"] ?? p.category}
                {p.start_date ? ` · ${formatLongDate(p.start_date, locale)}` : ""}
                {p.end_date ? ` → ${formatLongDate(p.end_date, locale)}` : ""}
              </p>

              {progress ? (
                <>
                  <ProgressBar ratio={progress.ratio} tone={progress.tone} height={10} />
                  <span className="t-secondary text-text-tertiary tabular">
                    {formatMoney(funded, { sign: "none" })} /{" "}
                    {formatMoney(p.target_amount ?? 0, { sign: "none" })} · {progress.percent} %
                  </span>
                </>
              ) : null}

              <dl className="flex flex-col gap-1 text-[14px]">
                <Row k={t.allocatedLabel} v={formatMoney(p.allocated_amount, { sign: "none" })} />
                <Row k={t.spentLabel} v={formatMoney(p.spent, { sign: "none" })} />
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SheetButton variant="primary" onClick={() => setAllocating(true)} disabled={busy}>
                {t.allocate.cta}
              </SheetButton>
              <SheetButton variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
                {m.common.edit}
              </SheetButton>
              {p.status !== "done" ? (
                <SheetButton
                  variant="ghost"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const d = await updateProjectRequest(id, { status: "done" });
                      setData(d);
                      toast.show(t.markedDone);
                    } catch {
                      toast.show(m.common.genericError);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  {t.markDone}
                </SheetButton>
              ) : null}
              <SheetButton variant="danger" onClick={() => setConfirming(true)} disabled={busy}>
                {m.common.delete}
              </SheetButton>
            </div>

            <section className="flex flex-col gap-2">
              <h2 className="t-section-title">{t.linkedTitle}</h2>
              {data.transactions.length === 0 ? (
                <p className="t-secondary text-text-tertiary">{t.noTransactions}</p>
              ) : (
                <ul className="flex flex-col rounded-[var(--radius-card)] bg-surface-card">
                  {data.transactions.map((tx, i) => (
                    <li key={tx.id}>
                      <button
                        onClick={() => router.push(`/historiques/${tx.id}`)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                          i < data.transactions.length - 1
                            ? "border-b border-surface-hairline"
                            : ""
                        }`}
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="t-body truncate">{tx.note ?? t.expenseFallback}</span>
                          <span className="t-secondary text-text-tertiary">
                            {formatLongDate(tx.occurred_on, locale)}
                          </span>
                        </span>
                        <span className="t-body flex-none font-bold tabular">
                          {formatMoney(tx.amount, { sign: "none" })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {toast.node}

      {editing && p ? (
        <ProjectFormSheet
          project={p}
          onClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            const d = await updateProjectRequest(id, payload);
            setData(d);
            toast.show(m.common.savedToast);
          }}
        />
      ) : null}

      {allocating && data ? (
        <AllocateSheet
          allocated={data.project.allocated_amount}
          accountBalance={data.accountBalance}
          onClose={() => setAllocating(false)}
          onSubmit={async (amount, direction) => {
            await allocateRequest(id, amount, direction);
            toast.show(t.allocate.done);
            load();
          }}
        />
      ) : null}

      {confirming ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={t.deleteBody.replace("{name}", p?.name ?? "")}
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      ) : null}
    </NightScreen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-surface-hairline py-1.5 last:border-0">
      <dt className="text-text-tertiary">{k}</dt>
      <dd className="text-right font-medium tabular">{v}</dd>
    </div>
  );
}
