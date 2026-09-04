"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDownIcon, PlusIcon } from "@/components/nav/icons";
import { apiJson } from "@/lib/http/api";
import { formatMoney, type CurrencyCode } from "@/lib/format/money";
import type { TemplateListItem } from "@/lib/templates/model";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * The Templates strip on the dashboard (SCREEN-4, design `04-dashboard.png`): a
 * horizontal carousel — a dashed "create" cell first, then one card per template
 * (top border coloured by kind). Tap launches the transaction wizard pre-filled.
 */
export function TemplatesCarousel({ currency = "XOF" }: { currency?: CurrencyCode }) {
  const m = useMessages();
  const t = m.dashboard.templates;
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateListItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiJson<{ templates: TemplateListItem[] }>("/api/templates")
      .then((r) => alive && setTemplates(r.templates))
      .catch(() => alive && setTemplates([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => router.push("/templates")}
        className="flex h-[156px] w-[104px] flex-none flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-surface-rail bg-surface-card"
      >
        <span className="grid size-9 place-items-center rounded-[12px] bg-surface-field">
          <PlusIcon width={18} height={18} />
        </span>
        <span className="px-2 text-center text-[12px] font-semibold leading-tight text-text-secondary">
          {t.create}
        </span>
      </button>

      {templates?.map((tpl) => {
        const isExpense = tpl.kind === "expense";
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => router.push(`/transactions/nouvelle?template=${tpl.id}`)}
            className="flex h-[156px] w-[136px] flex-none flex-col gap-2 rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-3 text-left"
            style={{
              borderTopWidth: 3,
              borderTopColor: isExpense
                ? "var(--semantic-out)"
                : "var(--semantic-in)",
            }}
          >
            <span
              className="grid size-9 flex-none place-items-center rounded-[12px] text-[13px] font-bold text-white"
              style={{ backgroundColor: tpl.category?.color ?? "var(--text-tertiary)" }}
            >
              {(tpl.category?.name ?? tpl.name).slice(0, 1).toUpperCase()}
            </span>
            <span className="line-clamp-1 text-[14px] font-semibold">{tpl.name}</span>
            <span className="line-clamp-2 flex-1 text-[12px] leading-tight text-text-tertiary">
              {tpl.description || tpl.category?.name || ""}
            </span>
            <span className="flex items-center justify-between">
              <span
                className={`text-[14px] font-bold tabular ${
                  isExpense ? "text-semantic-out" : "text-semantic-in"
                }`}
              >
                {formatMoney(tpl.amount, { currency, sign: isExpense ? "out" : "in" })}
              </span>
              <ChevronDownIcon width={14} height={14} className="-rotate-90 text-text-tertiary" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
