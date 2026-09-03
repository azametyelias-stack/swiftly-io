"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlusIcon } from "@/components/nav/icons";
import { BudgetFormSheet } from "@/components/budgets/BudgetFormSheet";
import { BudgetListRow } from "@/components/budgets/BudgetListRow";
import { ManageEmptyState } from "@/components/ui/ManageEmptyState";
import { NightScreen } from "@/components/ui/NightScreen";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  BUDGET_SORTS,
  sortBudgets,
  type BudgetSort,
} from "@/lib/budgets/model";
import { createBudgetRequest, useBudgets } from "@/lib/budgets/useBudgets";
import { useMessages } from "@/lib/i18n/useMessages";

export function BudgetsScreen() {
  const m = useMessages();
  const t = m.budgets;
  const router = useRouter();
  const toast = useToast();
  const { budgets, status, reload } = useBudgets();

  const [sort, setSort] = useState<BudgetSort>("recent");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => sortBudgets(budgets, sort), [budgets, sort]);
  const hasAny = status === "ready" && budgets.length > 0;

  return (
    <NightScreen
      title={t.title}
      right={
        <button
          type="button"
          aria-label={t.form.createTitle}
          onClick={() => setCreating(true)}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <PlusIcon width={18} height={18} />
        </button>
      }
      contentClassName="overflow-hidden"
    >
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {hasAny ? (
          <div className="flex-none px-4 pt-4">
            <div className="w-44">
              <SelectField
                ariaLabel={t.sortLabel}
                value={sort}
                placeholder={t.sorts.recent}
                options={BUDGET_SORTS.map((s) => ({ value: s, label: t.sorts[s] }))}
                onSelect={(v) => setSort(v as BudgetSort)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
          {status === "loading" ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" rounded="rounded-[20px]" />
              ))}
            </div>
          ) : status === "error" ? (
            <ManageEmptyState
              title={t.loadErrorTitle}
              body={t.loadErrorBody}
              action={<SheetButton variant="ghost" onClick={reload}>{m.common.retry}</SheetButton>}
            />
          ) : budgets.length === 0 ? (
            <ManageEmptyState
              title={t.emptyTitle}
              body={t.emptyBody}
              action={
                <SheetButton variant="primary" onClick={() => setCreating(true)}>
                  {t.addCta}
                </SheetButton>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => router.push(`/budgets/${b.id}`)}
                  className="rounded-[var(--radius-card)] bg-surface-card text-left"
                >
                  <BudgetListRow budget={b} />
                </button>
              ))}
            </div>
          )}
        </div>

        {hasAny ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-page from-40% to-transparent p-4 pt-8">
            <SheetButton variant="primary" className="pointer-events-auto" onClick={() => setCreating(true)}>
              <PlusIcon width={18} height={18} />
              {t.addCta}
            </SheetButton>
          </div>
        ) : null}
      </div>

      {toast.node}

      {creating ? (
        <BudgetFormSheet
          usedCategoryIds={budgets.map((b) => b.category.id)}
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createBudgetRequest(payload);
            toast.show(t.createdToast);
            reload();
          }}
        />
      ) : null}
    </NightScreen>
  );
}
