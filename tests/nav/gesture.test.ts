import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  NAV_CARD_RADIUS,
  NAV_CARD_SCALE,
  NAV_EDGE_BAND,
  NAV_OPEN_ZONE,
  NAV_STACK_PEEK,
  NAV_VERTICAL_RELEASE,
  navCardShape,
  navMaxShift,
  navProgress,
  navStackShape,
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

/* ── la carte : forme, pile, rebond ──────────────────────────────────────────
 *
 * Le menu n'est plus un tiroir sous une page qui glisse : la page DEVIENT une
 * carte — elle rétrécit, s'arrondit, rebondit en butée, et un second calque se
 * détache derrière elle. Trois choses s'y cassent en silence, donc trois
 * familles de tests : la géométrie (ici, elle est pure), l'invariant qui
 * garantit que le paquet de cartes ne dépasse pas avant l'heure, et le
 * branchement, qui ne se lit que dans la source.
 */

test("la course ne depend pas de l'echelle : la bande visible reste la bande", () => {
  // Tout tient a l'origine `0 50%` : la carte retrecit vers son bord GAUCHE,
  // qui reste donc pose a `translateX`. C'est ce qui permet d'ajouter l'echelle
  // sans retoucher au calcul de course du geste, teste plus haut.
  assert.equal(navMaxShift(390), 390 - NAV_EDGE_BAND);
  assert.equal(navMaxShift(0), 0, "avant le premier `window`, pas de course");
  assert.equal(navMaxShift(40), 0, "jamais de course negative");
});

test("l'avancement est borne, et nul tant qu'on ne connait pas la fenetre", () => {
  assert.equal(navProgress(0, 390), 0);
  assert.equal(navProgress(290, 390), 1);
  assert.equal(navProgress(9999, 390), 1, "borne haute");
  assert.equal(navProgress(-50, 390), 0, "borne basse");
  // Rendu serveur : largeur inconnue. Rendre 0 laisse la carte pleine page,
  // c'est-a-dire l'etat de depart — donc aucun ecart d'hydratation.
  assert.equal(navProgress(100, 0), 0);
});

test("ferme, la carte est exactement ce qu'elle a toujours ete", () => {
  // La regression qui couterait le plus cher : une echelle ou un rayon qui
  // traine a l'etat de repos deformerait les 22 ecrans en permanence.
  const at_rest = navCardShape(0);
  assert.equal(at_rest.scale, 1);
  assert.equal(at_rest.radius, 0);
});

test("ouverte, la carte porte l'echelle et le rayon pleins", () => {
  const open = navCardShape(1);
  assert.equal(open.scale, NAV_CARD_SCALE);
  assert.equal(open.radius, NAV_CARD_RADIUS);
  // Et entre les deux, ca suit le doigt sans a-coup.
  assert.ok(navCardShape(0.5).scale > open.scale);
  assert.ok(navCardShape(0.5).scale < 1);
});

test("le paquet de cartes est INVISIBLE tant qu'il n'est pas sorti", () => {
  // L'invariant du glissement. Range, le second calque doit porter exactement
  // la transformation de la carte : au moindre ecart, un liseré clair
  // depasserait a gauche pendant toute la course, au lieu de sortir apres le
  // rebond comme il est cense le faire.
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    const card = navCardShape(p);
    const stack = navStackShape(p, false);
    assert.equal(stack.scale, card.scale, `echelle a ${p}`);
    assert.equal(stack.radius, card.radius, `rayon a ${p}`);
    assert.equal(stack.peek, 0, `depassement a ${p}`);
    assert.equal(stack.opacity, 0, `opacite a ${p}`);
  }
});

test("sorti, il depasse a gauche et il est plus petit", () => {
  const card = navCardShape(1);
  const stack = navStackShape(1, true);
  assert.equal(stack.peek, NAV_STACK_PEEK);
  assert.ok(stack.opacity > 0);
  assert.ok(stack.scale < card.scale, "plus petit, sinon on ne lit pas qu'il est derriere");
});

/**
 * La source debarrassee de ses commentaires.
 *
 * Les deux tests qui suivent disent ce que le code NE fait PAS — et le mot en
 * question apparait justement dans l'explication ecrite juste a cote. Sans ce
 * nettoyage, ils echouent sur leur propre justification.
 */
const CODE = NAV_SHELL.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/* ── le branchement du rebond ─────────────────────────────────────────────── */

test("le tic du rebond part au CONTACT, pas a la fin de l'animation", () => {
  // `transitionend` serait le reflexe : il tombe trop tard (la carte est deja
  // retombee) et ne tombe pas du tout si le doigt reprend la main en cours de
  // route — le paquet de cartes resterait alors dehors pour toujours.
  assert.match(
    NAV_SHELL,
    /setTimeout\(\s*\(\) => haptic\(NAV_BOUNCE_HAPTIC_MS\),\s*reduced \? 0 : NAV_BOUNCE_AT/,
    "le tic doit etre programme sur NAV_BOUNCE_AT",
  );
  assert.ok(
    !/transitionend/.test(CODE),
    "pas de transitionend : il ne tombe pas quand le geste reprend la main",
  );
});

test("le controle haptique d'iOS est monte au repos, pas pendant le geste", () => {
  // Le creer au premier tic revenait a demander a WebKit d'animer un element
  // qu'il n'a pas encore pose : pas de rendu, pas d'animation, pas de tic. Et
  // c'est le PREMIER qu'on perdait — justement celui qu'on sent.
  //
  // (Le chemin lui-meme ne vaut plus que pour iOS 17.4 a 26.4 et pour Android :
  // iOS 26.5 a ferme le declenchement programme. Voir lib/ui/haptics.ts.)
  assert.match(NAV_SHELL, /primeHaptics\(\);/);
  const HAPTICS = readFileSync(
    fileURLToPath(new URL("../../lib/ui/haptics.ts", import.meta.url)),
    "utf8",
  );
  assert.match(HAPTICS, /export function primeHaptics/);
});

test("le rebond ne sert qu'a l'ouverture", () => {
  // A la fermeture, un depassement tirerait la carte AU-DELA du bord gauche et
  // laisserait voir le menu a droite pendant quelques images.
  assert.match(NAV_SHELL, /open \? "var\(--ease-bounce/);
  const css = readFileSync(
    fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
    "utf8",
  );
  assert.match(css, /--ease-bounce:\s*cubic-bezier/);
});

test("la carte retrecit vers son bord gauche, aux deux calques", () => {
  const origines = NAV_SHELL.match(/transformOrigin: "0 50%"/g) ?? [];
  assert.equal(origines.length, 2, "la carte ET le paquet, sinon ils se decalent");
});

/* ── la carte est une carte, meme sur une page longue ─────────────────────── */

test("la carte est ramenee a la hauteur de l'ecran pendant que le menu se montre", () => {
  // C'etait le defaut signale par Elias le 2026-09-12 : sur le dashboard et les
  // statistiques, le calque fait la hauteur du CONTENU — deux ou trois mille
  // pixels. Reduit de 16 % autour de son propre centre, il deborde encore en
  // haut comme en bas : on voyait une page decalee, jamais une carte. Les
  // ecrans courts, eux, en formaient une parfaitement.
  assert.match(NAV_SHELL, /height: showing \? "100dvh" : undefined/);
  assert.match(NAV_SHELL, /overflow: showing \? "hidden" : undefined/);
});

test("ni hauteur figee ni rognage au repos", () => {
  // Une carte figee a la hauteur de l'ecran ne defilerait plus, et un
  // `overflow` permanent couperait ce qui deborde legitimement d'un ecran —
  // les menus deroulants ouverts par-dessus le contenu (regle du 2026-09-04).
  // Les deux sont donc portes par `showing`, jamais poses en dur.
  assert.ok(!/overflow-hidden/.test(CODE), "pas de rognage permanent par classe");
  // Une seule occurrence, donc celle du test precedent — qui est conditionnelle.
  assert.equal((CODE.match(/100dvh/g) ?? []).length, 1);
});

test("le gel rend la page ou elle en etait, et sans animation", () => {
  // `<html>` porte `scroll-smooth` : sans `instant`, la remise en place
  // s'ANIMERAIT — la page se remettrait a defiler toute seule sous les yeux,
  // une demi-seconde apres la fermeture.
  assert.match(CODE, /card\.scrollTop = y/);
  const rendus = CODE.match(/behavior: "instant"/g) ?? [];
  assert.equal(rendus.length, 2, "au gel comme au degel");
});

test("le defilement gele n'est jamais rendu a un autre ecran", () => {
  // On tape une entree du menu : la carte est encore gelee quand le nouvel
  // ecran s'y rend. Lui appliquer le defilement de l'ancien l'ouvrirait en son
  // milieu.
  assert.match(CODE, /was\.path === pathname/);
  assert.match(CODE, /before\.path === pathname \? before\.y : 0/);
});

test("le defilement est lu AVANT le gel, dans un gestionnaire", () => {
  // Une fois le rendu du gel passe, le document s'est raccourci et `scrollY`
  // est deja retombe a zero : il n'y a plus rien a lire.
  const down = CODE.indexOf("const onPointerDown");
  assert.ok(down > 0);
  assert.match(CODE.slice(down, down + 400), /rememberScroll\(\)/);
  assert.match(CODE, /const openMenu = useCallback\(\(\) => \{\s*rememberScroll\(\);/);
});

test("le voile de fermeture suit la carte gelee", () => {
  // La carte est alors un conteneur de defilement cale plus bas dans son
  // contenu : un `absolute inset-0` se poserait sur le HAUT de ce contenu,
  // donc hors de l'ecran, et plus rien ne refermerait au toucher.
  assert.match(CODE, /className="fixed inset-0 z-20 cursor-pointer/);
});

test("le paquet de cartes ne prend jamais le doigt", () => {
  assert.match(NAV_SHELL, /pointer-events-none[\s\S]{0,80}z-\[5\]/);
});

/* ── le menu, devenu le sol ──────────────────────────────────────────────── */

const DRAWER = readFileSync(
  fileURLToPath(new URL("../../components/nav/MenuDrawer.tsx", import.meta.url)),
  "utf8",
);

test("le menu est blanc, et la carte reste lisible dessus", () => {
  // Choix d'Elias, 2026-09-12 : plus de photo de nuit sous le menu. C'est
  // `--surface-elev` (#FFFFFF), le jeton dit « modal sheets, drawer », et non
  // `--surface-page` (#EBEBEF) qui est la couleur de la CARTE — les deux au
  // meme gris, il n'y aurait plus de carte, juste une ombre portee.
  assert.match(DRAWER, /bg-surface-elev/);
  assert.ok(!/nuit\.jpg/.test(DRAWER), "la photo de nuit est partie");
  assert.ok(!/bg-surface-page/.test(DRAWER), "le menu ne prend pas la couleur de la carte");
});

test("le blanc va jusqu'en haut, barre d'etat comprise", () => {
  // J'avais pose la le bandeau `--brand-deep` d'`AppHeader` : en
  // `black-translucent`, iOS peint l'heure et la batterie en BLANC, en dur (il
  // n'adapte les glyphes au fond que dans Safari, jamais en app installee).
  // Elias l'a tranche le 2026-09-12 en connaissance de cause — il prefere le
  // menu d'un seul tenant, et assume l'heure eventuellement illisible.
  //
  // Ce test existe pour que personne ne le « repare » : c'est une decision,
  // pas un oubli.
  assert.ok(!/bg-brand-deep/.test(DRAWER), "aucun bandeau sombre dans le menu");
  // La marge d'encoche reste, elle : c'est elle qui degage le contenu.
  assert.match(DRAWER, /pt-\[calc\(env\(safe-area-inset-top\)\+20px\)\]/);
});

test("la marge du menu suit la bande, elle n'est pas recopiee", () => {
  // Les deux valeurs doivent bouger ensemble : une bande elargie sans marge
  // elargie, et les libelles passent sous la carte.
  assert.match(DRAWER, /NAV_EDGE_BAND/);
  assert.ok(!/\b52px\b/.test(DRAWER), "plus de 52 code en dur");
});

test("l'entree courante se signale par un point et l'opacite", () => {
  // Decision d'Elias (2026-09-11) : plus de pilules. Sur une photo, un contour
  // par entree fait une grille de cages.
  assert.match(DRAWER, /aria-current=\{isActive \? "page" : undefined\}/);
  assert.match(DRAWER, /opacity-55/);
  // Portee a la LIGNE du menu, pas au fichier : les deux boutons de tete, eux,
  // ont bien un contour — c'est la pastille commune a toute l'app.
  const ligne = DRAWER.slice(DRAWER.indexOf("aria-current"), DRAWER.indexOf('].join(" ")'));
  assert.ok(ligne.length > 0 && !/border/.test(ligne), "les pilules sont parties");
});
