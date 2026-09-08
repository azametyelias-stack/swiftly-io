import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * Le bouton figé, et le haut de la feuille blanche.
 *
 * Retour terrain du 2026-09-08, deux choses distinctes sur la même image :
 *
 *  1. Le bouton « Nouvelle transaction » se figeait CONTRE le haut de l'écran.
 *     La barre d'état est translucide (la page court dessous, l'heure et la
 *     batterie s'affichent en blanc) : le bouton, blanc lui aussi, venait s'y
 *     mêler. Il se fige maintenant sous la barre, et un cadre sombre garde ce
 *     bandeau lisible une fois la photo de nuit défilée.
 *
 *  2. La feuille blanche passait sous le bouton et ses deux angles arrondis
 *     disparaissaient — il restait une arête droite. Le haut arrondi est
 *     désormais épinglé avec le bouton et le contenu défile derrière.
 *
 * Du React et du CSS qu'un `node --test` ne monte pas : on vérifie la source,
 * comme `tests/pwa` le fait pour `sw.js`. La géométrie, elle, a été mesurée dans
 * un vrai Chrome avec une encoche simulée (scratchpad/cdp-sticky.mjs).
 */

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");

const VIEW = read("components/dashboard/DashboardView.tsx");
const CSS = read("app/globals.css");

/* ── 1. la barre d'état ──────────────────────────────────────────────────── */

test("la hauteur de la barre d'état est un jeton, pas un env() recopié", () => {
  // Nommer la valeur permet aussi à une page de test de la forcer sur une
  // machine sans encoche — c'est comme ça que la géométrie a été vérifiée.
  assert.match(CSS, /--sf-safe-top: env\(safe-area-inset-top, 0px\);/);
});

test("le bouton se fige sous la barre d'état, pas contre le haut de l'écran", () => {
  assert.match(
    VIEW,
    /top: "max\(var\(--sf-safe-top\), var\(--sf-offline-bar, 0px\)\)"/,
    "la bande doit s'arrêter sous l'encoche",
  );
  assert.ok(
    !/className="sticky top-0 z-20/.test(VIEW),
    "plus de collage contre le bord haut",
  );
});

test("le bandeau hors ligne l'emporte quand il est là", () => {
  // Il devient lui-même le haut de l'écran et peint l'encoche : s'y ajouter
  // laisserait une bande morte entre les deux.
  const top = VIEW.match(/top: "max\([^"]+\)"/)?.[0] ?? "";
  assert.ok(top.includes("--sf-offline-bar"), "le bandeau doit entrer dans le calcul");
  assert.ok(top.includes("max("), "le plus haut des deux gagne, ils ne s'additionnent pas");
});

test("le cadre de la barre d'état ne pousse rien et ne se fige pas en `fixed`", () => {
  // Le balisage seul, sans le commentaire qui l'explique — celui-ci prononce le
  // mot « fixed » pour dire pourquoi on ne l'emploie pas.
  const frame = VIEW.slice(VIEW.indexOf('aria-hidden="true"'), VIEW.indexOf("Night hero"));
  // `fixed` serait piégé par le translate permanent de NavShell : il défilerait
  // avec la page au lieu de rester en haut.
  assert.match(frame, /className="pointer-events-none sticky top-0 z-0"/);
  // Même matière que la bande du bouton, sinon une couture apparaît sous
  // l'horloge : un aplat `--brand-deep` est plus clair que photo + voile.
  assert.match(frame, /url\(\/brand\/nuit\.jpg\)/);
  assert.match(frame, /rgba\(6,10,60,0\.72\)/);
  assert.ok(!/fixed/.test(frame), "un ancêtre transformé enfermerait un `fixed`");
  // Marge négative = il n'occupe aucune place : rien ne bouge en haut de page.
  assert.match(frame, /marginBottom: "calc\(-1 \* var\(--sf-safe-top\)\)"/);
  assert.match(frame, /height: "var\(--sf-safe-top\)"/);
  assert.match(frame, /aria-hidden="true"/, "décor pur : pas de contenu annoncé");
});

/* ── 2. les deux angles arrondis ─────────────────────────────────────────── */

test("le haut arrondi de la feuille est épinglé avec le bouton", () => {
  const band = VIEW.slice(
    VIEW.indexOf('className="sticky z-20 overflow-hidden"'),
    VIEW.indexOf("White panel"),
  );
  assert.ok(band.length > 0, "la bande collante doit exister");
  assert.match(
    band,
    /h-\[var\(--radius-content-top\)\] rounded-t-\[var\(--radius-content-top\)\] bg-surface-card/,
    "la lèvre : hauteur = rayon, pour que l'arc s'achève sur son bord",
  );
  assert.ok(
    band.indexOf("newTransaction") < band.indexOf("rounded-t-[var(--radius-content-top)]"),
    "la lèvre vient après le bouton, donc elle recouvre son ombre",
  );
});

test("la feuille ne porte plus son propre arrondi — sinon il y en aurait deux", () => {
  const panel = VIEW.slice(VIEW.indexOf("White panel"));
  assert.ok(
    !/rounded-t-\[var\(--radius-content-top\)\]/.test(panel),
    "deux arcs superposés se décalent et laissent un ressaut sur les côtés",
  );
  assert.match(panel, /className="bg-surface-card px-4 pb-24 pt-0 text-text-primary"/);
});

test("le blanc de la feuille se peint SOUS le cadre de la barre d'état", () => {
  /*
   * L'ordre de peinture est le vrai piège de cet écran, et il tient à trois
   * pièces qui se croisent en haut :
   *
   *   coquille de nuit  >  cadre  >  feuille blanche
   *
   * — la coquille au-dessus du cadre, sinon un aplat sombre remplacerait le
   *   dégradé sous l'horloge en haut de page ;
   * — le cadre au-dessus de la feuille, sinon le blanc repasse sous l'heure une
   *   fois défilé : le bug d'Elias, simplement déplacé.
   *
   * On l'obtient sans z-index : la feuille n'est PAS positionnée (elle se peint
   * dans le fond), le cadre l'est (donc au-dessus), et la coquille l'est aussi
   * mais vient après dans le DOM (donc au-dessus du cadre). Remettre `relative`
   * ou un `z-` sur la feuille casse la chaîne en silence — d'où ce test.
   */
  const panel = VIEW.slice(VIEW.indexOf("White panel"));
  const wrapper = panel.slice(panel.indexOf("<div className="), panel.indexOf(">") + 1);
  assert.match(wrapper, /<div className="bg-brand-deep">/, "la feuille doit rester non positionnée");
  assert.ok(!/relative|z-\d|sticky|absolute/.test(wrapper), wrapper);

  // Et la coquille de nuit doit rester sans z-index : lui en donner créerait un
  // contexte d'empilement qui enfermerait le menu déroulant (z-30) sous la
  // bande du bouton (z-20).
  const hero = VIEW.slice(VIEW.indexOf("Night hero"), VIEW.indexOf("Night hero") + 200);
  assert.match(hero, /<div className="relative overflow-hidden text-ink-on-surface">/);
});

test("aucun conteneur défilant imbriqué n'a été introduit", () => {
  // Deux zones de défilement se voleraient le doigt : posé sur la feuille, le
  // geste ne ferait plus jamais défiler la coquille de nuit.
  assert.ok(!/overflow-y-(auto|scroll)/.test(VIEW));
  assert.match(VIEW, /A single natural page scroll \(no nested scroll containers\)/);
});

test("l'encoche a un seul nom dans toute l'app", () => {
  // Le bandeau hors ligne peint lui aussi la barre d'état. Tant qu'il lisait
  // `env()` en direct pendant que la bande lisait le jeton, les deux pouvaient
  // diverger — et le `max()` ci-dessus comparait deux valeurs qui ne parlaient
  // pas de la même chose.
  const banner = read("components/offline/OfflineBanner.tsx");
  assert.match(banner, /calc\(var\(--sf-safe-top\) \+ \$\{BAR_ROW_PX\}px\)/);
  assert.ok(
    !/env\(safe-area-inset-top\)/.test(banner),
    "l'encoche se lit par son jeton, pas par un env() recopié",
  );
});
