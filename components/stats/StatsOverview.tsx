"use client";

import { StatCurve } from "@/components/stats/StatCurve";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";
import type { StatsPayload } from "@/lib/stats/model";

/** SCREEN-11 § 4 — reuses the dashboard curve maths + a "Bénéfice net" block. */
export function StatsOverview({
  data,
  periodLabel,
  loading,
}: {
  data: StatsPayload["overview"] | null;
  periodLabel: string;
  loading: boolean;
}) {
  const m = useMessages();
  const o = m.stats.overview;

  if (loading || !data) {
    return <Skeleton className="h-72 w-full" rounded="rounded-[20px]" />;
  }

  const netUp = data.net >= 0;
  const netVar = data.netVariation;

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-surface-card p-4">
      {data.curve && data.curve.length > 0 ? (
        <StatCurve points={data.curve} />
      ) : (
        <p className="t-secondary py-8 text-center text-text-tertiary">
          {o.curveOffline}
        </p>
      )}

      <div className="grid grid-cols-2 gap-x-2 gap-y-4 border-t border-surface-hairline pt-4">
        <Cell label={o.startBalance} value={formatBalance(data.startBalance, "XOF")} />
        <Cell
          label={o.currentBalance}
          value={formatBalance(data.currentBalance, "XOF")}
          right
        />
        <Cell
          label={o.income}
          value={formatBalance(data.income, "XOF")}
          tone="text-semantic-in"
        />
        <Cell
          label={o.expenses}
          value={formatBalance(data.expenses, "XOF")}
          tone="text-semantic-out"
          right
        />
      </div>

      <div className="flex flex-col items-center gap-0.5 rounded-[16px] bg-semantic-in-bg/60 p-3.5">
        <span className="text-[12px] font-semibold text-text-secondary">
          {o.netProfit}
        </span>
        <span
          className={`text-[28px] font-bold tabular tracking-[-0.028em] ${netUp ? "text-semantic-in" : "text-semantic-out"}`}
        >
          {formatMoney(Math.abs(data.net), { currency: "XOF", sign: netUp ? "in" : "out" })}
        </span>
        {netVar !== null ? (
          <span
            className={`text-[13px] font-semibold tabular ${netVar >= 0 ? "text-semantic-in" : "text-semantic-out"}`}
          >
            {netVar >= 0 ? "↑" : "↓"} {Math.abs(netVar).toFixed(1)} %{" "}
            {interpolate(o.vsPeriod, { period: periodLabel })}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  tone = "text-text-primary",
  right = false,
}: {
  label: string;
  value: string;
  tone?: string;
  right?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-0.5 ${right ? "text-right" : ""}`}>
      <span className="text-[12px] text-text-tertiary">{label}</span>
      <span className={`text-[19px] font-bold tabular tracking-[-0.018em] ${tone}`}>
        {value}
      </span>
    </div>
  );
}
