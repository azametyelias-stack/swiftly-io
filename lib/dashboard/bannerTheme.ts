/**
 * La palette du bandeau « Objectif du mois » (SCREEN-4 § 7).
 *
 * Demande d'Elias, 2026-09-16 : « j'aimerais que ça puisse varier en fonction
 * du budget, pour ne pas que tout ce ressemble ». Deux objectifs qui se suivent
 * dans la rotation ne doivent donc pas se ressembler — c'est la POSITION dans
 * la rotation qui donne la couleur, pas la nature de l'objectif : le bleu pour
 * le premier, le vert pour le second, puis le reste de la liste.
 *
 * Ce module ne contient QUE la teinte d'accent. Tout le reste de la carte —
 * fond, halos, piste de la barre, montants, sommets — en est dérivé au rendu
 * par `color-mix()`. Ajouter une couleur, c'est donc ajouter une ligne ici, et
 * rien d'autre : c'était la deuxième moitié de la demande (« prépare beaucoup
 * d'autres couleurs dans le code »).
 *
 * Les valeurs sont des littéraux et non des tokens `--surface-*` : la carte est
 * de la ZONE D'IDENTITÉ (fond de nuit quasi noir), celle que `app/globals.css`
 * exclut nommément des tokens de surface. Les deux premières viennent quand
 * même du système — ce sont ses propres bleu et vert « sur la nuit ».
 *
 * Pur et sans import : `tests/dashboard/bannerTheme.test.ts` le charge
 * directement sous `node --test`.
 */

/** Le ton de progression que `lib/dashboard/objectives.ts` calcule déjà. */
export type BannerTone = "green" | "orange" | "red";

export interface BannerTheme {
  /** Nom lisible — sert aux tests et au débogage, jamais affiché. */
  id: string;
  /**
   * La teinte, et la seule donnée du thème. Choisie pour tenir sur un fond
   * quasi noir : les teintes « sur fond clair » du système (`--brand-accent`
   * #152BC7, `--semantic-in` #006B3C) y deviennent illisibles.
   */
  accent: string;
}

/**
 * L'ordre EST la demande : bleu d'abord, vert ensuite. Le reste suit, choisi
 * pour que deux voisines de la liste ne se confondent pas au premier coup
 * d'œil — on ne passe jamais d'un bleu à un autre bleu.
 */
export const BANNER_THEMES: readonly BannerTheme[] = [
  { id: "blue", accent: "#5B7CFF" }, // `--brand-on-night` : le bleu de la marque, version nuit
  { id: "green", accent: "#1DCF02" }, // `--ink-in` : le seul vert qui tienne sur l'encre
  { id: "violet", accent: "#7C5CFF" }, // la teinte de la maquette d'Elias du 2026-09-16
  { id: "amber", accent: "#FFB020" },
  { id: "cyan", accent: "#22D3EE" },
  { id: "pink", accent: "#FF5FA2" },
  { id: "teal", accent: "#14D6A8" },
  { id: "coral", accent: "#FF7A5C" },
  { id: "lime", accent: "#A3E635" },
  { id: "indigo", accent: "#818CF8" },
];

/**
 * Le thème d'alerte, HORS rotation.
 *
 * Un budget à 92 % ou plus est `tone: "red"` — le seuil de SCREEN-15 § 5, celui
 * qui déclenche aussi l'alerte quotidienne. Laisser la rotation lui donner un
 * turquoise parce qu'il tombe en cinquième position effacerait le seul signal
 * visuel de dépassement du Dashboard. La variété s'arrête donc là, et là
 * seulement.
 *
 * Ce n'est pas `--semantic-out` (#A80010) : ce rouge-là est calculé pour du
 * texte sur fond clair et disparaît sur la nuit.
 */
export const BANNER_ALERT_THEME: BannerTheme = { id: "alert", accent: "#FF4D5E" };

/**
 * Le thème d'un objectif, d'après sa place dans la rotation.
 *
 * `index` peut dépasser la longueur de la palette — on boucle. Un `index`
 * négatif ou non entier ne doit pas pouvoir sortir un `undefined` : la carte
 * s'afficherait sans aucune couleur.
 */
export function bannerTheme(index: number, tone?: BannerTone): BannerTheme {
  if (tone === "red") return BANNER_ALERT_THEME;
  const n = BANNER_THEMES.length;
  const i = Number.isFinite(index) ? ((Math.trunc(index) % n) + n) % n : 0;
  return BANNER_THEMES[i]!;
}
