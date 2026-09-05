"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { BalanceCurve } from "@/components/dashboard/BalanceCurve";
import { MoneyDropdown } from "@/components/dashboard/MoneyDropdown";
import { Odometer } from "@/components/dashboard/Odometer";
import { RecentHistory } from "@/components/dashboard/RecentHistory";
import { RotatingBanner } from "@/components/dashboard/RotatingBanner";
import { TemplatesCarousel } from "@/components/dashboard/TemplatesCarousel";
import { useNavShell } from "@/components/nav/useNavShell";
import {
  BellIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  MenuIcon,
  PlusIcon,
} from "@/components/nav/icons";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBalance, formatMoney } from "@/lib/format/money";
import type { CurrencyCode } from "@/lib/format/money";
import { periodLabel, previousPeriodLabel, PERIODS, type Period } from "@/lib/dashboard/period";
import { useDashboard } from "@/lib/dashboard/useDashboard";
import { interpolate } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

const HIDE_KEY = "sf-balance-hidden";

/**
 * First / middle / last bucket dates for the curve's x-axis, formatted to
 * match the granularity actually being shown — "jour" buckets (week/month
 * periods) as a day + short month, "mois" buckets (year period) as the month
 * name alone. The label vocabulary must always agree with the period picker
 * above the graph (semaine → jours, année → mois, jamais un axe horaire figé).
 */
function periodXLabels(
  curve: { date: string }[] | null,
  locale: string,
  granularity: "day" | "month",
): string[] {
  if (!curve || curve.length === 0) return [];
  const fmt = new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    granularity === "month" ? { month: "short" } : { day: "numeric", month: "short" },
  );
  const at = (i: number) => fmt.format(new Date(`${curve[i]!.date}T00:00:00Z`));
  if (curve.length <= 2) return curve.map((_, i) => at(i));
  return [at(0), at(Math.floor((curve.length - 1) / 2)), at(curve.length - 1)];
}

export function DashboardView() {
  const m = useMessages();
  const locale = useLocale();
  const { openMenu } = useNavShell();
  const { name, accounts, accountId, setAccountId, period, setPeriod, data, status, refresh } =
    useDashboard();

  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleHidden = () => {
    setHidden((v) => {
      const next = !v;
      try {
        localStorage.setItem(HIDE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const currency = (data?.account.currency ?? "XOF") as CurrencyCode;
  const loading = status === "loading" && !data;
  const errored = status === "error";
  const replayKey = `${data?.account.id ?? "none"}:${period}`;
  const hourAxis = data?.granularity === "hour";
  const xGranularity = data?.granularity === "month" ? "month" : "day";

  const greeting = name ? interpolate(m.dashboard.greeting, { name }) : m.dashboard.balanceLabel;

  return (
    // A single natural page scroll (no nested scroll containers). The
    // "+ Nouvelle transaction" button below is `sticky` — it scrolls with the
    // page like everything above it, then freezes at the top the moment it
    // gets there, and the white panel keeps scrolling underneath it.
    <div className="relative min-h-[100dvh] bg-surface-page">
      {/* Night hero — natural height, holds the header/balance/curve/summary. */}
      <div className="relative overflow-hidden text-ink-on-surface">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,10,60,0.55) 0%, rgba(6,10,60,0.28) 34%, rgba(6,10,60,0.72) 100%)",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex h-14 items-center justify-between px-2" style={{ marginTop: "env(safe-area-inset-top)" }}>
            <button
              type="button"
              onClick={openMenu}
              aria-label={m.common.menu}
              className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
            >
              <MenuIcon width={18} height={18} />
            </button>
            <span className="font-logo text-[19px] tracking-[-0.01em]">Swiftly.io</span>
            <Link
              href="/alertes"
              aria-label={m.common.notifications}
              className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
            >
              <BellIcon width={18} height={18} />
            </Link>
          </div>

          <div className="flex flex-col gap-4 px-4 pt-1">
            {/* Row 1 (design 04-dashboard.png): salutation + sélecteur de compte */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] font-semibold text-ink-on-surface/85">{greeting}</p>
              {accounts.length > 1 ? (
                <MoneyDropdown
                  ariaLabel="Compte"
                  value={accountId ?? primaryId(accounts)}
                  onChange={(id) => setAccountId(id)}
                  options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                />
              ) : null}
            </div>

            {/* Row 2: solde + sélecteur de période */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ink-on-surface/60">{m.dashboard.balanceLabel}</span>
                  {errored && data ? (
                    <span className="text-[13px] text-ink-on-surface/50">· {nowTime()}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={toggleHidden}
                    aria-label={hidden ? m.dashboard.showAmount : m.dashboard.hideAmount}
                    className="grid size-6 place-items-center text-ink-on-surface/70"
                  >
                    {hidden ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
                  </button>
                </div>

                {loading ? (
                  <Skeleton className="h-[38px] w-44" rounded="rounded-[10px]" />
                ) : (
                  <Odometer value={data?.balance ?? 0} currency={currency} masked={hidden} className="t-balance" />
                )}

                <VariationLine
                  period={period}
                  variation={data?.variation ?? null}
                  currency={currency}
                  unavailable={errored}
                  unavailableLabel={m.dashboard.variationUnavailable}
                  vsTemplate={m.dashboard.variationVs}
                />
              </div>

              <MoneyDropdown
                ariaLabel="Période"
                value={period}
                onChange={(p) => setPeriod(p as Period)}
                options={PERIODS.map((p) => ({ value: p, label: periodLabel(p) }))}
              />
            </div>
          </div>

          <div className="px-4 pt-4">
            {loading ? (
              <Skeleton className="h-[196px] w-full" rounded="rounded-[16px]" />
            ) : errored ? (
              <p className="flex h-[120px] items-center justify-center text-center text-[13px] text-ink-on-surface/60">
                {m.dashboard.curve.offline}
              </p>
            ) : data?.curve && data.curve.length > 0 ? (
              <BalanceCurve
                key={replayKey}
                points={data.curve}
                currency={currency}
                hourAxis={hourAxis}
                xLabels={hourAxis ? undefined : periodXLabels(data.curve, locale, xGranularity)}
              />
            ) : (
              <div className="flex h-[120px] flex-col items-center justify-center gap-1 text-center">
                <p className="text-[15px] font-semibold">{m.dashboard.emptyState.title}</p>
                <p className="max-w-[260px] text-[13px] text-ink-on-surface/60">
                  {m.dashboard.emptyState.body}
                </p>
              </div>
            )}
          </div>

          <div className="mx-4 mt-4 flex rounded-[16px] border border-white/16 bg-white/[0.06] py-3">
            <SummaryCell label={m.dashboard.summary.start} value={data?.startBalance ?? 0} currency={currency} loading={loading} masked={hidden} />
            <Divider />
            <SummaryCell label={m.dashboard.summary.income} value={data?.income ?? 0} currency={currency} loading={loading} masked={hidden} tone="in" />
            <Divider />
            <SummaryCell label={m.dashboard.summary.expenses} value={data?.expenses ?? 0} currency={currency} loading={loading} masked={hidden} tone="out" />
            <Divider />
            <SummaryCell label={m.dashboard.summary.current} value={data?.balance ?? 0} currency={currency} loading={loading} masked={hidden} />
          </div>

          {errored ? (
            <button
              type="button"
              onClick={refresh}
              className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-white/20 bg-white/10 py-2 text-[13px] font-semibold"
            >
              {m.common.retry}
            </button>
          ) : null}
        </div>
      </div>

      {/* The button — scrolls with the page, then freezes at the top. Opaque
          background: once stuck, the panel below scrolls up underneath it. */}
      <div className="sticky top-0 z-20 bg-surface-page px-4 pb-3 pt-2">
        <Link
          href="/transactions/nouvelle"
          className="flex h-[var(--size-primary-button)] w-full items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-surface-card text-[17px] font-semibold text-text-primary shadow-[0_16px_34px_-6px_rgba(4,6,30,0.44),0_3px_8px_rgba(4,6,30,0.22)]"
        >
          <PlusIcon width={20} height={20} />
          {m.dashboard.newTransaction}
        </Link>
      </div>

      {/* White panel — flows right after the button, same page scroll. */}
      <div className="relative z-10 rounded-t-[var(--radius-content-top)] bg-surface-card px-4 pb-24 pt-4 text-text-primary">
        <div className="flex flex-col gap-3">
          <RotatingBanner items={[]} />

          <PanelSection title={m.dashboard.templates.title} action={{ label: m.dashboard.templates.seeAll, href: "/templates" }}>
            <TemplatesCarousel currency={currency} />
          </PanelSection>

          <PanelSection title={m.dashboard.accounts.title}>
            {accounts.length === 0 ? (
              <Skeleton className="h-12 w-full" rounded="rounded-[14px]" />
            ) : (
              <ul className="flex flex-col">
                {accounts.map((a) => (
                  <li key={a.id}>
                    <ListRow
                      icon={<span className="text-[13px] font-bold">{a.name.slice(0, 1)}</span>}
                      title={a.name}
                      value={hidden ? formatMoney(0, { currency: a.currency as CurrencyCode, masked: true }) : formatBalance(a.balance, a.currency as CurrencyCode)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/comptes" className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-accent">
              <PlusIcon width={14} height={14} /> {m.dashboard.accounts.add}
            </Link>
          </PanelSection>

          <PanelSection
            title={m.dashboard.history.title}
            action={{ label: m.dashboard.history.seeMore, href: "/historiques" }}
            trailing={
              <Link href="/historiques" aria-label="Filtrer" className="grid size-8 place-items-center text-text-tertiary">
                <FilterIcon width={18} height={18} />
              </Link>
            }
          >
            <RecentHistory accountId={data?.account.id ?? accountId} />
          </PanelSection>
        </div>
      </div>
    </div>
  );
}

function nowTime(): string {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function primaryId(accounts: { id: string; is_primary: boolean }[]): string {
  return (accounts.find((a) => a.is_primary) ?? accounts[0])?.id ?? "";
}

function Divider() {
  return <span className="w-px bg-white/14" />;
}

function SummaryCell({
  label,
  value,
  currency,
  loading,
  masked,
  tone,
}: {
  label: string;
  value: number;
  currency: CurrencyCode;
  loading: boolean;
  masked: boolean;
  tone?: "in" | "out";
}) {
  const color = tone === "in" ? "text-ink-in" : tone === "out" ? "text-semantic-out" : "text-ink-on-surface";
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <span className="t-label text-ink-on-surface/55">{label}</span>
      {loading ? (
        <Skeleton className="h-3.5 w-14" rounded="rounded" />
      ) : (
        <span className={`text-[14px] font-semibold tabular ${color}`}>
          {masked
            ? formatMoney(0, { currency, masked: true })
            : tone
              ? formatMoney(value, { currency, sign: tone })
              : formatBalance(value, currency)}
        </span>
      )}
    </div>
  );
}

function VariationLine({
  period,
  variation,
  currency,
  unavailable,
  unavailableLabel,
  vsTemplate,
}: {
  period: Period;
  variation: { amount: number; percent: number | null } | null;
  currency: CurrencyCode;
  unavailable: boolean;
  unavailableLabel: string;
  vsTemplate: string;
}) {
  if (unavailable || !variation) {
    return <span className="text-[13px] text-ink-on-surface/50">{unavailableLabel}</span>;
  }
  const up = variation.amount >= 0;
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      <span className={`font-semibold tabular ${up ? "text-ink-in" : "text-semantic-out"}`}>
        {formatMoney(Math.abs(variation.amount), { currency, sign: up ? "in" : "out" })}
        {variation.percent !== null ? ` · ${up ? "+" : "−"}${Math.abs(variation.percent).toFixed(2)} %` : ""}
      </span>
      <span className="text-ink-on-surface/50">{interpolate(vsTemplate, { period: previousPeriodLabel(period) })}</span>
    </div>
  );
}

function PanelSection({
  title,
  action,
  trailing,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-3">
      <div className="flex items-center justify-between">
        <h2 className="t-section-title">{title}</h2>
        <div className="flex items-center gap-1">
          {action ? (
            <Link href={action.href} className="flex items-center gap-0.5 text-[13px] font-semibold text-brand-accent">
              {action.label}
              <ChevronDownIcon width={14} height={14} className="-rotate-90" />
            </Link>
          ) : null}
          {trailing}
        </div>
      </div>
      {children}
    </section>
  );
}
