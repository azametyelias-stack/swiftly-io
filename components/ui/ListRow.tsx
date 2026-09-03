"use client";

import { useRef, type ReactNode } from "react";

/**
 * The one list-row piece (Lot 2 dc.html § "La ligne de liste est une seule
 * pièce, utilisée 3 fois"): 40px icon pastille (radius 12), two truncatable text
 * lines, a value on the right. Reused by Comptes, Historique, Templates and (Lot
 * 3+) everywhere else.
 */

export type RowTone = "neutral" | "in" | "out";

const PASTILLE: Record<RowTone, string> = {
  neutral: "bg-surface-field text-text-secondary",
  in: "bg-semantic-in-bg text-semantic-in",
  out: "bg-semantic-out-bg text-semantic-out",
};

const VALUE: Record<RowTone, string> = {
  neutral: "text-text-primary",
  in: "text-semantic-in",
  out: "text-semantic-out",
};

interface ListRowProps {
  icon: ReactNode;
  iconTone?: RowTone;
  title: string;
  subtitle?: ReactNode;
  value?: ReactNode;
  valueTone?: RowTone;
  /** small text under the value (e.g. "Dépense" / "Revenu") */
  valueCaption?: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  className?: string;
}

export function ListRow({
  icon,
  iconTone = "neutral",
  title,
  subtitle,
  value,
  valueTone = "neutral",
  valueCaption,
  onClick,
  onLongPress,
  className = "",
}: ListRowProps) {
  const interactive = Boolean(onClick || onLongPress);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = () => {
    if (!onLongPress) return;
    pressTimer.current = setTimeout(onLongPress, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      type={interactive ? "button" : undefined}
      onClick={onClick}
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={
        onLongPress
          ? (e) => {
              e.preventDefault();
              onLongPress();
            }
          : undefined
      }
      className={[
        "flex w-full items-center gap-3 rounded-[var(--radius-icon)] px-2 py-2 text-left",
        interactive
          ? "transition-colors active:bg-surface-field/70 motion-reduce:transition-none"
          : "",
        className,
      ].join(" ")}
    >
      <span
        className={`grid size-10 flex-none place-items-center rounded-[12px] ${PASTILLE[iconTone]}`}
      >
        {icon}
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-body truncate font-semibold text-text-primary">{title}</span>
        {subtitle ? (
          <span className="t-secondary truncate text-text-secondary">{subtitle}</span>
        ) : null}
      </span>

      {value !== undefined ? (
        <span className="flex flex-none flex-col items-end">
          <span className={`t-body font-semibold tabular ${VALUE[valueTone]}`}>{value}</span>
          {valueCaption ? (
            <span className="t-secondary text-text-tertiary">{valueCaption}</span>
          ) : null}
        </span>
      ) : null}
    </Tag>
  );
}
