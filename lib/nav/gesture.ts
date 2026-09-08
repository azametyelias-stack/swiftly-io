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

/** Bande du calque écran qui reste visible quand le menu est ouvert. */
export const NAV_EDGE_BAND = 52;

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
