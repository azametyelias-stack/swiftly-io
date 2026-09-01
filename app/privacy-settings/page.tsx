"use client";

import Link from "next/link";

import { useConsent } from "@/components/privacy/ConsentProvider";
import { ConsentToggle } from "@/components/privacy/ConsentToggle";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";
import type { ConsentCategory } from "@/lib/privacy/consent";

interface CardConfig {
  key: ConsentCategory;
  icon: string;
  title: string;
  description: string;
  details: string[];
  state: "on-locked" | "toggle" | "coming-soon";
  badge?: string;
}

const CARDS: CardConfig[] = [
  {
    key: "essential",
    icon: "✅",
    title: "Cookies essentiels (requis)",
    description:
      "Requis pour le fonctionnement de l'app (session, sécurité, authentification).",
    details: [
      "Collecteur : Swiftly.io",
      "Durée : 15 min – 30 jours",
      "Impact : obligatoire pour utiliser l'app",
    ],
    state: "on-locked",
    badge: "REQUIS",
  },
  {
    key: "analytics",
    icon: "📊",
    title: "Google Analytics (optionnel)",
    description:
      "Nous aide à comprendre comment tu utilises l'app : pages visitées, clics, temps passé.",
    details: [
      "Collecteur : Google",
      "Durée : 12 mois",
      "Impact : sans cela, statistiques anonymes uniquement",
    ],
    state: "toggle",
  },
  {
    key: "marketing",
    icon: "🎯",
    title: "Emails marketing (optionnel)",
    description:
      "Newsletters, promotions et nouvelles fonctionnalités. Fréquence modérée : 1–2 fois par semaine.",
    details: [
      "Collecteur : SendGrid (Phase 2)",
      "Désabonnement : en 1 clic",
      "Impact : rester informé des nouveautés",
    ],
    state: "toggle",
  },
  {
    key: "location",
    icon: "🌍",
    title: "Localisation / GPS (optionnel, à venir)",
    description:
      "Pour des services géolocalisés quand ils seront disponibles.",
    details: [
      "État : bientôt disponible",
      "Impact : recommandations personnalisées par zone",
    ],
    state: "coming-soon",
    badge: "Bientôt",
  },
];

export default function PrivacySettingsPage() {
  const { categories, ready, save } = useConsent();
  const toast = useToast();

  function toggle(key: ConsentCategory, next: boolean) {
    save({ ...categories, [key]: next }, "update");
    toast.show("✅ Paramètres sauvegardés !");
  }

  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-sf-border">
        <div className="mx-auto flex max-w-[800px] items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-sf-ink">
            Swiftly<span className="text-sf-blue">.io</span>
          </Link>
          <BackButton className="text-sm font-medium text-sf-muted hover:text-sf-ink" />
        </div>
      </header>

      <main className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="mb-4 text-2xl font-bold text-sf-ink sm:text-4xl">
          ⚙️ Paramètres de Confidentialité
        </h1>
        <p className="mb-3 text-base leading-relaxed text-sf-muted">
          Personnalise ton expérience en gérant quelles données tu acceptes de
          partager avec nous.
        </p>
        <Link
          href="/privacy"
          className="text-sm text-sf-blue underline underline-offset-2 hover:text-sf-blue-dark"
        >
          Voir la politique de confidentialité complète →
        </Link>

        <div className="mt-8 flex flex-col gap-4">
          {CARDS.map((card) => {
            const checked =
              card.state === "coming-soon" ? false : categories[card.key];
            const disabled = card.state !== "toggle" || !ready;
            return (
              <div
                key={card.key}
                className={`relative rounded-xl border border-sf-border bg-white p-5 transition-all hover:border-sf-blue hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] ${
                  card.state === "coming-soon" ? "opacity-60" : ""
                }`}
              >
                {card.badge && (
                  <span
                    className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white ${
                      card.state === "coming-soon" ? "bg-sf-amber" : "bg-sf-blue"
                    }`}
                  >
                    {card.badge}
                  </span>
                )}
                <div className="mb-3 flex items-start justify-between gap-4 pr-16">
                  <h2 className="text-base font-semibold text-sf-ink">
                    <span aria-hidden="true">{card.icon}</span> {card.title}
                  </h2>
                  <ConsentToggle
                    checked={checked}
                    disabled={disabled}
                    label={`${card.title} — ${checked ? "activé" : "désactivé"}`}
                    onChange={(next) => toggle(card.key, next)}
                  />
                </div>
                <p className="text-sm leading-relaxed text-sf-body">
                  {card.description}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-sf-muted">
                  {card.details.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-sf-border pt-6 sm:flex-row">
          <BackButton className="inline-flex w-full items-center justify-center rounded-lg border border-[#d1d5db] bg-sf-surface px-6 py-2.5 text-sm font-semibold text-sf-ink transition-colors hover:bg-sf-border sm:w-auto" />
          <Link
            href="/privacy"
            className="text-sm text-sf-blue underline underline-offset-2 hover:text-sf-blue-dark"
          >
            Voir la politique complète →
          </Link>
        </div>
      </main>

      {toast.node}
    </div>
  );
}
