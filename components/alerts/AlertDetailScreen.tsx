"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { NightScreen } from "@/components/ui/NightScreen";
import { Skeleton } from "@/components/ui/Skeleton";
import { linkHref, type AlertItem, type AlertTone } from "@/lib/alerts/model";
import { fetchAlert, markAlertRead } from "@/lib/alerts/useAlerts";
import { formatClock, formatLongDate } from "@/lib/format/date";
import { interpolate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

/**
 * SCREEN-18 § 8 — the detail of one alert. Read-only by design: "Pas de
 * formulaire d'édition — les alertes/notifications sont read-only", so the only
 * affordance is the contextual action ("Voir le budget Shopping") and the line
 * that says outright there is nothing to edit.
 *
 * The facts come from the snapshot stored with the alert, not from a live join:
 * an alert is a record of a moment, so it keeps the limit that was in force when
 * it fired even if the budget has been edited since.
 */

const TONE_TEXT: Record<AlertTone, string> = {
  danger: "text-semantic-out",
  warn: "text-semantic-warn-text",
  success: "text-semantic-in",
  neutral: "text-text-secondary",
};

export function AlertDetailScreen({ id }: { id: string }) {
  const m = useMessages();
  const t = m.alerts;
  const locale = useLocale() as Locale;

  const [alert, setAlert] = useState<AlertItem | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let alive = true;
    fetchAlert(id)
      .then((a) => {
        if (!alive) return;
        setAlert(a);
        setStatus("ready");
        // Opening the detail IS the act of reading it (§ 12's open question,
        // answered the way an inbox normally behaves). Best-effort: a failure
        // here must not break the screen the user came to read.
        if (!a.read) void markAlertRead(id).catch(() => {});
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (status === "loading") {
    return (
      <NightScreen title={t.detailTitle}>
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-24 w-full" rounded="rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 w-full" rounded="rounded-[var(--radius-card)]" />
        </div>
      </NightScreen>
    );
  }

  if (status === "error" || !alert) {
    return (
      <NightScreen title={t.detailTitle} errorTone>
        <p className="p-8 text-center t-body text-text-secondary">{t.loadError}</p>
      </NightScreen>
    );
  }

  const kindLabel = alert.kind === "alert" ? t.kindAlert : t.kindScheduled;
  const href = linkHref(alert);
  const actionLabel =
    alert.link_type === "budget"
      ? t.seeBudget
      : alert.link_type === "project"
        ? t.seeProject
        : alert.link_type === "transaction"
          ? t.seeTransaction
          : t.seeReport;
  const when = `${formatLongDate(alert.created_at.slice(0, 10), locale)}, ${formatClock(alert.created_at, locale)}`;

  return (
    <NightScreen title={kindLabel}>
      <div className="flex flex-col gap-4 p-4 pb-10">
        {/* The headline: badge, message, and the value big enough to be the
            answer to "how bad is it". */}
        <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface-card p-[var(--pad-card)]">
          <span className="t-label text-text-tertiary">
            {kindLabel}
            {alert.link_type ? ` · ${alert.link_type}` : ""}
          </span>
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">{alert.title}</h2>
          {alert.value ? (
            <span className={`text-[28px] font-bold tabular ${TONE_TEXT[alert.tone]}`}>
              {alert.value}
            </span>
          ) : null}
        </section>

        {alert.facts.length > 0 ? (
          <section className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
            {alert.facts.map((f, i) => (
              <div
                key={i}
                className="flex min-h-[var(--row-setting)] items-center justify-between gap-3 border-b border-surface-hairline last:border-b-0"
              >
                <span className="t-body text-text-secondary">{f.label}</span>
                <span className="text-[16px] font-semibold tabular">{f.value}</span>
              </div>
            ))}
            <div className="flex min-h-[var(--row-setting)] items-center justify-between gap-3 border-t border-surface-hairline">
              <span className="t-body text-text-secondary">{t.triggeredAt}</span>
              <span className="text-[16px] font-semibold">{when}</span>
            </div>
          </section>
        ) : null}

        {alert.body ? (
          <section className="flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface-card p-[var(--pad-card)]">
            <h3 className="t-section-title">{t.whatHappened}</h3>
            <p className="t-body text-text-secondary">{alert.body}</p>
            <p className="t-secondary text-text-tertiary">
              {interpolate(t.pushNote, { when })}
            </p>
          </section>
        ) : null}

        {href ? (
          <Link
            href={href}
            className="flex h-[var(--size-primary-button)] w-full items-center justify-center rounded-[var(--radius-pill)] bg-action-primary text-[17px] font-semibold text-action-on-primary"
          >
            {actionLabel}
          </Link>
        ) : null}

        <p className="px-2 text-center t-secondary text-text-tertiary">{t.readOnly}</p>
      </div>
    </NightScreen>
  );
}
