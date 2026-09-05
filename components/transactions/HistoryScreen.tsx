"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronLeftIcon, PlusIcon } from "@/components/nav/icons";
import { DeleteConfirmSheet } from "@/components/transactions/DeleteConfirmSheet";
import { SelectField } from "@/components/transactions/SelectField";
import { TxListRow } from "@/components/transactions/TxListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { todayISO, formatMonthYear } from "@/lib/format/date";
import { formatBalance } from "@/lib/format/money";
import {
  directionOf,
  groupByPeriod,
  sortRows,
  SORTS,
  type SortMode,
  type TxListItem,
  type TypeFilter,
} from "@/lib/transactions/model";
import { useHistory } from "@/lib/transactions/useHistory";
import { type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

type Row = TxListItem & { label: string };

export function HistoryScreen({
  initialType,
  account,
}: {
  initialType?: "expense" | "income" | "transfer";
  account?: string;
}) {
  const m = useMessages();
  const t = m.transactions;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const today = todayISO();

  const { items, status, filter, setFilter, hasMore, loadMore, remove, reload } =
    useHistory(initialType ?? "all", account);
  const [sort, setSort] = useState<SortMode>("recent");
  const [pending, setPending] = useState<TxListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) loadMore();
      },
      { rootMargin: "160px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  const groups = useMemo(() => {
    const rows: Row[] = items.map((it) => ({
      ...it,
      label:
        it.category?.name ??
        it.source_account?.name ??
        it.destination_account?.name ??
        "",
    }));
    return groupByPeriod(sortRows(rows, sort), today);
  }, [items, sort, today]);

  const groupLabel = (id: string) =>
    id in t.groups
      ? t.groups[id as keyof typeof t.groups]
      : formatMonthYear(id, locale);

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: "all", label: t.list.filterAll },
    { value: "expense", label: t.list.filterExpense },
    { value: "income", label: t.list.filterIncome },
    { value: "transfer", label: t.list.filterTransfer },
  ];
  const sortLabels: Record<SortMode, string> = {
    recent: t.list.sortRecent,
    amount: t.list.sortAmount,
    alpha: t.list.sortAlpha,
    frequent: t.list.sortFrequent,
  };

  const confirmDelete = async () => {
    if (!pending) return;
    setDeleting(true);
    const ok = await remove(pending.id);
    setDeleting(false);
    setPending(null);
    toast.show(ok ? t.list.deleted : t.errors.saveFailed);
  };

  const loading = status === "loading";
  const errored = status === "error";
  const empty = status === "ready" && items.length === 0;

  return (
    <div className="relative flex h-[100dvh] flex-col bg-brand-deep">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,10,60,0.5) 0%, rgba(6,10,60,0.7) 100%)",
        }}
      />

      {/* pt = safe area (translucent status bar) — cf. NightScreen. */}
      <div className="relative flex flex-none items-center justify-between px-2 py-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-ink-on-surface">
        <button
          type="button"
          aria-label={m.common.back}
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <ChevronLeftIcon width={18} height={18} />
        </button>
        <span className="t-screen-title">{t.list.title}</span>
        <Link
          href="/transactions/nouvelle"
          aria-label={t.list.newTransaction}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <PlusIcon width={18} height={18} />
        </Link>
      </div>

      <div className="relative flex flex-1 flex-col overflow-hidden rounded-t-[var(--radius-content-top)] bg-surface-page">
        <div className={`flex flex-none gap-3 p-4 ${empty ? "opacity-50" : ""}`}>
          <div className="flex-1">
            <SelectField
              ariaLabel={t.list.filterAll}
              value={filter}
              placeholder={t.list.filterAll}
              options={typeOptions.map((o) => ({ value: o.value, label: o.label }))}
              onSelect={(v) => setFilter(v as TypeFilter)}
            />
          </div>
          <div className="flex-1">
            <SelectField
              ariaLabel={t.list.sortRecent}
              value={sort}
              placeholder={t.list.sortRecent}
              options={SORTS.map((s) => ({ value: s, label: sortLabels[s] }))}
              onSelect={(v) => setSort(v as SortMode)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" rounded="rounded-[18px]" />
              ))}
            </div>
          ) : errored ? (
            <Centered
              title={t.list.loadError}
              body=""
              action={{ label: m.common.retry, onClick: reload }}
            />
          ) : empty ? (
            <Centered title={t.list.emptyTitle} body={t.list.emptyBody} />
          ) : groups.length === 0 ? (
            <Centered title={t.list.noResults} body="" />
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((g) => (
                <section key={g.id} className="flex flex-col gap-2">
                  <h2 className="t-body px-1 font-bold">{groupLabel(g.id)}</h2>
                  <div className="flex flex-col gap-2">
                    {g.rows.map((tx) => (
                      <TxListRow
                        key={tx.id}
                        tx={tx}
                        today={today}
                        locale={locale}
                        m={m}
                        onOpen={() => router.push(`/historiques/${tx.id}`)}
                        onDelete={() => setPending(tx)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              {hasMore ? <div ref={sentinel} className="h-8" /> : null}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-page from-40% to-transparent p-4 pt-8">
          <Link
            href="/transactions/nouvelle"
            className="pointer-events-auto flex h-[var(--size-primary-button)] w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-action-primary text-[17px] font-semibold text-action-on-primary shadow-[0_16px_34px_-6px_rgba(4,6,30,0.44)]"
          >
            <PlusIcon width={20} height={20} />
            {t.list.newTransaction}
          </Link>
        </div>
      </div>

      {toast.node}
      {pending ? (
        <DeleteConfirmSheet
          label={
            pending.category?.name ??
            (directionOf(pending.type) === "neutral"
              ? `${pending.source_account?.name} → ${pending.destination_account?.name}`
              : (pending.source_account?.name ??
                pending.destination_account?.name ??
                t.list.title))
          }
          amount={formatBalance(pending.amount, "XOF")}
          busy={deleting}
          onCancel={() => setPending(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
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
      {body ? (
        <p className="max-w-[300px] t-body text-text-secondary">{body}</p>
      ) : null}
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
