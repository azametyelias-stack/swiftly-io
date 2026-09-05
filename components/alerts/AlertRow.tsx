"use client";

import { AlertTriangleIcon, BellIcon, InfoIcon } from "@/components/nav/icons";
import { formatClock } from "@/lib/format/date";
import type { AlertItem, AlertTone } from "@/lib/alerts/model";
import type { Locale } from "@/lib/i18n";

/**
 * One row of the SCREEN-18 inbox (artboard "Le message devient le titre"):
 * the kind as a badge above, the message in 16/700, the time and context in
 * 13 grey below, and the value chip at the right — three levels inside a
 * constant card height, so the box is scanned with the thumb rather than read.
 */

/** § 6 plus the artboard's fourth tone. `neutral` is why a "Rapport prêt" isn't green. */
const TONE_CLASS: Record<AlertTone, string> = {
  danger: "bg-semantic-out-bg text-semantic-out",
  warn: "bg-[color-mix(in_srgb,var(--semantic-warn)_18%,transparent)] text-semantic-warn-text",
  success: "bg-semantic-in-bg text-semantic-in",
  neutral: "bg-surface-hairline text-text-secondary",
};

const TONE_ICON: Record<AlertTone, typeof InfoIcon> = {
  danger: AlertTriangleIcon,
  warn: AlertTriangleIcon,
  success: BellIcon,
  neutral: InfoIcon,
};

export function AlertRow({
  item,
  locale,
  kindLabel,
  onOpen,
}: {
  item: AlertItem;
  locale: Locale;
  kindLabel: string;
  onOpen: () => void;
}) {
  const Icon = TONE_ICON[item.tone];
  const context = [formatClock(item.created_at, locale), item.body]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[var(--radius-block)] bg-surface-card p-3 text-left"
    >
      <span
        aria-hidden="true"
        className={`grid size-10 flex-none place-items-center rounded-[var(--radius-icon)] ${TONE_CLASS[item.tone]}`}
      >
        <Icon width={18} height={18} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="t-label text-text-tertiary">{kindLabel}</span>
          {/* Unread is a dot, not a bold row: the artboard keeps the card
              height constant, so the state cannot be carried by the type. */}
          {!item.read ? (
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-accent" />
          ) : null}
        </span>
        <span className="truncate text-[16px] font-bold tracking-[-0.01em]">
          {item.title}
        </span>
        <span className="truncate t-secondary text-text-tertiary">{context}</span>
      </span>

      {item.value ? (
        <span
          className={`flex-none rounded-[var(--radius-pill)] px-2.5 py-1 text-[13px] font-bold tabular ${TONE_CLASS[item.tone]}`}
        >
          {item.value}
        </span>
      ) : null}
    </button>
  );
}
