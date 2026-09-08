import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  NAV_OPEN_ZONE,
  NAV_VERTICAL_RELEASE,
  shouldBlockSystemSwipe,
} from "../../lib/nav/gesture.ts";

/*
 * Le geste « retour arrière » du système part du bord gauche, exactement là où
 * on ouvre le menu, et il gagne — c'est le bug qu'Elias a décrit le 2026-09-07 :
 * « sur le dashboard je veux ouvrir le menu et ça me ramène sur une autre page ».
 *
 * Le neutraliser demande un `preventDefault()` sur `touchmove`, qui empêche
 * aussi de défiler. Toute la finesse est donc là : bloquer assez tôt pour
 * devancer iOS, et pas plus large que nécessaire.
 */

const swipe = (o: Partial<Parameters<typeof shouldBlockSystemSwipe>[0]>) =>
  shouldBlockSystemSwipe({ startX: 0, dx: 0, dy: 0, open: false, ...o });

/* ── ce qu'on prend ──────────────────────────────────────────────────────── */

test("un balayage vers la droite depuis le bord ouvre le menu, jamais l'historique", () => {
  assert.equal(swipe({ startX: 8, dx: 30, dy: 2 }), true);
  assert.equal(swipe({ startX: NAV_OPEN_ZONE, dx: 60, dy: -5 }), true);
});

test("le tout premier pixel est deja bloque", () => {
  // Le point critique : iOS engage sa transition des le premier `touchmove`.
  // Attendre d'etre sur du geste, c'est arriver trop tard.
  assert.equal(swipe({ startX: 5, dx: 1, dy: 0 }), true);
  assert.equal(swipe({ startX: 5, dx: 0, dy: 0 }), true, "meme un contact immobile");
});

test("menu ouvert, le balayage nous appartient d'ou qu'il parte", () => {
  // Refermer se fait vers la gauche, depuis n'importe ou — et pres du bord
  // droit d'iOS c'est le geste « avancer », meme conflit.
  assert.equal(swipe({ startX: 300, dx: -40, dy: 3, open: true }), true);
  assert.equal(swipe({ startX: 8, dx: -40, dy: 3, open: true }), true);
});

/* ── ce qu'on laisse ─────────────────────────────────────────────────────── */

test("un defilement vertical franc rend la main, meme depuis le bord", () => {
  // Sans ca, tirer une liste en partant pres du bord gauche figerait la page :
  // `preventDefault()` sur le premier mouvement supprime aussi le defilement.
  assert.equal(swipe({ startX: 4, dx: 2, dy: 40 }), false);
  assert.equal(swipe({ startX: 4, dx: 2, dy: -40 }), false);
  assert.equal(swipe({ startX: 300, dx: 2, dy: 40, open: true }), false);
});

test("le seuil vertical laisse passer le doigt qui commence a faire defiler", () => {
  // Juste sous le seuil, on garde la main ; juste au-dessus, on la rend.
  assert.equal(swipe({ startX: 4, dx: 0, dy: NAV_VERTICAL_RELEASE }), true);
  assert.equal(swipe({ startX: 4, dx: 0, dy: NAV_VERTICAL_RELEASE + 1 }), false);
  // Un diagonal ou l'horizontal domine reste a nous, quelle que soit l'ampleur.
  assert.equal(swipe({ startX: 4, dx: 40, dy: 30 }), true);
});

test("hors de la zone d'ouverture, menu ferme, on ne touche a rien", () => {
  // La suppression par glissement de SCREEN-6 part du milieu d'une ligne : ce
  // geste ne doit pas etre neutralise par la coquille de navigation.
  assert.equal(swipe({ startX: NAV_OPEN_ZONE + 1, dx: -60, dy: 2 }), false);
  assert.equal(swipe({ startX: 200, dx: 60, dy: 2 }), false);
});

/* ── le branchement, qui ne se teste pas autrement ───────────────────────── */

const NAV_SHELL = readFileSync(
  fileURLToPath(new URL("../../components/nav/NavShell.tsx", import.meta.url)),
  "utf8",
);

test("l'ecouteur touchmove est NON passif, sinon rien de tout ceci ne sert", () => {
  // `onTouchMove` en JSX est passif : `preventDefault()` y est ignore (avec un
  // avertissement en console) et le geste systeme passe quand meme. D'ou
  // l'ecouteur pose a la main. C'est la ligne qui fait marcher la correction.
  assert.match(
    NAV_SHELL,
    /addEventListener\("touchmove", onTouchMove, \{ passive: false \}\)/,
    "touchmove doit etre enregistre avec { passive: false }",
  );
  assert.ok(
    !/onTouchMove=\{/.test(NAV_SHELL),
    "pas de onTouchMove en JSX : il serait passif et donc inoperant",
  );
  assert.match(NAV_SHELL, /e\.cancelable/, "ne pas appeler preventDefault sur un evenement fige");
});

test("le tic haptique part quand le glissement est reconnu", () => {
  const active = NAV_SHELL.indexOf("g.active = true;");
  assert.ok(active > -1);
  const after = NAV_SHELL.slice(active, active + 400);
  assert.match(after, /haptic\(\)/, "un tic au moment ou le tiroir prend le doigt");
});
