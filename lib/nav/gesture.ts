/**
 * Les règles du geste horizontal de l'app shell (SCREEN-05, menu à glissement).
 *
 * Le point délicat n'est pas le tiroir lui-même, c'est qu'il partage le bord
 * gauche de l'écran avec un geste du SYSTÈME : le « retour arrière » balayé
 * depuis le bord (iOS ≥ 16, y compris en app installée, et Chrome Android). Ce
 * geste-là est reconnu par le navigateur, pas par nous, et il gagne — d'où le
 * symptôme d'Elias le 2026-09-07 : « sur le dashboard je veux ouvrir le menu et
 * ça me ramène sur une autre page ».
 *
 * Décision : dans Swiftly, un balayage horizontal appartient au menu, jamais à
 * l'historique. Le retour arrière garde son chevron dans `AppHeader`, qui est
 * explicite et ne se déclenche pas par accident.
 *
 * Pur et sans import, pour que `node --test` charge ce module directement — le
 * branchement aux évènements est dans `components/nav/NavShell.tsx`.
 */

/**
 * Bande du calque écran qui reste visible quand le menu est ouvert.
 *
 * 52 px jusqu'au 2026-09-11 : un liseré, juste de quoi savoir qu'on peut
 * revenir. Porté à 100 pour le rendu « la page devient une carte » — on doit
 * reconnaître l'écran qu'on a quitté, pas seulement deviner sa tranche. Au-delà
 * de ~110 le menu perd trop de largeur et les libellés longs (« Alertes &
 * Notifications ») défilent en permanence.
 */
export const NAV_EDGE_BAND = 100;

/** Un balayage qui commence à moins de ça du bord gauche peut ouvrir le menu. */
export const NAV_OPEN_ZONE = 28;

/** Déplacement horizontal avant de traiter le geste comme un glissement de tiroir. */
export const NAV_INTENT = 10;

/**
 * Tolérance verticale avant de rendre la main au défilement.
 *
 * C'est le seul réglage vraiment sensible ici. Bloquer le geste système suppose
 * d'appeler `preventDefault()` sur le PREMIER `touchmove` — après, iOS a déjà
 * commencé sa transition et ne la rend plus. Mais `preventDefault()` empêche
 * aussi de défiler. Il faut donc trancher tôt, sur quelques pixels : au-delà de
 * ce seuil en vertical dominant, c'est un défilement, on ne touche à rien.
 *
 * 6 px : assez petit pour décider avant qu'iOS ne s'engage, assez grand pour ne
 * pas confondre le tremblement d'un doigt qui commence à faire défiler.
 */
export const NAV_VERTICAL_RELEASE = 6;

export interface SwipeSample {
  /** x du contact au départ, en pixels depuis le bord gauche du viewport. */
  startX: number;
  /** Déplacement depuis le départ. */
  dx: number;
  dy: number;
  /** Le tiroir est-il déjà ouvert ? */
  open: boolean;
}

/**
 * Faut-il neutraliser le geste par défaut du navigateur pour ce contact ?
 *
 * Trois cas, dans cet ordre :
 *  1. Vertical franc → non. Le défilement de la page passe avant tout ; c'est ce
 *     qui évite de figer une liste dont on a commencé à tirer près du bord.
 *  2. Menu ouvert → oui, quel que soit le point de départ. Le refermer est un
 *     balayage vers la gauche, qui sur le bord droit d'iOS est le geste
 *     « avancer » — même conflit, même réponse.
 *  3. Menu fermé → oui seulement depuis la zone d'ouverture. Ailleurs le doigt
 *     ne nous appartient pas : un balayage au milieu de l'écran peut servir à
 *     autre chose (la suppression par glissement dans l'historique, SCREEN-6).
 */
export function shouldBlockSystemSwipe(sample: SwipeSample): boolean {
  const { startX, dx, dy, open } = sample;

  if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > NAV_VERTICAL_RELEASE) return false;
  if (open) return true;
  return startX <= NAV_OPEN_ZONE;
}

/* ── Le calque écran, quand il se range ──────────────────────────────────────
 *
 * Le menu n'est pas un tiroir qui sort : c'est le sol, et l'écran courant est
 * une carte qu'on pousse de côté. Trois choses bougent ensemble avec
 * l'avancement du geste — la translation (dans le composant, en `calc(100vw…)`
 * pour survivre à une rotation), l'échelle et le rayon des coins. Les deux
 * dernières sont ici, pures, parce qu'elles se calculent et donc se vérifient.
 *
 * L'origine de la transformation est `0 50%` : la carte rétrécit vers son bord
 * GAUCHE, qui reste donc exactement à `translateX`. C'est ce qui permet de ne
 * pas toucher au calcul de course existant — la bande visible vaut toujours
 * `largeur − NAV_EDGE_BAND` — tout en gagnant les marges haute et basse, qui
 * viennent du 50 % vertical.
 */

/** Échelle de la carte à pleine ouverture. Plus bas = marges plus franches. */
export const NAV_CARD_SCALE = 0.84;

/** Rayon des coins de la carte à pleine ouverture, en px. */
export const NAV_CARD_RADIUS = 28;

/** Ce que le second calque — le « paquet de cartes » — laisse dépasser à gauche. */
export const NAV_STACK_PEEK = 14;

/** Il est un peu plus petit que la carte, sinon on ne lit pas qu'il est derrière. */
export const NAV_STACK_SCALE_DROP = 0.06;

/** Assez présent pour exister sur la nuit, assez discret pour rester un décor. */
export const NAV_STACK_OPACITY = 0.45;

/* ── Le rebond ───────────────────────────────────────────────────────────────
 *
 * La carte arrive en butée avec `--ease-bounce`, une courbe qui dépasse sa
 * cible d'environ 7 % avant d'y retomber. Deux instants comptent, et aucun n'est
 * observable autrement qu'au chronomètre : `transitionend` ne tombe qu'à la fin
 * (trop tard pour le tic) et ne tombe JAMAIS si le geste reprend la main.
 *
 * Les valeurs viennent de la courbe elle-même, pas d'un réglage à l'oreille :
 * `cubic-bezier(0.34, 1.45, 0.64, 1)` sur `--dur-sheet` (280 ms) franchit sa
 * cible vers 115 ms — c'est le contact, donc le tic — et est retombée à 280.
 */

/** Le moment où la carte touche le bout de sa course : c'est là que part le tic. */
export const NAV_BOUNCE_AT = 115;

/** Le rebond est retombé. Le paquet de cartes peut sortir, la carte est posée. */
export const NAV_SETTLE_AT = 300;

/** Un tic un peu plus franc que celui de la prise en main : c'est un impact. */
export const NAV_BOUNCE_HAPTIC_MS = 18;

/** Course maximale du calque écran, en px, pour une largeur de fenêtre donnée. */
export function navMaxShift(width: number): number {
  return Math.max(0, width - NAV_EDGE_BAND);
}

/**
 * Avancement du glissement, borné à [0, 1]. `0` = fermé, `1` = ouvert.
 * Une largeur nulle (rendu serveur, avant le premier `window`) rend 0, ce qui
 * laisse la carte pleine page — l'état de départ, sans écart d'hydratation.
 */
export function navProgress(shift: number, width: number): number {
  const max = navMaxShift(width);
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, shift / max));
}

/** Échelle et rayon de la carte pour un avancement donné. */
export function navCardShape(progress: number): { scale: number; radius: number } {
  const p = Math.max(0, Math.min(1, progress));
  return {
    scale: 1 - (1 - NAV_CARD_SCALE) * p,
    radius: NAV_CARD_RADIUS * p,
  };
}

/**
 * Le second calque. Tant qu'il n'est pas sorti (`out`), il est exactement sous
 * la carte — même translation, même échelle, opacité nulle — donc invisible
 * pendant tout le glissement. Il ne se détache qu'une fois le rebond retombé.
 */
export function navStackShape(
  progress: number,
  out: boolean,
): { scale: number; radius: number; peek: number; opacity: number } {
  const p = Math.max(0, Math.min(1, progress));
  const card = navCardShape(p);
  return {
    scale: card.scale - (out ? NAV_STACK_SCALE_DROP * p : 0),
    radius: card.radius,
    peek: out ? NAV_STACK_PEEK : 0,
    opacity: out ? NAV_STACK_OPACITY : 0,
  };
}
