"use client";

import { useConsent } from "@/components/privacy/ConsentProvider";

/**
 * SCREEN-20 § 1 — the optional-data list, carrying the reader's *actual* choice.
 *
 * The artboard: "L'état du consentement est dans le texte … Une politique qui
 * affiche l'état courant se lit comme un document personnel, pas comme un
 * contrat type." That is why this is a client component inside an otherwise
 * static page: the three states (Accepté / Refusé / Bientôt) are read from the
 * live consent, not written into the prose.
 */
const ROWS = [
  {
    key: "analytics" as const,
    label: "Google Analytics",
    detail: "Statistiques d'usage",
  },
  {
    key: "marketing" as const,
    label: "Emails marketing",
    detail: "Newsletters et nouveautés",
  },
  {
    key: null,
    label: "Localisation",
    detail: "Recommandations locales",
  },
];

export function OptionalDataList() {
  const { categories, ready } = useConsent();

  return (
    <ul className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
      {ROWS.map((row) => {
        const soon = row.key === null;
        const accepted = !soon && ready && categories[row.key];
        return (
          <li
            key={row.label}
            className="flex min-h-[var(--row-setting)] items-center justify-between gap-3 border-b border-surface-hairline py-2 last:border-b-0"
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-[16px] font-semibold">{row.label}</span>
              <span className="t-secondary text-text-tertiary">{row.detail}</span>
            </span>
            <span
              className={`flex-none rounded-[var(--radius-pill)] px-2.5 py-1 text-[13px] font-bold ${
                soon
                  ? "bg-[color-mix(in_srgb,var(--semantic-warn)_20%,transparent)] text-semantic-warn-text"
                  : accepted
                    ? "bg-surface-field text-brand-accent"
                    : "bg-surface-field text-text-secondary"
              }`}
            >
              {soon ? "Bientôt" : accepted ? "Accepté" : "Refusé"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
