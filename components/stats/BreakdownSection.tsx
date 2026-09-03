"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDownIcon } from "@/components/nav/icons";
import { Donut, rampColor, type DonutSegment } from "@/components/stats/Donut";
import { SelectField } from "@/components/transactions/SelectField";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { useMessages } from "@/lib/i18n/useMessages";
import type { BreakdownDimension, StatsBreakdownPayload } from "@/lib/stats/model";

/** SCREEN-11 §§ 5-6 — a donut + a clickable breakdown list. */
export function BreakdownSection({
  kind,
  payload,
  by,
  onChangeBy,
  passiveShare,
}: {
  kind: "expense" | "income";
  payload: StatsBreakdownPayload;
  by: BreakdownDimension;
  onChangeBy: (d: BreakdownDimension) => void;
  passiveShare?: number;
}) {
  const m = useMessages();
  const b = m.stats.breakdown;
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const entries = payload.entries.map((e, i) => ({
    ...e,
    label: e.key === "__other__" ? b.others : e.label || b.unassigned,
    resolvedColor: e.color ?? rampColor(i, kind),
  }));
  const visible = expanded ? entries : entries.slice(0, 4);

  const segments: DonutSegment[] = entries.map((e) => ({
    key: e.key,
    value: e.amount,
    color: e.resolvedColor,
  }));

  const varUp = (payload.totalVariation ?? 0) >= 0;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="w-40">
          <SelectField
            ariaLabel={b.byLabel[by]}
            value={by}
            placeholder={b.byLabel.category}
            options={(["category", "account", "person", "project"] as const).map(
              (d) => ({ value: d, label: b.byLabel[d] }),
            )}
            onSelect={(v) => onChangeBy(v as BreakdownDimension)}
          />
        </div>
      </div>

      {payload.total <= 0 ? (
        <p className="t-secondary py-6 text-center text-text-tertiary">{b.empty}</p>
      ) : (
        <>
          <Donut segments={segments}>
            <span className="text-[11px] text-text-tertiary">
              {kind === "income" ? b.incomeTotal : b.expenseTotal}
            </span>
            <span className="text-[24px] font-bold tabular tracking-[-0.02em]">
              {formatBalance(payload.total, "XOF")}
            </span>
            {payload.totalVariation !== null ? (
              <span
                className={`text-[13px] font-semibold tabular ${varUp ? "text-semantic-in" : "text-semantic-out"}`}
              >
                {varUp ? "↑" : "↓"} {Math.abs(payload.totalVariation).toFixed(1)} %
              </span>
            ) : null}
          </Donut>

          <ul className="flex flex-col">
            {visible.map((e, i) => (
              <li key={e.key}>
                <button
                  type="button"
                  onClick={() => router.push(`/historiques?type=${kind}`)}
                  className={`flex w-full items-center gap-3 py-3 text-left ${
                    i < visible.length - 1 ? "border-b border-surface-hairline" : ""
                  }`}
                >
                  <span
                    className="size-8 flex-none rounded-[10px]"
                    style={{ background: e.resolvedColor }}
                  />
                  <span className="t-body flex-1 truncate font-semibold">
                    {e.label}
                  </span>
                  <span className="t-body flex-none font-bold tabular">
                    {formatMoney(e.amount, { currency: "XOF", sign: "none" })}
                  </span>
                  <span className="w-11 flex-none text-right text-[14px] font-semibold tabular text-text-tertiary">
                    {Math.round(e.share * 100)} %
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {entries.length > 4 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-11 w-full items-center justify-center gap-1.5 rounded-[var(--radius-pill)] border border-surface-rail bg-surface-field text-[14px] font-semibold"
            >
              {expanded ? b.seeLess : b.seeMore}
              <ChevronDownIcon
                width={12}
                height={12}
                className={expanded ? "rotate-180" : ""}
              />
            </button>
          ) : null}

          {kind === "income" && passiveShare !== undefined && payload.total > 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-brand-accent/[0.07] px-3.5 py-3">
              <span className="t-secondary text-brand-accent">
                {b.passiveShare}
              </span>
              <span className="text-[15px] font-bold tabular text-brand-accent">
                {formatBalance(passiveShare, "XOF")} ·{" "}
                {Math.round((passiveShare / payload.total) * 100)} %
              </span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
