"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/format/money";
import { budgetStatus, type BudgetListItem } from "@/lib/budgets/model";

export function BudgetListRow({ budget }: { budget: BudgetListItem }) {
  const s = budgetStatus(budget.spent, budget.allocated_amount);
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <span
          className="size-9 flex-none rounded-[var(--radius-icon)]"
          style={{ background: budget.category.color }}
        />
        <span className="t-body flex-1 truncate font-semibold">
          {budget.category.name}
        </span>
        <span
          className={`t-body flex-none font-bold tabular ${
            s.tone === "red" ? "text-semantic-out" : ""
          }`}
        >
          {s.percent} %
        </span>
      </div>
      <ProgressBar ratio={s.ratio} tone={s.tone} />
      <span className="t-secondary text-text-tertiary tabular">
        {formatMoney(budget.spent, { sign: "none" })} /{" "}
        {formatMoney(budget.allocated_amount, { sign: "none" })}
      </span>
    </div>
  );
}
