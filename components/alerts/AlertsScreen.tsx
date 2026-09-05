"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AlertRow } from "@/components/alerts/AlertRow";
import { SelectField } from "@/components/transactions/SelectField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NightScreen } from "@/components/ui/NightScreen";
import { Skeleton } from "@/components/ui/Skeleton";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { useToast } from "@/components/ui/Toast";
import {
  ALERT_SORTS,
  KIND_FILTERS,
  sortAlerts,
  unreadCount,
  type AlertSort,
  type KindFilter,
} from "@/lib/alerts/model";
import { useAlerts } from "@/lib/alerts/useAlerts";
import { beninDayOf, formatMonthYear, todayISO } from "@/lib/format/date";
import { groupByPeriod } from "@/lib/transactions/model";
import type { Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

/**
 * SCREEN-18 — Alertes & Notifications. A single inbox for the two kinds of
 * notification that are *records*: reactive alerts (a budget went over) and
 * scheduled notifications (the daily score). Transient toasts never appear —
 * the artboard: "tout ce qui s'y trouve méritait d'être gardé".
 *
 * § 3: no "+" in the header. There is nothing to create here, so the slot stays
 * empty rather than being filled with a decorative icon. What does sit there is
 * "tout marquer comme lu", which acts on the list rather than adding to it.
 */
export function AlertsScreen() {
  const m = useMessages();
  const t = m.alerts;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const today = todayISO();

  const { items, status, kind, setKind, reload, remove, readAll } = useAlerts();
  const [sort, setSort] = useState<AlertSort>("recent");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () =>
      groupByPeriod(
        sortAlerts(items, sort).map((it) => ({
          ...it,
          // Bénin day, not `created_at.slice(0, 10)`: near midnight the UTC
          // date is the previous one and the row would file under "Hier".
          occurred_on: beninDayOf(it.created_at),
        })),
        today,
      ),
    [items, sort, today],
  );

  const groupLabel = (id: string) =>
    id in m.transactions.groups
      ? m.transactions.groups[id as keyof typeof m.transactions.groups]
      : formatMonthYear(id, locale);

  const kindLabels: Record<KindFilter, string> = {
    all: t.filterAll,
    alert: t.filterAlert,
    scheduled: t.filterScheduled,
  };
  const sortLabels: Record<AlertSort, string> = {
    recent: t.sortRecent,
    urgency: t.sortUrgency,
    frequent: t.sortFrequent,
    alpha: t.sortAlpha,
  };

  const unread = unreadCount(items);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const okay = await remove(pendingDelete);
    setBusy(false);
    setPendingDelete(null);
    toast.show(okay ? t.deleted : m.common.genericError);
  };

  const loading = status === "loading";
  const errored = status === "error";
  const empty = status === "ready" && items.length === 0;

  return (
    <NightScreen
      title={t.title}
      right={
        unread > 0 ? (
          <button
            type="button"
            onClick={() =>
              void readAll().then((okay) =>
                toast.show(okay ? t.allReadToast : m.common.genericError),
              )
            }
            className="rounded-[var(--radius-pill)] border border-white/20 bg-white/10 px-3 py-1.5 text-[13px] font-semibold"
          >
            {t.markAllRead}
          </button>
        ) : null
      }
      contentClassName="overflow-hidden"
    >
      <div className={`flex flex-none gap-3 p-4 ${empty ? "opacity-50" : ""}`}>
        <div className="flex-1">
          <SelectField
            ariaLabel={t.filterAll}
            value={kind}
            placeholder={t.filterAll}
            options={KIND_FILTERS.map((k) => ({ value: k, label: kindLabels[k] }))}
            onSelect={(v) => setKind(v as KindFilter)}
          />
        </div>
        <div className="flex-1">
          <SelectField
            ariaLabel={t.sortRecent}
            value={sort}
            placeholder={t.sortRecent}
            options={ALERT_SORTS.map((s) => ({ value: s, label: sortLabels[s] }))}
            onSelect={(v) => setSort(v as AlertSort)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[68px] w-full" rounded="rounded-[var(--radius-block)]" />
            ))}
          </div>
        ) : errored ? (
          <Centered title={t.loadError} body="" action={{ label: m.common.retry, onClick: reload }} />
        ) : empty ? (
          <Centered title={t.emptyTitle} body={t.emptyBody} />
        ) : groups.length === 0 ? (
          <Centered title={t.noResults} body="" />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <section key={g.id} className="flex flex-col gap-2">
                <h2 className="t-body px-1 font-bold">{groupLabel(g.id)}</h2>
                <div className="flex flex-col gap-2">
                  {g.rows.map((item) => (
                    <SwipeToDelete
                      key={item.id}
                      deleteLabel={m.common.delete}
                      onDelete={() => setPendingDelete(item.id)}
                    >
                      <AlertRow
                        item={item}
                        locale={locale}
                        kindLabel={item.kind === "alert" ? t.kindAlert : t.kindScheduled}
                        onOpen={() => router.push(`/alertes/${item.id}`)}
                      />
                    </SwipeToDelete>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={t.deleteBody}
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}

      {toast.node}
    </NightScreen>
  );
}

function Centered({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
      {body ? <p className="max-w-[300px] t-body text-text-secondary">{body}</p> : null}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 rounded-[var(--radius-pill)] border border-surface-rail px-4 py-2 text-[13px] font-semibold"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
