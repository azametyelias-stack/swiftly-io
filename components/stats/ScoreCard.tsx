"use client";

import Link from "next/link";

import { ScoreGauge } from "@/components/stats/ScoreGauge";
import { StatBar } from "@/components/stats/StatBar";
import { SheetButton } from "@/components/transactions/SheetButton";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";
import type { ScorePayload } from "@/lib/stats/model";

/** SCREEN-11 § 7 — the Score Financier card + the "Voir le rapport" CTA. */
export function ScoreCard({ score }: { score: ScorePayload }) {
  const m = useMessages();
  const s = m.stats.score;
  const tier = score.tier as keyof typeof s.tiers;

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] bg-surface-card p-4">
      <div className="flex items-center gap-5">
        <ScoreGauge score={score.score} outOf={s.outOf} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[22px] font-bold tracking-[-0.02em] text-semantic-in">
            {s.tiers[tier]}
          </span>
          <span className="t-secondary text-text-secondary">
            {s.tierBlurb[tier]}
          </span>
          <Link
            href="/aides"
            className="text-[14px] font-semibold text-brand-accent"
          >
            {s.seeHelp}
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-surface-hairline pt-4">
        {score.criteria.map((c) => (
          <div key={c.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold">
                {s.criteria[c.key]}
              </span>
              <span className="text-[14px] font-bold tabular">
                {c.key === "diversification"
                  ? interpolate(c.value === 1 ? s.source : s.sources, { n: c.value })
                  : `${c.value} %`}
              </span>
            </div>
            <StatBar value={c.normalized} />
          </div>
        ))}
      </div>

      <Link href="/rapport" className="w-full">
        <SheetButton variant="primary">{s.seeReport}</SheetButton>
      </Link>
    </div>
  );
}
