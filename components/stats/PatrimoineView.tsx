"use client";

import { AccountTypeIcon, InfoIcon } from "@/components/nav/icons";
import { formatBalance } from "@/lib/format/money";
import { useMessages } from "@/lib/i18n/useMessages";
import type { PatrimoinePayload } from "@/lib/stats/model";

/** SCREEN-11 — Mode Patrimoine (Lot 4 dc.html). Sum of account balances +
 * completed-project value; does not enter the score. */
export function PatrimoineView({ payload }: { payload: PatrimoinePayload }) {
  const m = useMessages();
  const p = m.stats.patrimoine;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="text-[12px] text-text-tertiary">{p.title}</span>
        <span className="text-[38px] font-bold leading-[1.1] tabular tracking-[-0.036em]">
          {formatBalance(payload.estimated, "XOF")}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="t-body font-semibold">{p.accounts}</span>
        {payload.accounts.map((a, i) => (
          <div
            key={a.id}
            className={`flex items-center gap-3 ${i < payload.accounts.length - 1 ? "border-b border-surface-hairline pb-2.5" : ""}`}
          >
            <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-surface-field text-text-secondary">
              <AccountTypeIcon type={a.type} width={16} height={16} />
            </span>
            <span className="flex-1 text-[14px]">{a.name}</span>
            <span className="text-[14px] font-bold tabular">
              {formatBalance(a.balance, "XOF")}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
        <span className="t-body font-semibold">{p.completedProjects}</span>
        {payload.completedProjects.length === 0 ? (
          <p className="t-secondary text-text-tertiary">{p.noProjects}</p>
        ) : (
          payload.completedProjects.map((pr, i) => (
            <div
              key={pr.id}
              className={`flex items-center gap-3 ${i < payload.completedProjects.length - 1 ? "border-b border-surface-hairline pb-2.5" : ""}`}
            >
              <span className="size-8 flex-none rounded-[10px] bg-brand-deep" />
              <span className="flex-1 text-[14px] font-semibold">{pr.name}</span>
              <span className="text-[14px] font-bold tabular">
                {formatBalance(pr.amount, "XOF")}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-[14px] bg-brand-accent/[0.07] p-3.5">
        <span className="mt-0.5 flex-none text-brand-accent">
          <InfoIcon width={18} height={18} />
        </span>
        <span className="t-secondary text-brand-accent">{p.note}</span>
      </div>
    </div>
  );
}
