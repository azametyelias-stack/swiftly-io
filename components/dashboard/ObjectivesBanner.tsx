"use client";

import { useEffect, useMemo, useState } from "react";

import { RotatingBanner, type BannerItem } from "@/components/dashboard/RotatingBanner";
import { BudgetFormSheet } from "@/components/budgets/BudgetFormSheet";
import { ProjectFormSheet } from "@/components/projects/ProjectFormSheet";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { useToast } from "@/components/ui/Toast";
import { createBudgetRequest, useBudgets } from "@/lib/budgets/useBudgets";
import { createProjectRequest, useProjects } from "@/lib/projects/useProjects";
import { DASHBOARD_STALE_EVENT } from "@/lib/dashboard/lastAccount";
import { buildObjectives } from "@/lib/dashboard/objectives";
import { formatMoney, type CurrencyCode } from "@/lib/format/money";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * Le bandeau « Objectif du mois » du Dashboard, alimenté pour de vrai
 * (SCREEN-4 § 7).
 *
 * Jusqu'ici `DashboardView` lui passait `items={[]}` en dur : le bandeau ne
 * pouvait donc afficher QUE son état vide, et les budgets créés sur SCREEN-15
 * n'apparaissaient nulle part sur l'accueil. Ce composant est le branchement
 * manquant.
 *
 * Il réunit les deux familles d'objectifs du produit :
 *  - les **budgets** (SCREEN-15), un plafond par catégorie de dépense ;
 *  - les **projets à montant cible** (SCREEN-16), qui sont l'épargne — le
 *    « Épargne 75 000 / 100 000 F » de la maquette `04-dashboard.png` est un
 *    projet, pas une table à part.
 *
 * Le sens de lecture des deux barres est opposé ; `lib/dashboard/objectives.ts`
 * s'en charge et est testé pour ça.
 */

/** Ce que l'état vide propose de créer, une fois le choix fait. */
type Creating = "budget" | "savings";

export function ObjectivesBanner({ currency = "XOF" }: { currency?: CurrencyCode }) {
  const m = useMessages();
  const t = m.dashboard.banner;
  const toast = useToast();

  const { budgets, reload: reloadBudgets } = useBudgets();
  const { projects, reload: reloadProjects } = useProjects();

  const [choosing, setChoosing] = useState(false);
  const [creating, setCreating] = useState<Creating | null>(null);

  // Une transaction vient d'être enregistrée : le « dépensé » d'un budget et le
  // « financé » d'un projet ont bougé. Le Dashboard reste monté sous la feuille
  // du wizard, donc sans ça la progression resterait celle d'avant.
  useEffect(() => {
    const bump = () => {
      reloadBudgets();
      reloadProjects();
    };
    window.addEventListener(DASHBOARD_STALE_EVENT, bump);
    return () => window.removeEventListener(DASHBOARD_STALE_EVENT, bump);
  }, [reloadBudgets, reloadProjects]);

  const items = useMemo<BannerItem[]>(() => {
    const money = (n: number) => formatMoney(n, { currency, sign: "none" });
    return buildObjectives(budgets, projects).map((o) => ({
      id: o.id,
      label: o.kind === "budget" ? t.budgetLabel : t.savingsLabel,
      title: o.name,
      // Un budget dépassé le dit en toutes lettres : « 118 % » seul se lit mal
      // quand on survole le bandeau une seconde entre deux rotations.
      caption: o.kind === "budget" && o.ratio > 1 ? t.overBudget : undefined,
      progress: o.percent,
      tone: o.tone,
      detail: `${money(o.current)} / ${money(o.target)}`,
      href: o.href,
      urgent: o.urgent,
    }));
  }, [budgets, projects, currency, t]);

  const closeForm = () => setCreating(null);

  return (
    <>
      <RotatingBanner
        items={items}
        empty={
          /*
           * L'état vide est un BOUTON, et c'était tout le défaut signalé par
           * Elias : « Fixer un objectif, si je clique rien ne se manifeste ».
           * C'était un simple <div> de texte, sans action, dans un composant
           * qui ne recevait de toute façon jamais d'objectif.
           */
          <button
            type="button"
            onClick={() => setChoosing(true)}
            className="w-full rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-4 text-left transition-colors active:bg-surface-field/70 motion-reduce:transition-none"
          >
            <p className="t-body font-semibold text-text-primary">{t.emptyTitle}</p>
            <p className="t-secondary mt-1 text-text-secondary">{t.emptyBody}</p>
          </button>
        }
      />

      {choosing ? (
        <ActionSheet
          title={t.chooseTitle}
          cancelLabel={m.common.cancel}
          onCancel={() => setChoosing(false)}
          actions={[
            {
              label: t.chooseBudget,
              onSelect: () => {
                setChoosing(false);
                setCreating("budget");
              },
            },
            {
              label: t.chooseSavings,
              onSelect: () => {
                setChoosing(false);
                setCreating("savings");
              },
            },
          ]}
        />
      ) : null}

      {creating === "budget" ? (
        <BudgetFormSheet
          // Un budget est UNIQUE par catégorie côté base : sans cette liste le
          // formulaire proposerait une catégorie que l'insertion refusera.
          usedCategoryIds={budgets.map((b) => b.category.id)}
          onClose={closeForm}
          onSubmit={async (payload) => {
            await createBudgetRequest(payload);
            toast.show(m.budgets.createdToast);
            reloadBudgets();
          }}
        />
      ) : null}

      {creating === "savings" ? (
        <ProjectFormSheet
          onClose={closeForm}
          onSubmit={async (payload) => {
            await createProjectRequest(payload);
            toast.show(m.projects.createdToast);
            reloadProjects();
          }}
        />
      ) : null}

      {toast.node}
    </>
  );
}
