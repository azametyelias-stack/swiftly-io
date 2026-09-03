"use client";

import { formatBalance, formatMoney } from "@/lib/format/money";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";
import type { SpendModePayload } from "@/lib/stats/model";

/** SCREEN-11 — the Dépense / Revenu dedicated modes (Lot 4 dc.html). */
export function SpendModeView({
  kind,
  payload,
  periodLabel,
}: {
  kind: "expense" | "income";
  payload: SpendModePayload;
  periodLabel: string;
}) {
  const m = useMessages();
  const s = m.stats.spendMode;
  const income = kind === "income";

  const maxBucket = Math.max(1, ...payload.buckets.map((b) => b.amount));
  const splitTotal = Math.max(1, payload.splitA + payload.splitB);
  const aPct = Math.round((payload.splitA / splitTotal) * 100);

  const headline = income ? s.incomeTotal : s.expenseTotal;
  const color = income ? "text-semantic-in" : "text-semantic-out";
  const varVal = payload.variation;
  // for expenses a drop is good (green), for income a rise is good
  const varGood = varVal === null ? false : income ? varVal >= 0 : varVal <= 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="text-[12px] text-text-tertiary">
          {interpolate(headline, { period: periodLabel })}
        </span>
        <span
          className={`text-[38px] font-bold leading-[1.1] tabular tracking-[-0.036em] ${color}`}
        >
          {formatBalance(payload.total, "XOF")}
        </span>
        {varVal !== null ? (
          <span
            className={`text-[13px] font-semibold tabular ${varGood ? "text-semantic-in" : "text-semantic-out"}`}
          >
            {varVal >= 0 ? "↑" : "↓"} {Math.abs(varVal).toFixed(1)} % {s.vsPrevious}
          </span>
        ) : null}

        <div className="mt-3 flex h-[104px] items-end gap-2">
          {payload.buckets.map((b, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-[6px]"
                style={{
                  height: `${Math.max(4, (b.amount / maxBucket) * 96)}px`,
                  background:
                    b.amount === maxBucket
                      ? "var(--brand-deep)"
                      : "color-mix(in srgb, var(--brand-accent) 45%, white)",
                }}
              />
              <span className="text-[10px] font-semibold text-text-tertiary">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="t-body font-semibold">
          {income ? s.activeVsPassive : s.investVsConso}
        </span>
        <div className="flex h-8 overflow-hidden rounded-[10px]">
          <div
            className="flex items-center justify-center bg-brand-accent text-[12px] font-bold text-ink-on-surface"
            style={{ width: `${Math.max(6, aPct)}%` }}
          >
            {aPct} %
          </div>
          <div className="flex flex-1 items-center justify-center bg-surface-rail text-[12px] font-bold text-text-secondary">
            {100 - aPct} %
          </div>
        </div>
        <div className="flex justify-between text-[13px] font-semibold">
          <span className="text-brand-accent">
            {income ? s.active : s.investment} ·{" "}
            {formatMoney(payload.splitA, { currency: "XOF", sign: "none" })}
          </span>
          <span className="text-text-secondary">
            {income ? s.passive : s.consumption} ·{" "}
            {formatMoney(payload.splitB, { currency: "XOF", sign: "none" })}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="t-body font-semibold">{s.rising}</span>
        {payload.rising.length === 0 ? (
          <p className="t-secondary text-text-tertiary">{s.noRising}</p>
        ) : (
          payload.rising.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <span className="text-[14px]">{r.label || s.rising}</span>
              <span
                className={`text-[14px] font-bold tabular ${income ? "text-semantic-in" : "text-semantic-out"}`}
              >
                +{Math.round(r.variation)} %
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
