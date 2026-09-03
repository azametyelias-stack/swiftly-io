"use client";

import Link from "next/link";

import { PlusIcon } from "@/components/nav/icons";
import { BreakdownSection } from "@/components/stats/BreakdownSection";
import { PatrimoineView } from "@/components/stats/PatrimoineView";
import { ScoreCard } from "@/components/stats/ScoreCard";
import { SpendModeView } from "@/components/stats/SpendModeView";
import { StatsOverview } from "@/components/stats/StatsOverview";
import { NightScreen } from "@/components/ui/NightScreen";
import { SelectField } from "@/components/transactions/SelectField";
import { Skeleton } from "@/components/ui/Skeleton";
import { useStats, type StatsMode, type StatsPeriod } from "@/lib/stats/useStats";
import { useMessages } from "@/lib/i18n/useMessages";

export function StatsView() {
  const m = useMessages();
  const t = m.stats;
  const s = useStats();

  const loading = s.status === "loading" && !s.data;
  const errored = s.status === "error";
  const periodLabel = t.periods[s.period];

  const modeOptions = (["apercu", "expense", "income", "patrimoine"] as const).map(
    (v) => ({ value: v, label: t.modes[v] }),
  );
  const periodOptions = (["day", "week", "month", "year"] as const).map((v) => ({
    value: v,
    label: t.periods[v],
  }));
  const accountOptions = [
    { value: "__all__", label: t.allAccounts },
    ...s.accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <NightScreen
      title={t.title}
      right={
        <Link
          href="/transactions/nouvelle"
          aria-label={t.newTransaction}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10 text-ink-on-surface"
        >
          <PlusIcon width={18} height={18} />
        </Link>
      }
      contentClassName="p-4 gap-3"
    >
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[120px] flex-1">
          <SelectField
            ariaLabel={t.modes.apercu}
            value={s.mode}
            placeholder={t.modes.apercu}
            options={modeOptions}
            onSelect={(v) => s.setMode(v as StatsMode)}
          />
        </div>
        <div className="min-w-[120px] flex-1">
          <SelectField
            ariaLabel={periodLabel}
            value={s.period}
            placeholder={periodLabel}
            options={periodOptions}
            onSelect={(v) => s.setPeriod(v as StatsPeriod)}
          />
        </div>
        <div className="min-w-[140px] flex-1">
          <SelectField
            ariaLabel={t.allAccounts}
            value={s.accountId ?? "__all__"}
            placeholder={t.allAccounts}
            options={accountOptions}
            onSelect={(v) => s.setAccountId(v === "__all__" ? null : v)}
          />
        </div>
      </div>

      {errored ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="t-body text-text-secondary">{t.loadError}</p>
          <button
            type="button"
            onClick={s.reload}
            className="rounded-[var(--radius-pill)] border border-surface-rail px-4 py-2 text-[13px] font-semibold"
          >
            {m.common.retry}
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-72 w-full" rounded="rounded-[20px]" />
          <Skeleton className="h-64 w-full" rounded="rounded-[20px]" />
        </div>
      ) : s.data ? (
        <>
          {s.mode === "apercu" ? (
            <>
              <Section title={t.sections.overview}>
                <StatsOverview
                  data={s.data.overview}
                  periodLabel={periodLabel}
                  loading={false}
                />
              </Section>
              {s.data.expenseBreakdown ? (
                <Section title={t.sections.expenseBreakdown}>
                  <BreakdownSection
                    kind="expense"
                    payload={s.data.expenseBreakdown}
                    by={s.expenseBy}
                    onChangeBy={s.setExpenseBy}
                  />
                </Section>
              ) : null}
              {s.data.incomeBreakdown ? (
                <Section title={t.sections.incomeBreakdown}>
                  <BreakdownSection
                    kind="income"
                    payload={s.data.incomeBreakdown}
                    by={s.incomeBy}
                    onChangeBy={s.setIncomeBy}
                    passiveShare={s.data.overview.passiveIncome}
                  />
                </Section>
              ) : null}
              {s.data.score ? (
                <Section title={t.sections.score}>
                  <ScoreCard score={s.data.score} />
                </Section>
              ) : null}
            </>
          ) : null}

          {s.mode === "expense" && s.data.expenseMode ? (
            <SpendModeView
              kind="expense"
              payload={s.data.expenseMode}
              periodLabel={periodLabel}
            />
          ) : null}
          {s.mode === "income" && s.data.incomeMode ? (
            <SpendModeView
              kind="income"
              payload={s.data.incomeMode}
              periodLabel={periodLabel}
            />
          ) : null}
          {s.mode === "patrimoine" && s.data.patrimoine ? (
            <PatrimoineView payload={s.data.patrimoine} />
          ) : null}
        </>
      ) : null}
    </NightScreen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="t-label px-1 text-text-tertiary">{title}</h2>
      {children}
    </section>
  );
}
