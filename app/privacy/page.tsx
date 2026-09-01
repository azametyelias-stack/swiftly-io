import type { Metadata } from "next";
import Link from "next/link";

import { PolicyToc, type TocSection } from "@/components/privacy/PolicyToc";
import { BackButton } from "@/components/ui/BackButton";
import { CONSENT_VERSION, PRIVACY_LAST_UPDATED } from "@/lib/privacy/consent";

export const metadata: Metadata = {
  title: "Politique de Confidentialité — Swiftly.io",
  description:
    "Comment Swiftly.io collecte, utilise et protège tes données personnelles. Conforme au RGPD.",
};

const sections: TocSection[] = [
  { id: "section-1", title: "1. Quelles données collectons-nous ?" },
  { id: "section-2", title: "2. Pourquoi les collectons-nous ?" },
  { id: "section-3", title: "3. Avec qui partageons-nous ?" },
  { id: "section-4", title: "4. Tes droits (RGPD)" },
  { id: "section-5", title: "5. Sécurité de tes données" },
  { id: "section-6", title: "6. Cookies & tracking" },
  { id: "section-7", title: "7. Modifications" },
  { id: "section-8", title: "8. Contact & support" },
];

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border-l-4 border-sf-blue bg-[#eff6ff] p-4 text-sm text-[#1e40af]">
      ℹ️ {children}
    </div>
  );
}

function ImportantBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border-l-4 border-sf-amber bg-[#fef3c7] p-4 text-sm text-[#92400e]">
      ⚠️ {children}
    </div>
  );
}

function CheckBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border-l-4 border-sf-green bg-[#f0fdf4] p-4 text-sm text-[#065f46]">
      ✅ {children}
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 text-xl font-semibold text-sf-ink sm:text-2xl"
    >
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-white">
      <header className="border-b border-sf-border">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="text-lg font-bold text-sf-ink">
            Swiftly<span className="text-sf-blue">.io</span>
          </Link>
          <Link
            href="/privacy-settings"
            className="rounded-lg bg-sf-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sf-blue-dark"
          >
            ⚙️ Paramètres Privacy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8 sm:py-12">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-sf-ink sm:text-[42px]">
            🔒 Politique de Confidentialité
          </h1>
          <p className="mb-6 text-sm text-sf-muted">
            Dernière mise à jour : {PRIVACY_LAST_UPDATED} · Version{" "}
            {CONSENT_VERSION} ·{" "}
            <span className="font-medium text-sf-green">✅ Conforme RGPD</span>
          </p>
          <p className="max-w-3xl text-base leading-relaxed text-sf-body">
            Swiftly.io s&apos;engage à protéger ta vie privée. Cette politique
            explique quelles données nous collectons, pourquoi, avec qui nous les
            partageons, et quels sont tes droits.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-8">
          <PolicyToc sections={sections} />

          <article className="flex min-w-0 flex-1 flex-col gap-10 text-[15px] leading-7 text-sf-body">
            {/* 1 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-1">
                1. Quelles données collectons-nous ?
              </SectionHeading>
              <p className="font-semibold text-sf-ink">Données essentielles</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse overflow-hidden rounded-lg border border-sf-border text-sm">
                  <caption className="sr-only">
                    Données essentielles collectées par Swiftly.io
                  </caption>
                  <thead>
                    <tr className="bg-sf-surface text-left font-semibold text-sf-ink">
                      <th scope="col" className="p-3">Donnée</th>
                      <th scope="col" className="p-3">Exemple</th>
                      <th scope="col" className="p-3">Raison</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Numéro de téléphone", "+228 90 00 00 00", "Connexion + code de vérification (OTP)"],
                      ["Email", "toi@exemple.com", "Récupération de compte, notifications"],
                      ["Nom / username", "Awa K.", "Identification dans l'app"],
                      ["Transactions", "« 5 000 XOF — Courses »", "Historique et statistiques"],
                      ["Comptes financiers", "Orange Money, espèces", "Suivi des soldes et virements"],
                    ].map(([d, e, r]) => (
                      <tr key={d} className="border-t border-sf-border odd:bg-white even:bg-sf-subtle">
                        <td className="p-3 font-medium text-sf-ink">{d}</td>
                        <td className="p-3">{e}</td>
                        <td className="p-3">{r}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-semibold text-sf-ink">Données optionnelles</p>
              <ul className="list-inside list-disc space-y-1">
                <li>📊 Google Analytics — statistiques d&apos;usage (désactivé par défaut)</li>
                <li>🎯 Emails marketing — newsletters et nouveautés (désactivé par défaut)</li>
                <li>🌍 Localisation / GPS — recommandations locales (bientôt disponible)</li>
              </ul>
              <InfoBox>
                Les données optionnelles ne sont collectées que si tu les
                actives dans les{" "}
                <Link href="/privacy-settings" className="underline">
                  paramètres de confidentialité
                </Link>
                .
              </InfoBox>
            </section>

            {/* 2 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-2">
                2. Pourquoi les collectons-nous ?
              </SectionHeading>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  <span className="font-medium text-sf-ink">Fournir le service :</span>{" "}
                  authentification, enregistrement et affichage de tes transactions,
                  calcul des soldes, budgets et statistiques.
                </li>
                <li>
                  <span className="font-medium text-sf-ink">Sécurité :</span>{" "}
                  détection d&apos;activité suspecte, protection de ton compte.
                </li>
                <li>
                  <span className="font-medium text-sf-ink">Amélioration produit</span>{" "}
                  (si tu l&apos;acceptes) : comprendre quelles fonctionnalités sont
                  utiles via des statistiques agrégées.
                </li>
                <li>
                  <span className="font-medium text-sf-ink">Communication</span>{" "}
                  (si tu l&apos;acceptes) : t&apos;informer des nouveautés.
                </li>
              </ul>
              <p>
                Base légale (RGPD) : l&apos;exécution du contrat pour les données
                essentielles, et ton consentement pour les données optionnelles.
              </p>
            </section>

            {/* 3 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-3">
                3. Avec qui partageons-nous ?
              </SectionHeading>
              <p>
                Nous ne vendons jamais tes données. Nous nous appuyons sur un
                petit nombre de sous-traitants techniques :
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse overflow-hidden rounded-lg border border-sf-border text-sm">
                  <caption className="sr-only">Sous-traitants de Swiftly.io</caption>
                  <thead>
                    <tr className="bg-sf-surface text-left font-semibold text-sf-ink">
                      <th scope="col" className="p-3">Service</th>
                      <th scope="col" className="p-3">Rôle</th>
                      <th scope="col" className="p-3">Données concernées</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Supabase", "Hébergement de la base de données", "Compte, transactions"],
                      ["Sentry", "Suivi des erreurs techniques", "Journaux d'erreur (anonymisés)"],
                      ["Upstash", "Cache / limitation de débit", "Identifiants techniques temporaires"],
                      ["Google Analytics", "Statistiques d'usage (si accepté)", "Pages vues, événements"],
                      ["SendGrid (Phase 2)", "Envoi d'emails", "Email"],
                      ["Paystack (Phase 2)", "Traitement des paiements", "Données de transaction"],
                    ].map(([s, role, data]) => (
                      <tr key={s} className="border-t border-sf-border odd:bg-white even:bg-sf-subtle">
                        <td className="p-3 font-medium text-sf-ink">{s}</td>
                        <td className="p-3">{role}</td>
                        <td className="p-3">{data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Nous pouvons également divulguer des données si la loi l&apos;exige
                (réquisition judiciaire).
              </p>
            </section>

            {/* 4 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-4">4. Tes droits (RGPD)</SectionHeading>
              <ul className="list-inside list-disc space-y-2">
                <li><span className="font-medium text-sf-ink">Accès</span> — obtenir une copie de tes données.</li>
                <li><span className="font-medium text-sf-ink">Rectification</span> — corriger des données inexactes.</li>
                <li><span className="font-medium text-sf-ink">Effacement</span> — supprimer ton compte et tes données.</li>
                <li><span className="font-medium text-sf-ink">Portabilité</span> — récupérer tes données dans un format lisible.</li>
                <li><span className="font-medium text-sf-ink">Opposition / retrait du consentement</span> — à tout moment, sans justification.</li>
              </ul>
              <CheckBox>
                Tu peux retirer ton consentement aux données optionnelles à tout
                moment depuis{" "}
                <Link href="/privacy-settings" className="underline">
                  /privacy-settings
                </Link>
                . Pour les autres droits, écris à privacy@swiftly.io — réponse
                sous 48 h.
              </CheckBox>
            </section>

            {/* 5 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-5">5. Sécurité de tes données</SectionHeading>
              <ul className="list-inside list-disc space-y-2">
                <li>Chiffrement en transit (HTTPS) et au repos.</li>
                <li>Accès aux données restreint et journalisé.</li>
                <li>Validation stricte des entrées (Zod) sur toutes les API.</li>
                <li>Journal d&apos;audit inviolable pour les consentements.</li>
              </ul>
              <ImportantBox>
                Aucun système n&apos;est infaillible. En cas de violation de
                données affectant tes droits, nous te préviendrons et informerons
                l&apos;autorité compétente dans les 72 h.
              </ImportantBox>
            </section>

            {/* 6 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-6">6. Cookies & tracking</SectionHeading>
              <p className="font-semibold text-sf-ink">Cookies essentiels (toujours actifs)</p>
              <ul className="list-inside list-disc space-y-1">
                <li><code className="rounded bg-sf-surface px-1">access_token</code> — session (15 min)</li>
                <li><code className="rounded bg-sf-surface px-1">refresh_token</code> — reconnexion (30 jours)</li>
                <li><code className="rounded bg-sf-surface px-1">sf_sid</code> / <code className="rounded bg-sf-surface px-1">sf_consent</code> — mémorisation de ton choix de consentement (13 mois)</li>
              </ul>
              <p className="font-semibold text-sf-ink">Cookies optionnels</p>
              <p>
                Google Analytics n&apos;est chargé qu&apos;après ton accord
                explicite (Consent Mode v2, refusé par défaut). Tu contrôles cela
                depuis{" "}
                <Link href="/privacy-settings" className="underline text-sf-blue">
                  les paramètres de confidentialité
                </Link>
                .
              </p>
            </section>

            {/* 7 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-7">7. Modifications</SectionHeading>
              <p>
                Nous pouvons mettre à jour cette politique. En cas de changement
                important, la version est incrémentée et la bannière de
                consentement réapparaît pour recueillir un nouvel accord. La date
                de dernière mise à jour figure en haut de cette page.
              </p>
            </section>

            {/* 8 */}
            <section className="flex flex-col gap-4">
              <SectionHeading id="section-8">8. Contact & support</SectionHeading>
              <p>Questions sur tes données ou l&apos;exercice de tes droits :</p>
              <ul className="space-y-1">
                <li>📧 <a href="mailto:privacy@swiftly.io" className="text-sf-blue underline">privacy@swiftly.io</a></li>
                <li>📍 Lomé, Togo</li>
                <li>🕐 Réponse sous 48 h</li>
              </ul>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <BackButton className="inline-flex items-center justify-center rounded-lg border border-[#d1d5db] bg-sf-surface px-6 py-2.5 text-sm font-semibold text-sf-ink transition-colors hover:bg-sf-border" />
                <Link
                  href="/privacy-settings"
                  className="inline-flex items-center justify-center rounded-lg bg-sf-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sf-blue-dark"
                >
                  🔔 Paramètres Privacy
                </Link>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
