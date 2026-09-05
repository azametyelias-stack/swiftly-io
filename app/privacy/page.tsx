import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { OptionalDataList } from "@/components/privacy/OptionalDataList";
import { PolicyToc, type TocSection } from "@/components/privacy/PolicyToc";
import { NightScreen } from "@/components/ui/NightScreen";
import { CONSENT_VERSION, PRIVACY_LAST_UPDATED } from "@/lib/privacy/consent";

/**
 * SCREEN-20 — Politique de confidentialité. Reconciled onto Swiftly's grammar
 * for Lot 6 (artboard `Swiftly - Lot 8 Privacy.dc.html`). The eight sections,
 * the data tables and the wording are unchanged — what changed is the skin,
 * which was written for a 1920 px site (navbar, sticky 250 px sidebar, footer,
 * emoji headings) and shipped inside a 375 px app.
 *
 * The four reconciliations, each from the artboard:
 *  - the sticky sidebar becomes the accordion at the head (`PolicyToc`);
 *  - the essentials table drops its "Exemple" column. Three columns across
 *    343 px give 90 px each, and "+228 XXX" teaches nothing to someone already
 *    reading "Téléphone". Two columns, both answering a question;
 *  - three families of coloured callout (info blue, important amber, check
 *    green) become one. In a long text on a small screen three of them
 *    manufacture noise, and amber stays reserved for the app's real alerts;
 *  - the RGPD badge is the page's only green, and it sits in the dark header
 *    where it competes with nothing — it is the promise to see before eight
 *    sections of prose.
 */

export const metadata: Metadata = {
  title: "Politique de Confidentialité — Swiftly.io",
  description:
    "Comment Swiftly.io collecte, utilise et protège tes données personnelles. Conforme au RGPD.",
};

const sections: TocSection[] = [
  { id: "section-1", title: "Quelles données collectons-nous ?" },
  { id: "section-2", title: "Pourquoi les collectons-nous ?" },
  { id: "section-3", title: "Avec qui partageons-nous ?" },
  { id: "section-4", title: "Tes droits (RGPD)" },
  { id: "section-5", title: "Sécurité de tes données" },
  { id: "section-6", title: "Cookies et suivi" },
  { id: "section-7", title: "Modifications" },
  { id: "section-8", title: "Contact et support" },
];

/** The page's single callout. Blue = information; amber belongs to real alerts. */
function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-block)] border-l-[3px] border-brand-accent bg-[color-mix(in_srgb,var(--brand-accent)_8%,transparent)] p-3.5 t-body text-text-secondary">
      {children}
    </div>
  );
}

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-3">
      <h2 className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-7 flex-none place-items-center rounded-full bg-brand-accent text-[13px] font-bold text-ink-on-surface"
        >
          {n}
        </span>
        <span className="t-section-title">{title}</span>
      </h2>
      {children}
    </section>
  );
}

/** Two columns, both answering a question (see the header comment). */
function TwoColTable({
  caption,
  head,
  rows,
}: {
  caption: string;
  head: [string, string];
  rows: [string, string][];
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-surface-divider">
            <th scope="col" className="p-3 t-label text-text-tertiary">
              {head[0]}
            </th>
            <th scope="col" className="p-3 t-label text-text-tertiary">
              {head[1]}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a} className="border-b border-surface-hairline last:border-b-0">
              <td className="p-3 align-top text-[15px] font-semibold">{a}</td>
              <td className="p-3 align-top t-body text-text-secondary">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 t-body text-text-secondary">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden="true" className="text-text-quaternary">
            ·
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <NightScreen
      title="Confidentialité"
      belowHeader={
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">
            Politique de confidentialité
          </h1>
          <p className="flex flex-wrap items-center gap-2 t-secondary text-ink-on-surface/70">
            <span>Version {CONSENT_VERSION}</span>
            <span aria-hidden="true">·</span>
            <span>{PRIVACY_LAST_UPDATED}</span>
            {/* The page's only green — see the header comment. */}
            <span
              className="rounded-[var(--radius-pill)] px-2 py-0.5 text-[12px] font-bold"
              style={{
                backgroundColor: "color-mix(in srgb, var(--ink-in) 18%, transparent)",
                color: "var(--ink-in)",
              }}
            >
              RGPD conforme
            </span>
          </p>
          <p className="t-body text-ink-on-surface/80">
            Swiftly.io s&apos;engage à protéger ta vie privée. Cette politique
            explique comment nous collectons, utilisons et protégeons tes données.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-8 p-4 pb-12">
        <PolicyToc sections={sections} />

        <Section id="section-1" n={1} title="Quelles données collectons-nous ?">
          <h3 className="t-body font-bold">Données essentielles</h3>
          <TwoColTable
            caption="Données essentielles collectées par Swiftly.io"
            head={["Donnée", "Raison"]}
            rows={[
              ["Téléphone", "Login et SMS OTP"],
              ["Email", "Réinitialisation et notifications"],
              ["Nom", "Identification dans l'app"],
              ["Transactions", "Historique et stats"],
              ["Comptes liés", "Suivi des soldes"],
            ]}
          />
          <h3 className="mt-2 t-body font-bold">Données optionnelles</h3>
          <OptionalDataList />
          <InfoBox>
            Tu peux changer d&apos;avis à tout moment depuis les{" "}
            <Link href="/privacy-settings" className="font-semibold text-brand-accent underline">
              paramètres de confidentialité
            </Link>
            .
          </InfoBox>
        </Section>

        <Section id="section-2" n={2} title="Pourquoi les collectons-nous ?">
          <Bullets
            items={[
              <>
                <b className="font-semibold text-text-primary">Fournir le service</b> —
                authentification, enregistrement et affichage de tes transactions,
                calcul des soldes, budgets et statistiques.
              </>,
              <>
                <b className="font-semibold text-text-primary">Sécurité</b> — détection
                d&apos;activité suspecte, protection de ton compte.
              </>,
              <>
                <b className="font-semibold text-text-primary">Amélioration produit</b>{" "}
                (si tu l&apos;acceptes) — comprendre quelles fonctionnalités sont
                utiles via des statistiques agrégées.
              </>,
              <>
                <b className="font-semibold text-text-primary">Communication</b> (si tu
                l&apos;acceptes) — t&apos;informer des nouveautés.
              </>,
            ]}
          />
          <p className="t-body text-text-secondary">
            Base légale (RGPD) : l&apos;exécution du contrat pour les données
            essentielles, et ton consentement pour les données optionnelles.
          </p>
        </Section>

        <Section id="section-3" n={3} title="Avec qui partageons-nous ?">
          <p className="t-body text-text-secondary">
            Nous ne vendons jamais tes données. Nous nous appuyons sur un petit
            nombre de sous-traitants techniques :
          </p>
          {/* A list, not a third column: "Service · Rôle · Données" across
              343 px would repeat the problem the artboard solved in § 1. */}
          <ul className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
            {(
              [
                ["Supabase", "Hébergement de la base", "Compte, transactions"],
                ["Sentry", "Suivi des erreurs", "Journaux anonymisés"],
                ["Upstash", "Cache et limitation de débit", "Identifiants techniques"],
                ["Google Analytics", "Statistiques d'usage (si accepté)", "Pages vues, événements"],
                ["SendGrid (Phase 2)", "Envoi d'emails", "Email"],
                ["Paystack (Phase 2)", "Traitement des paiements", "Données de transaction"],
              ] as [string, string, string][]
            ).map(([service, role, data]) => (
              <li
                key={service}
                className="flex flex-col gap-0.5 border-b border-surface-hairline py-3 last:border-b-0"
              >
                <span className="text-[15px] font-semibold">{service}</span>
                <span className="t-secondary text-text-secondary">
                  {role} · {data}
                </span>
              </li>
            ))}
          </ul>
          <p className="t-body text-text-secondary">
            Nous pouvons également divulguer des données si la loi l&apos;exige
            (réquisition judiciaire).
          </p>
        </Section>

        <Section id="section-4" n={4} title="Tes droits (RGPD)">
          <Bullets
            items={[
              <>
                <b className="font-semibold text-text-primary">Accès</b> — obtenir une
                copie de toutes tes données.
              </>,
              <>
                <b className="font-semibold text-text-primary">Rectification</b> —
                corriger des données inexactes.
              </>,
              <>
                <b className="font-semibold text-text-primary">Effacement</b> —
                supprimer ton compte et tes données définitivement.
              </>,
              <>
                <b className="font-semibold text-text-primary">Portabilité</b> —
                récupérer tes données dans un format lisible.
              </>,
              <>
                <b className="font-semibold text-text-primary">
                  Retrait du consentement
                </b>{" "}
                — à tout moment, sans justification.
              </>,
            ]}
          />
          <InfoBox>
            Le retrait du consentement se fait depuis les{" "}
            <Link href="/privacy-settings" className="font-semibold text-brand-accent underline">
              paramètres de confidentialité
            </Link>
            . Pour les autres droits, écris à privacy@swiftly.io — réponse sous 48 h.
          </InfoBox>
        </Section>

        <Section id="section-5" n={5} title="Sécurité de tes données">
          <Bullets
            items={[
              "Chiffrement en transit (HTTPS) et au repos.",
              "Accès aux données restreint et journalisé.",
              "Validation stricte des entrées (Zod) sur toutes les API.",
              "Journal d'audit inviolable pour les consentements.",
            ]}
          />
          <InfoBox>
            Aucun système n&apos;est infaillible. En cas de violation de données
            affectant tes droits, nous te préviendrons et informerons
            l&apos;autorité compétente dans les 72 h.
          </InfoBox>
        </Section>

        <Section id="section-6" n={6} title="Cookies et suivi">
          <h3 className="t-body font-bold">Essentiels (toujours actifs)</h3>
          <Bullets
            items={[
              <>
                <code className="rounded bg-surface-field px-1.5 py-0.5 text-[13px]">
                  access_token
                </code>{" "}
                — session (15 min)
              </>,
              <>
                <code className="rounded bg-surface-field px-1.5 py-0.5 text-[13px]">
                  refresh_token
                </code>{" "}
                — reconnexion (30 jours)
              </>,
              <>
                <code className="rounded bg-surface-field px-1.5 py-0.5 text-[13px]">
                  sf_consent
                </code>{" "}
                — mémorisation de ton choix (13 mois)
              </>,
            ]}
          />
          <h3 className="mt-2 t-body font-bold">Optionnels</h3>
          <p className="t-body text-text-secondary">
            Google Analytics n&apos;est chargé qu&apos;après ton accord explicite
            (Consent Mode v2, refusé par défaut).
          </p>
        </Section>

        <Section id="section-7" n={7} title="Modifications">
          <p className="t-body text-text-secondary">
            Nous pouvons mettre à jour cette politique. En cas de changement
            important, la version est incrémentée et la feuille de consentement
            réapparaît pour recueillir un nouvel accord. La date de dernière mise
            à jour figure en haut de cette page.
          </p>
        </Section>

        <Section id="section-8" n={8} title="Contact et support">
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
            {(
              [
                ["Email", "privacy@swiftly.io"],
                ["Adresse", "Lomé, Togo"],
                ["Délai de réponse", "Sous 48 heures"],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex min-h-[var(--row-setting)] items-center justify-between gap-3 border-b border-surface-hairline last:border-b-0"
              >
                <span className="t-body text-text-secondary">{label}</span>
                <span className="text-[15px] font-semibold">{value}</span>
              </div>
            ))}
          </div>

          <Link
            href="/privacy-settings"
            className="mt-2 flex h-[var(--size-primary-button)] w-full items-center justify-center rounded-[var(--radius-pill)] bg-action-primary text-[17px] font-semibold text-action-on-primary"
          >
            Mes paramètres
          </Link>
        </Section>
      </div>
    </NightScreen>
  );
}
