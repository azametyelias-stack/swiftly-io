"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckIcon, ChevronLeftIcon } from "@/components/nav/icons";
import { ScoreGauge } from "@/components/stats/ScoreGauge";
import { StatBar } from "@/components/stats/StatBar";
import { NightScreen } from "@/components/ui/NightScreen";
import { SelectField } from "@/components/transactions/SelectField";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { reportPeriodLabel } from "@/lib/format/date";
import { interpolate, type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";
import { useReport } from "@/lib/stats/useReport";
import type { CriterionKey, ReportPayload } from "@/lib/stats/model";

export function ReportView() {
  const m = useMessages();
  const r = m.report;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { periodKey, setPeriodKey, data, status } = useReport();

  const loading = status === "loading" && !data;
  const errored = status === "error";
  const report = data?.report ?? null;
  const currentKey = report?.periodKey ?? periodKey ?? data?.periods[0]?.key ?? null;
  const idx = currentKey
    ? (data?.periods.findIndex((p) => p.key === currentKey) ?? -1)
    : -1;
  const periods = data?.periods ?? [];

  const title = currentKey
    ? `${reportPeriodLabel(currentKey, locale)}`
    : r.title;

  return (
    <NightScreen
      title={r.title}
      belowHeader={
        report ? (
          <div className="flex flex-col gap-3">
            <span className="text-[26px] font-bold leading-[1.1] tracking-[-0.028em]">
              {title}
            </span>
            <div className="flex gap-2">
              <div className="flex-1">
                <SelectField
                  ariaLabel={r.monthly}
                  value={currentKey}
                  placeholder={r.monthly}
                  options={periods.map((p) => ({
                    value: p.key,
                    label: reportPeriodLabel(p.key, locale),
                  }))}
                  onSelect={setPeriodKey}
                />
              </div>
              <NavArrow
                dir="prev"
                disabled={idx < 0 || idx >= periods.length - 1}
                onClick={() => setPeriodKey(periods[idx + 1]?.key ?? null)}
              />
              <NavArrow
                dir="next"
                disabled={idx <= 0}
                onClick={() => setPeriodKey(periods[idx - 1]?.key ?? null)}
              />
            </div>
          </div>
        ) : undefined
      }
      contentClassName="p-4 gap-3"
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-48 w-full" rounded="rounded-[20px]" />
          <Skeleton className="h-40 w-full" rounded="rounded-[20px]" />
        </div>
      ) : errored ? (
        <Centered
          title={r.loadError}
          action={{ label: m.common.retry, onClick: () => setPeriodKey(periodKey) }}
        />
      ) : !report ? (
        <EmptyReport />
      ) : (
        <ReportBody report={report} />
      )}
    </NightScreen>
  );

  function EmptyReport() {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-16 text-center">
        <h1 className="text-[24px] font-semibold tracking-[-0.024em]">
          {r.emptyTitle}
        </h1>
        <p className="max-w-[300px] t-body text-text-secondary">{r.emptyBody}</p>
        <button
          type="button"
          onClick={() => router.push("/statistiques")}
          className="mt-2 flex h-[52px] items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-surface-rail bg-surface-card px-5 text-[15px] font-semibold"
        >
          <ChevronLeftIcon width={12} height={12} />
          {r.backToStats}
        </button>
      </div>
    );
  }
}

function ReportBody({ report }: { report: ReportPayload }) {
  const m = useMessages();
  const r = m.report;
  const locale = useLocale() as Locale;
  const prevLabel = reportPeriodLabel(
    previousLabelKey(report.periodKey),
    locale,
  );

  const o = report.overview;
  const netPositive = o.net >= 0;

  return (
    <>
      {/* 1 — Vue d'ensemble */}
      <SectionLabel>{r.sections.overview}</SectionLabel>
      <Card>
        <OverviewRow
          label={r.overview.totalIncome}
          amount={o.income}
          tone="in"
          variation={o.incomeVariation}
          chips={[
            { label: r.overview.active, value: o.activeIncome, tone: "in" },
            { label: r.overview.passive, value: o.passiveIncome, tone: "accent" },
          ]}
        />
        <div className="border-t border-surface-hairline pt-4">
          <OverviewRow
            label={r.overview.totalExpenses}
            amount={o.expenses}
            tone="out"
            variation={o.expenseVariation}
            invertVariation
            chips={[
              {
                label: r.overview.investment,
                value: o.investmentExpense,
                tone: "accent",
              },
              {
                label: r.overview.consumption,
                value: o.consumptionExpense,
                tone: "muted",
              },
            ]}
          />
        </div>
      </Card>
      <Card className="flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] text-text-secondary">{r.overview.net}</span>
          <span
            className={`text-[26px] font-bold tabular tracking-[-0.026em] ${netPositive ? "text-semantic-in" : "text-semantic-out"}`}
          >
            {formatMoney(Math.abs(o.net), {
              currency: "XOF",
              sign: netPositive ? "in" : "out",
            })}
          </span>
        </div>
        <span
          className={`flex-none rounded-full px-3 py-1.5 text-[13px] font-semibold ${netPositive ? "bg-semantic-in-bg text-semantic-in" : "bg-semantic-out-bg text-semantic-out"}`}
        >
          {netPositive ? r.overview.positiveMonth : r.overview.negativeMonth}
        </span>
      </Card>

      {/* 2 — Score */}
      <SectionLabel>{r.sections.score}</SectionLabel>
      <Card className="flex-row items-center gap-4">
        <ScoreGauge score={report.score.value} size={110} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[20px] font-bold tracking-[-0.018em] text-semantic-in">
            {m.stats.score.tiers[report.score.tier as keyof typeof m.stats.score.tiers]}
          </span>
          <span className="text-[13px] font-semibold tabular text-text-secondary">
            {scoreDeltaLabel(report.score.delta, prevLabel, r)}
          </span>
          <Link
            href="/aides"
            className="text-[14px] font-semibold text-brand-accent"
          >
            {r.score.seeHelp}
          </Link>
        </div>
      </Card>

      {/* 3 — Analyse des critères */}
      <SectionLabel>{r.sections.criteria}</SectionLabel>
      {report.criteria.map((c) => (
        <Card key={c.key} className="gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`size-10 flex-none rounded-[12px] ${criterionTone(c.key)}`}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="t-body font-semibold">
                {m.stats.score.criteria[c.key]}
              </span>
              <span className="text-[12px] text-text-tertiary">
                {interpolate(m.stats.score.weight, { n: Math.round(c.weight * 100) })}
              </span>
            </div>
            <div className="flex flex-none flex-col items-end">
              <span className="text-[20px] font-bold tabular tracking-[-0.018em]">
                {c.key === "diversification" ? c.value : `${c.value} %`}
              </span>
              <span
                className={`text-[12px] font-semibold tabular ${deltaTone(c.delta)}`}
              >
                {deltaLabel(c.delta, m.report.criteria)}
              </span>
            </div>
          </div>
          <StatBar value={c.normalized} />
          <span className="t-secondary text-text-secondary">
            {m.report.criteria.status[c.key][c.band]}
          </span>
        </Card>
      ))}

      {/* 4 — Projection */}
      <SectionLabel>{r.sections.projection}</SectionLabel>
      <Card className="gap-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[28px] font-bold tabular tracking-[-0.028em] text-semantic-in">
            {Math.round(report.projection.percent)} %
          </span>
          <span className="text-[13px] text-text-secondary">
            {r.projection.percentDone}
          </span>
        </div>
        <StatBar value={report.projection.percent} height={10} gradient />
        {report.projection.percent >= 100 ? (
          <span className="t-body font-semibold text-semantic-in">
            {r.projection.reached}
          </span>
        ) : report.projection.monthsToIndependence ? (
          <div className="flex flex-col gap-1">
            <span className="t-body font-semibold">
              {interpolate(r.projection.atThisRate, {
                n: report.projection.monthsToIndependence,
              })}
            </span>
            {report.projection.estimatedDate ? (
              <span className="text-[14px] text-text-secondary">
                {interpolate(r.projection.forecast, {
                  date: reportPeriodLabel(report.projection.estimatedDate, locale),
                })}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="t-secondary text-text-secondary">
            {r.projection.insufficient}
          </span>
        )}
        <span className="t-secondary text-text-tertiary">
          {r.projection.caveat}
        </span>
      </Card>

      {/* 5 — Points forts */}
      <SectionLabel>{r.sections.strengths}</SectionLabel>
      <Card className="gap-3">
        {report.strengths.length === 0 ? (
          <span className="t-secondary text-text-secondary">
            {r.strengths.none}
          </span>
        ) : (
          report.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex-none text-semantic-in">
                <CheckIcon width={18} height={18} />
              </span>
              <span className="text-[14px] leading-[1.45]">
                {interpolate(
                  r.strengths[s.key as keyof typeof r.strengths] ?? "{n}",
                  { n: Math.abs(Math.round(s.magnitude)) },
                )}
              </span>
            </div>
          ))
        )}
      </Card>

      {/* 6 — Priorité */}
      <SectionLabel>{r.sections.priority}</SectionLabel>
      <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-brand-deep p-4 text-ink-on-surface">
        <span className="text-[17px] font-semibold leading-[1.3] tracking-[-0.012em]">
          {r.priority[report.priorityCriterion].problem}
        </span>
        <span className="text-[14px] leading-[1.5] text-ink-on-surface/70">
          {r.priority[report.priorityCriterion].context}
        </span>
        <div className="h-px bg-white/15" />
        <div className="flex flex-col gap-1">
          <span className="t-label text-ink-on-surface/50">
            {r.priority.recommendedAction}
          </span>
          <span className="text-[14px] leading-[1.5]">
            {r.priority[report.priorityCriterion].action}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[12px] bg-ink-in/15 p-3">
          <span className="text-[13px] font-semibold text-ink-in">
            {r.priority.estimatedImpact}
          </span>
          <span className="text-[13px] leading-[1.45] text-ink-on-surface/85">
            {r.priority[report.priorityCriterion].impact}
          </span>
        </div>
      </div>

      {/* 10 — Recommandations */}
      <SectionLabel>{r.sections.advice}</SectionLabel>
      <Card>
        {report.advice.map((a, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 py-3 ${i < report.advice.length - 1 ? "border-b border-surface-hairline" : ""}`}
          >
            <span
              className={`grid size-[22px] flex-none place-items-center rounded-full text-[12px] font-bold text-ink-on-surface ${["bg-brand-deep", "bg-brand-accent", "bg-brand-deep/70"][i] ?? "bg-brand-deep"}`}
            >
              {i + 1}
            </span>
            <span className="text-[14px] leading-[1.45]">{adviceText(a, r.advice)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function previousLabelKey(key: string): string {
  if (/^\d{4}$/.test(key)) return String(Number(key) - 1);
  const [y, mo] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y!, mo! - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function scoreDeltaLabel(
  delta: number | null,
  prevLabel: string,
  r: ReturnType<typeof useMessages>["report"],
): string {
  if (delta === null) return "";
  if (delta > 0) return interpolate(r.score.pointsUp, { n: delta, period: prevLabel });
  if (delta < 0)
    return interpolate(r.score.pointsDown, { n: Math.abs(delta), period: prevLabel });
  return interpolate(r.score.pointsFlat, { period: prevLabel });
}

function deltaTone(delta: number | null): string {
  if (delta === null || delta === 0) return "text-text-tertiary";
  return delta > 0 ? "text-semantic-in" : "text-semantic-out";
}

function deltaLabel(
  delta: number | null,
  c: ReturnType<typeof useMessages>["report"]["criteria"],
): string {
  if (delta === null) return "";
  if (delta === 0) return c.stable;
  return delta > 0
    ? interpolate(c.up, { n: delta })
    : interpolate(c.down, { n: Math.abs(delta) });
}

function adviceText(
  a: { key: string; criterion?: CriterionKey },
  advice: ReturnType<typeof useMessages>["report"]["advice"],
): string {
  if (a.key === "priority" && a.criterion) return advice.priority[a.criterion];
  return advice[a.key as keyof typeof advice] as string;
}

function criterionTone(key: CriterionKey): string {
  return {
    liberte: "bg-brand-deep",
    investissement: "bg-brand-accent",
    epargne: "bg-brand-accent/70",
    diversification: "bg-brand-deep/70",
  }[key];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="t-label px-1 text-text-tertiary">{children}</h2>;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-4 rounded-[var(--radius-card)] bg-surface-card p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function OverviewRow({
  label,
  amount,
  tone,
  variation,
  invertVariation = false,
  chips,
}: {
  label: string;
  amount: number;
  tone: "in" | "out";
  variation: number | null;
  invertVariation?: boolean;
  chips: { label: string; value: number; tone: "in" | "accent" | "muted" }[];
}) {
  const varGood =
    variation === null ? false : invertVariation ? variation <= 0 : variation >= 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] text-text-secondary">{label}</span>
        {variation !== null ? (
          <span
            className={`text-[13px] font-semibold tabular ${varGood ? "text-semantic-in" : "text-semantic-out"}`}
          >
            {variation >= 0 ? "↑" : "↓"} {Math.abs(variation).toFixed(1)} %
          </span>
        ) : null}
      </div>
      <span
        className={`text-[28px] font-bold tabular tracking-[-0.028em] ${tone === "in" ? "text-semantic-in" : "text-semantic-out"}`}
      >
        {formatBalance(amount, "XOF")}
      </span>
      <div className="mt-1.5 flex gap-2">
        {chips.map((ch, i) => (
          <span
            key={i}
            className={`flex-1 rounded-[10px] px-2.5 py-2 text-[11px] font-semibold ${
              ch.tone === "in"
                ? "bg-semantic-in-bg/60 text-semantic-in"
                : ch.tone === "accent"
                  ? "bg-brand-accent/[0.07] text-brand-accent"
                  : "bg-surface-field text-text-secondary"
            }`}
          >
            {ch.label} · {formatMoney(ch.value, { currency: "XOF", sign: "none" })}
          </span>
        ))}
      </div>
    </div>
  );
}

function NavArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir}
      className="grid size-[52px] flex-none place-items-center rounded-[var(--radius-icon)] border border-white/25 bg-white/10 text-ink-on-surface disabled:opacity-30"
    >
      <ChevronLeftIcon
        width={16}
        height={16}
        className={dir === "next" ? "rotate-180" : ""}
      />
    </button>
  );
}

function Centered({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="t-body text-text-secondary">{title}</p>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-[var(--radius-pill)] border border-surface-rail px-4 py-2 text-[13px] font-semibold"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
