/**
 * Les objectifs du bandeau du Dashboard (SCREEN-4 § 7).
 *
 * Deux familles d'objectifs coexistent dans la rotation, et elles ne se lisent
 * PAS dans le même sens — c'est tout l'intérêt de ce module :
 *
 *  - un **budget** (SCREEN-15) est un plafond de dépense par catégorie. Sa
 *    barre se REMPLIT vers une mauvaise nouvelle : à 95 % on est sur le point
 *    de dépasser. Vert 0-50 %, orange 51-91 %, rouge 92 %+ (SCREEN-15 § 5), et
 *    le rouge passe en tête du bandeau (§ 7 : « les alertes urgentes passent en
 *    premier »).
 *  - un **projet à montant cible** (SCREEN-16) est une épargne. Sa barre se
 *    remplit vers une BONNE nouvelle — « Épargne 75 000 / 100 000 F » de la
 *    maquette `04-dashboard.png`. Elle reste donc verte de bout en bout et
 *    n'est jamais urgente : personne n'a besoin d'être alerté d'avoir trop
 *    épargné.
 *
 * Appliquer le seuil des budgets aux projets aurait peint en rouge l'objectif
 * presque atteint. C'est la seule raison d'être de la distinction `kind`.
 *
 * Pur et sans import — `tests/dashboard/objectives.test.ts` le charge
 * directement sous `node --test`. Les formes d'entrée sont décrites
 * structurellement plutôt qu'importées de `lib/budgets` / `lib/projects` pour
 * que ce fichier reste chargeable seul.
 */

export type ObjectiveKind = "budget" | "savings";
export type ObjectiveTone = "green" | "orange" | "red";

export interface ObjectiveBudgetSource {
  id: string;
  category: { name: string };
  allocated_amount: number;
  spent: number;
}

export interface ObjectiveProjectSource {
  id: string;
  name: string;
  target_amount: number | null;
  allocated_amount: number;
  spent: number;
  status: string;
}

export interface Objective {
  /** Unique à travers les DEUX familles : `budgets` et `projects` ont chacun leurs uuid. */
  id: string;
  kind: ObjectiveKind;
  href: string;
  /** Nom de la catégorie (budget) ou du projet (épargne). */
  name: string;
  current: number;
  target: number;
  ratio: number;
  /** Arrondi, NON plafonné : un budget dépassé doit pouvoir afficher 118 %. */
  percent: number;
  tone: ObjectiveTone;
  urgent: boolean;
}

/** Le seuil de SCREEN-15 § 5, celui qui déclenche aussi l'alerte quotidienne. */
const BUDGET_RED = 0.92;
const BUDGET_ORANGE = 0.5;

function ratioOf(current: number, target: number): number {
  if (target > 0) return current / target;
  return current > 0 ? 1 : 0;
}

export function budgetObjective(b: ObjectiveBudgetSource): Objective {
  const ratio = ratioOf(b.spent, b.allocated_amount);
  const tone: ObjectiveTone =
    ratio >= BUDGET_RED ? "red" : ratio > BUDGET_ORANGE ? "orange" : "green";
  return {
    id: `budget:${b.id}`,
    kind: "budget",
    href: `/budgets/${b.id}`,
    name: b.category.name,
    current: b.spent,
    target: b.allocated_amount,
    ratio,
    percent: Math.round(ratio * 100),
    tone,
    urgent: tone === "red",
  };
}

/**
 * `null` quand le projet n'a pas de montant cible : sans cible il n'y a pas de
 * progression à montrer (SCREEN-16 § 5, « barre visible uniquement si
 * l'utilisateur a rempli un budget/montant cible »), et un objectif sans
 * horizon n'a rien à faire dans un bandeau qui ne parle que de progression.
 *
 * `null` aussi quand le projet n'est plus actif : un projet achevé, en attente
 * ou suspendu occuperait un tour de rotation pour rien.
 */
export function savingsObjective(p: ObjectiveProjectSource): Objective | null {
  if (p.status !== "active") return null;
  const target = p.target_amount ?? 0;
  if (target <= 0) return null;
  // Le « financé » de SCREEN-16 : ce qu'on a mis de côté (« Affecter au solde »)
  // plus ce qui a déjà été engagé sur le projet.
  const current = p.allocated_amount + p.spent;
  const ratio = ratioOf(current, target);
  return {
    id: `project:${p.id}`,
    kind: "savings",
    href: `/projets/${p.id}`,
    name: p.name,
    current,
    target,
    ratio,
    percent: Math.round(ratio * 100),
    tone: "green",
    urgent: false,
  };
}

/**
 * L'ordre du bandeau (SCREEN-4 § 7) : les budgets en danger d'abord, puis le
 * reste du plus avancé au moins avancé.
 *
 * Pour un budget « le plus avancé » veut dire le plus proche du dépassement ;
 * pour une épargne, le plus proche du but. Dans les deux cas c'est ce dont
 * l'utilisateur a le plus besoin d'entendre parler, ce qui laisse en fin de
 * rotation les objectifs à peine entamés.
 *
 * Le nom départage, pour que deux passages successifs sur le Dashboard donnent
 * exactement le même ordre — une rotation dont l'ordre change à chaque montage
 * donnerait l'impression que le bandeau perd des éléments.
 */
export function buildObjectives(
  budgets: readonly ObjectiveBudgetSource[] | null | undefined,
  projects: readonly ObjectiveProjectSource[] | null | undefined,
): Objective[] {
  /*
   * Les deux listes sont tolérées absentes, et ce n'est pas de la coquetterie :
   * ce bandeau est en haut de l'ÉCRAN D'ACCUEIL. Une réponse inattendue de
   * `/api/budgets` — un 200 à la forme surprenante, une version d'API en
   * avance — ne doit pas faire tomber tout le Dashboard ; elle doit faire un
   * bandeau vide. Attrapé au harnais navigateur le 2026-09-13, où une fixture
   * incomplète a mis l'écran entier sur « This page couldn't load ».
   */
  const items: Objective[] = (Array.isArray(budgets) ? budgets : []).map(
    budgetObjective,
  );
  for (const p of Array.isArray(projects) ? projects : []) {
    const o = savingsObjective(p);
    if (o) items.push(o);
  }
  return items.sort(
    (a, b) =>
      Number(b.urgent) - Number(a.urgent) ||
      b.ratio - a.ratio ||
      a.name.localeCompare(b.name, "fr"),
  );
}
