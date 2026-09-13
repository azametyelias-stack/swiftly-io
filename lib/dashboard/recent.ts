/**
 * La règle de troncature de l'« Historique récent » du Dashboard (SCREEN-4 § 10).
 *
 * Le doc d'origine disait « les 3 transactions les plus récentes ». Décision
 * d'Elias du 2026-09-13 : **5**, et « Voir plus » déplie la liste SUR PLACE au
 * lieu de renvoyer vers l'écran Historiques — c'est désormais le seul rôle du
 * bouton. On n'atterrit sur `/historiques` qu'en touchant l'en-tête du bloc.
 *
 * Pur et sans import — `tests/dashboard/recent.test.ts` le charge directement
 * sous `node --test`.
 */

/** Nombre de lignes visibles tant que le bloc est replié. */
export const RECENT_VISIBLE = 5;

/**
 * Le bouton « Voir plus » n'a de sens que s'il reste quelque chose à montrer.
 *
 * Donc **à partir de la 6ᵉ transaction**, et pas « au-delà de 6 » : avec
 * exactement 6, la 6ᵉ serait cachée sans aucun moyen de l'atteindre. Le seuil
 * est celui du premier élément tronqué, pas un compte rond.
 */
export function offersMore(total: number): boolean {
  return total > RECENT_VISIBLE;
}

/** Les lignes réellement affichées, selon que le bloc est déplié ou non. */
export function recentSlice<T>(rows: readonly T[], expanded: boolean): T[] {
  return expanded ? [...rows] : rows.slice(0, RECENT_VISIBLE);
}
