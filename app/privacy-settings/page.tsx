"use client";

import Link from "next/link";

import { useConsent } from "@/components/privacy/ConsentProvider";
import { ConsentToggle } from "@/components/privacy/ConsentToggle";
import { NightScreen } from "@/components/ui/NightScreen";
import { useToast } from "@/components/ui/Toast";
import type { ConsentCategory } from "@/lib/privacy/consent";

/**
 * SCREEN-21 — Paramètres de confidentialité. Reconciled onto Swiftly's grammar
 * for Lot 6 (artboard `Swiftly - Lot 8 Privacy.dc.html`).
 *
 * What changed and why, from the artboard:
 *  - the title is not shouted. "ESSENTIAL COOKIES (REQUIS)" reads more slowly
 *    and shouts; the name in 16/700 plus a "Requis" badge says the same thing in
 *    the voice of every other screen;
 *  - the technical detail ("Collecteur · Durée · Impact") was three list lines
 *    adding 60 px to every card. As bullets under a rule the information stays
 *    available without turning a setting into a spec sheet;
 *  - emoji become 1.7 px stroke glyphs — 🔒 ⚙️ 📊 render differently on two
 *    phones and have no weight. Here the badge carries the meaning, so the
 *    emoji simply go;
 *  - the active switch is blue, not green (see `ConsentToggle`);
 *  - still no "Enregistrer": each switch writes at once and the toast confirms.
 *    A save button at the foot would suggest you can leave without anything
 *    applying — on consent, that ambiguity is a legal risk.
 */

interface CardConfig {
  key: ConsentCategory;
  title: string;
  description: string;
  details: string[];
  state: "on-locked" | "toggle" | "coming-soon";
  badge?: string;
}

const CARDS: CardConfig[] = [
  {
    key: "essential",
    title: "Essentiels",
    description:
      "Session, sécurité, authentification. Sans eux, l'app ne fonctionne pas.",
    details: ["access_token · 15 min", "refresh_token · 30 j"],
    state: "on-locked",
    badge: "Requis",
  },
  {
    key: "analytics",
    title: "Google Analytics",
    description:
      "Nous aide à comprendre comment tu utilises l'app : pages visitées, clics, temps passé.",
    details: ["Google · 12 mois", "Sans cela : statistiques anonymes uniquement"],
    state: "toggle",
  },
  {
    key: "marketing",
    title: "Emails marketing",
    description:
      "Newsletters et nouveautés, 1 à 2 fois par semaine.",
    details: ["SendGrid · désabonnement en 1 clic"],
    state: "toggle",
  },
  {
    key: "location",
    title: "Localisation",
    description: "Services géolocalisés quand ils seront disponibles.",
    details: ["Recommandations personnalisées par zone"],
    state: "coming-soon",
    badge: "Bientôt",
  },
];

export default function PrivacySettingsPage() {
  const { categories, ready, save } = useConsent();
  const toast = useToast();

  function toggle(key: ConsentCategory, next: boolean) {
    save({ ...categories, [key]: next }, "update");
    toast.show("Paramètres sauvegardés");
  }

  return (
    <NightScreen title="Confidentialité">
      <div className="flex flex-col gap-4 p-4 pb-10">
        <p className="t-body text-text-secondary">
          Personnalise ton expérience en gérant quelles données tu acceptes de
          partager.
        </p>

        {CARDS.map((card) => {
          const checked =
            card.state === "coming-soon" ? false : categories[card.key];
          const disabled = card.state !== "toggle" || !ready;
          return (
            <section
              key={card.key}
              className={`flex flex-col gap-2 rounded-[var(--radius-card)] bg-surface-card p-[var(--pad-card)] ${
                // "Bientôt" — 60 % opacity, so it reads as not-yours-yet rather
                // than as a control that refuses to respond.
                card.state === "coming-soon" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex flex-wrap items-center gap-2 text-[16px] font-bold">
                  {card.title}
                  {card.badge ? (
                    <span
                      className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] ${
                        card.state === "coming-soon"
                          ? "bg-[color-mix(in_srgb,var(--semantic-warn)_20%,transparent)] text-semantic-warn-text"
                          : "bg-surface-field text-text-secondary"
                      }`}
                    >
                      {card.badge}
                    </span>
                  ) : null}
                </h2>
                <ConsentToggle
                  checked={checked}
                  disabled={disabled}
                  label={`${card.title} — ${checked ? "activé" : "désactivé"}`}
                  onChange={(next) => toggle(card.key, next)}
                />
              </div>

              <p className="t-body text-text-secondary">{card.description}</p>

              <ul className="mt-1 flex flex-col gap-1 border-t border-surface-hairline pt-2 t-secondary text-text-tertiary">
                {card.details.map((d) => (
                  <li key={d}>· {d}</li>
                ))}
              </ul>
            </section>
          );
        })}

        <Link
          href="/privacy"
          className="text-center t-body font-semibold text-brand-accent underline underline-offset-2"
        >
          Politique de confidentialité
        </Link>
      </div>

      {toast.node}
    </NightScreen>
  );
}
