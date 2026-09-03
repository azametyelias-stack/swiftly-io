"use client";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@/components/nav/icons";
import { formatMoney } from "@/lib/format/money";
import type { TemplateListItem } from "@/lib/templates/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function TemplateListRow({
  template,
  onEdit,
}: {
  template: TemplateListItem;
  onEdit: () => void;
}) {
  const m = useMessages();
  const t = m.templates;
  const isExpense = template.kind === "expense";
  const Icon = isExpense ? ArrowDownLeftIcon : ArrowUpRightIcon;
  const recur =
    template.recurrence === "once" ? null : m.transactions.recurrence[template.recurrence];

  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className={`grid size-11 flex-none place-items-center rounded-[var(--radius-icon)] ${
          isExpense
            ? "bg-semantic-out-bg text-semantic-out"
            : "bg-semantic-in-bg text-semantic-in"
        }`}
      >
        <Icon width={20} height={20} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-body truncate font-semibold">{template.name}</span>
        {template.description ? (
          <span className="t-secondary truncate text-text-tertiary">
            {template.description}
          </span>
        ) : null}
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={`t-label ${isExpense ? "text-semantic-out" : "text-semantic-in"}`}
          >
            {isExpense ? t.kindExpense : t.kindIncome}
          </span>
          {recur ? (
            <span className="t-label rounded-full bg-brand-accent/10 px-1.5 text-brand-accent">
              {recur}
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex flex-none flex-col items-end gap-1">
        <span className="t-body font-bold tabular">
          {formatMoney(template.amount, { sign: "none" })}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="t-label text-brand-accent"
        >
          {m.common.edit}
        </button>
      </span>
    </div>
  );
}
