"use client";

/**
 * Un tic haptique — le petit retour physique quand un geste est reconnu.
 *
 * Deux plateformes, deux réalités :
 *
 *  - **Android / Chrome** : `navigator.vibrate()`, l'API standard. Elle marche,
 *    à une condition — le navigateur exige que la page ait déjà reçu un geste
 *    de l'utilisateur, ce qui est toujours le cas ici puisqu'on l'appelle
 *    PENDANT un geste.
 *  - **iOS / Safari** : l'API Vibration n'existe pas, et Apple ne l'implémente
 *    pas. `navigator.vibrate` y est `undefined`. Le seul retour haptique qu'une
 *    page web peut déclencher passe par un contrôle système : depuis Safari
 *    17.4, un `<input type="checkbox" switch>` joue le tic de l'interrupteur
 *    iOS quand il bascule. On en garde donc un, hors écran, et on le bascule.
 *
 * Ce second chemin est un détournement, pas une API. Il est isolé ici, derrière
 * une détection de fonctionnalité, et le jour où Apple change quelque chose la
 * seule conséquence est l'absence de vibration — jamais une erreur.
 *
 * ---- ce jour est arrivé (constaté le 2026-09-12) ----
 *
 * Elias ne sentait rien sur son iPhone. Ce n'est pas un bug d'ici : iOS 26.5 a
 * fermé le chemin PROGRAMMÉ. Le tic ne part plus que si le doigt tombe pour de
 * vrai sur l'interrupteur (`isTrusted`), ce qui exclut par construction tout
 * retour différé — le nôtre arrive 115 ms après le relâchement, sur le rebond.
 * Toutes les bibliothèques du domaine documentent la même chose : iOS 17.4 →
 * 26.4 d'accord, 26.5 et au-delà, un seul tic et seulement sous le doigt.
 *   https://haptics.kushagragolash.dev/ · https://github.com/tijnjh/ios-haptics
 *
 * On garde donc ce chemin — il sert encore les iPhone restés en deçà de 26.5,
 * et Android ne l'a jamais emprunté — mais on ne lui demande plus l'impossible.
 * Deux choses en dépendaient vraiment et ont été corrigées :
 *
 *  - le contrôle était créé au PREMIER besoin, c'est-à-dire au milieu du geste.
 *    Créer un élément et le cliquer dans la même image ne laisse pas à WebKit
 *    le temps de le poser : pas de rendu, pas d'animation, donc pas de tic. Il
 *    est désormais monté à l'avance (`primeHaptics`), au repos ;
 *  - si rien ne vibre nulle part, c'est d'abord à vérifier côté téléphone :
 *    Réglages → Sons et retour haptique → « Retour haptique du système ».
 */

/** Durée du tic sur les plateformes qui prennent une durée. Court : un accusé, pas une alerte. */
export const HAPTIC_TICK_MS = 12;

/** Le contrôle système gardé hors écran pour iOS. Créé au premier besoin. */
let switchLabel: HTMLLabelElement | null = null;
let switchUnavailable = false;

/**
 * `lib.dom` type ici `vibrate(pattern: Iterable<number>)`, alors que la spec et
 * toutes les implémentations acceptent aussi une durée simple. On décrit donc
 * la signature réelle plutôt que d'emballer un entier dans un tableau.
 */
type Vibrating = { vibrate?: (pattern: number | number[]) => boolean };

function vibrate(ms: number): boolean {
  if (typeof navigator === "undefined") return false;
  const api = (navigator as unknown as Vibrating).vibrate;
  if (typeof api !== "function") return false;
  try {
    // `vibrate` rend `false` quand le navigateur refuse (onglet caché, réglage
    // système) — on ne se rabat pas pour autant : l'API existe, c'est Android,
    // et le chemin iOS n'y ferait rien de plus.
    api.call(navigator, ms);
    return true;
  } catch {
    return false;
  }
}

function iosSwitch(): HTMLLabelElement | null {
  if (switchLabel) return switchLabel;
  if (switchUnavailable) return null;

  // Safari 17.4+ reflète l'attribut `switch` sur le prototype. Ailleurs —
  // Chrome, Firefox, iOS plus ancien — la propriété n'existe pas et on
  // s'abstient plutôt que d'injecter un élément inutile dans le DOM.
  if (typeof HTMLInputElement === "undefined" || !("switch" in HTMLInputElement.prototype)) {
    switchUnavailable = true;
    return null;
  }

  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  // Rendu, mais invisible et intouchable. Pas `display:none` : un contrôle qui
  // n'est pas dans le rendu ne s'anime pas, et sans animation pas de tic.
  label.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);

  switchLabel = label;
  return label;
}

/**
 * Monte le contrôle iOS à l'avance, hors de tout geste.
 *
 * À appeler une fois, au montage de la coquille. Le créer au premier tic
 * revenait à demander à WebKit d'animer un élément qu'il n'a pas encore posé :
 * le tout premier retour était perdu, et c'est justement celui-là qu'on sent.
 * Sans effet là où la Vibration API existe, et sans effet deux fois.
 */
export function primeHaptics(): void {
  if (typeof window === "undefined") return;
  try {
    iosSwitch();
  } catch {
    /* rien à préparer sur cette plateforme */
  }
}

/**
 * Joue un tic. Ne rend rien, ne jette jamais : une vibration est un agrément,
 * son absence ne doit interrompre aucun geste.
 */
export function haptic(ms: number = HAPTIC_TICK_MS): void {
  if (typeof window === "undefined") return;
  if (vibrate(ms)) return;
  try {
    iosSwitch()?.click();
  } catch {
    /* pas de haptique sur cette plateforme — le geste marche pareil */
  }
}
