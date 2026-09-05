"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ChevronRightIcon, ExternalLinkIcon } from "@/components/nav/icons";

/**
 * The setting row and its group, from the artboard's "La rangée de paramètre"
 * system (`Lot 9 Paramètres utilisateur.dc.html`). Geometry is verbatim: rows
 * are `--row-setting` (56) tall with a 1 px *inner* rule — the rule stops at the
 * group's padding rather than reaching the card edge, which is what makes a
 * group read as one block instead of a stack of stripes. Group radius 20
 * (`--radius-card`), padding 0 16 (`--pad-card`), 13 px caps title above.
 *
 * The whole point of the file is the artboard's rule "Chevron = je pars,
 * valeur = je choisis": four variants that are never mixed, so the affordance is
 * learned once. Each variant is its own export so a caller cannot accidentally
 * build a fifth.
 */

export function SettingGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      {title ? (
        <h2 className="t-label px-1 text-text-tertiary">{title}</h2>
      ) : null}
      <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
        {children}
      </div>
    </section>
  );
}

/** Shared skeleton: fixed height, label left, slot right, inner rule but not on the last row. */
function Row({
  label,
  right,
  tone = "default",
  className = "",
}: {
  label: ReactNode;
  right: ReactNode;
  tone?: "default" | "danger";
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[var(--row-setting)] items-center justify-between gap-3 border-b border-surface-hairline last:border-b-0 ${className}`}
    >
      <span
        className={`text-[16px] font-semibold ${tone === "danger" ? "text-semantic-out" : ""}`}
      >
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-2">{right}</span>
    </div>
  );
}

const CHEVRON = <ChevronRightIcon width={14} height={14} className="text-text-quaternary" />;

/** Variant 1 — value + chevron: tap opens a picker in place, the screen stays. */
export function SettingValueRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Row
        label={label}
        right={
          <>
            <span className="text-[16px] font-normal text-text-secondary">{value}</span>
            {CHEVRON}
          </>
        }
      />
    </button>
  );
}

/** Variant 2 — chevron alone: tap leaves for another screen inside the app. */
export function SettingNavRow({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="block">
      <Row label={label} right={CHEVRON} />
    </Link>
  );
}

/**
 * Variant 3 — the oblique arrow: tap leaves Swiftly entirely. The artboard's one
 * deliberate exception in the column, justified by a real difference of
 * destination, so the reader knows before tapping.
 */
export function SettingExternalRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Row
        label={label}
        right={<ExternalLinkIcon width={14} height={14} className="text-text-quaternary" />}
      />
    </a>
  );
}

/**
 * Variant 4 — a switch. The artboard: "Le thème est un interrupteur, pas deux
 * boutons" — a binary reads without reading a word, where a two-value segment
 * would spend 140 px saying the same thing.
 */
export function SettingToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Row
      label={
        <label htmlFor={`sf-toggle-${label}`} className="cursor-pointer">
          {label}
        </label>
      }
      right={
        <button
          id={`sf-toggle-${label}`}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className="relative w-[var(--switch-w)] rounded-[var(--radius-pill)] transition-colors"
          style={{
            height: "var(--switch-h)",
            backgroundColor: checked
              ? "var(--brand-accent)"
              : "var(--surface-control-off)",
            transitionDuration: "var(--dur-toggle)",
            transitionTimingFunction: "var(--ease-standard)",
          }}
        >
          <span
            className="absolute top-1/2 block -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(10,10,12,0.3)] transition-[left]"
            style={{
              width: "var(--switch-knob)",
              height: "var(--switch-knob)",
              left: checked
                ? "calc(var(--switch-w) - var(--switch-knob) - 3px)"
                : "3px",
              transitionDuration: "var(--dur-toggle)",
              transitionTimingFunction: "var(--ease-standard)",
            }}
          />
        </button>
      }
    />
  );
}

/**
 * Variant 4b — a plain action row. Only used for the destructive one, which the
 * artboard puts in its own block, 24 px below everything else: "Un seul rouge,
 * tout en bas … la seule action irréversible de l'écran."
 */
export function SettingActionRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      <Row
        label={
          <span className="flex items-center gap-2 text-semantic-out">
            {icon}
            {label}
          </span>
        }
        right={null}
        tone="danger"
      />
    </button>
  );
}
