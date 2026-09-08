import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * L'appui long de SCREEN-14 § 6 (« Modifier / Supprimer / Ouvrir »).
 *
 * Ces trois composants sont du React qu'un `node --test` ne peut pas monter :
 * on verifie leurs invariants sur la source, comme `tests/pwa` le fait pour
 * `sw.js`. Le comportement lui-meme a ete verifie dans un vrai Chrome
 * (scratchpad/cdp-templates.mjs, 10/10 : appui long, menu, edition).
 */

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");

const ROW = read("components/ui/SwipeToDelete.tsx");
const SHEET = read("components/ui/ActionSheet.tsx");
const SCREEN = read("components/templates/TemplatesScreen.tsx");

/* ── la ligne ────────────────────────────────────────────────────────────── */

test("l'appui long n'est arme que si l'ecran le demande", () => {
  // `SwipeToDelete` sert aussi aux Budgets, Projets et Comptes : sans
  // `onLongPress`, ces ecrans doivent garder exactement le comportement d'avant.
  assert.match(ROW, /onLongPress\?: \(\) => void;/);
  assert.match(ROW, /if \(!onLongPress\) return;/, "pas de minuteur sans appelant");
  assert.match(
    ROW,
    /onLongPress \? "select-none \[-webkit-touch-callout:none\]" : ""/,
    "la selection de texte n'est coupee que la ou le menu existe",
  );
});

test("le maintien du doigt ne declenche plus la selection de texte d'iOS", () => {
  // Le symptome de la capture du 2026-09-08 : deux poignees bleues sur
  // « DEPENSE » au lieu du menu. iOS repondait au maintien avant nous.
  assert.match(ROW, /select-none/);
  assert.match(ROW, /-webkit-touch-callout:none/);
  assert.match(ROW, /onContextMenu=\{onLongPress \? \(e\) => e\.preventDefault\(\)/);
});

test("un glissement annule l'appui long, dans les deux axes", () => {
  // Sans l'axe vertical, faire defiler la liste en posant le doigt sur une
  // ligne ouvrirait le menu au bout de 450 ms.
  assert.match(ROW, /Math\.abs\(delta\) > LONG_PRESS_SLOP/);
  assert.match(ROW, /Math\.abs\(e\.clientY - startY\.current\) > LONG_PRESS_SLOP/);
  assert.match(ROW, /const settle = \(\) => \{\s*cancelLongPress\(\);/);
});

test("l'appui long neutralise le tap qui suit", () => {
  // Sinon la levee du doigt lancerait la transaction derriere le menu.
  const timer = ROW.slice(ROW.indexOf("longPressTimer.current = setTimeout"));
  assert.ok(
    timer.indexOf("moved.current = true") < timer.indexOf("onLongPress()"),
    "moved doit etre pose avant d'ouvrir le menu",
  );
});

test("un appui long en cours ne survit pas au demontage de la ligne", () => {
  assert.match(ROW, /useEffect\(\(\) => cancelLongPress, \[\]\)/);
});

/* ── la feuille d'actions ────────────────────────────────────────────────── */

test("la feuille exige un vrai appui, pas le clic fantome de la levee du doigt", () => {
  // Attrape dans Chrome : la feuille s'ouvre pendant que le doigt est pose ; au
  // relachement, le `click` tombe sur la nappe qui vient d'apparaitre dessous.
  // Sans garde, le menu se refermait dans l'instant.
  assert.match(SHEET, /const armed = useRef\(false\)/);
  assert.match(SHEET, /onPointerDownCapture=\{\(\) => \{\s*armed\.current = true;/);
  for (const call of ["onCancel()", "action.onSelect()"]) {
    assert.ok(
      SHEET.includes(`armed.current && ${call}`),
      `${call} doit exiger un pointerdown prealable`,
    );
  }
});

/* ── l'ecran ─────────────────────────────────────────────────────────────── */

test("le menu propose les trois actions du document, la destructrice en dernier", () => {
  const menu = SCREEN.slice(SCREEN.indexOf("{menuFor ? ("), SCREEN.indexOf("{pendingDelete ? ("));
  assert.ok(menu, "l'ecran doit rendre une ActionSheet");
  const order = ["t.menuOpen", "m.common.edit", "m.common.delete"];
  let cursor = -1;
  for (const label of order) {
    const at = menu.indexOf(label);
    assert.ok(at > cursor, `${label} doit venir apres ${order[order.indexOf(label) - 1] ?? "le debut"}`);
    cursor = at;
  }
  assert.match(menu, /tone: "danger"/, "Supprimer doit etre marque destructeur");
  assert.match(menu, /title=\{menuFor\.name\}/, "titre par le nom du template");
});

test("« Lancer » et le tap simple mènent au meme endroit", () => {
  // Doc § 6 : « Ouvrir (= tap) ». Une seule fonction, pas deux chemins qui
  // pourraient diverger.
  assert.match(SCREEN, /const launch = \(tpl: TemplateListItem\) =>/);
  assert.match(SCREEN, /onOpen=\{\(\) => launch\(tpl\)\}/);
  const menu = SCREEN.slice(SCREEN.indexOf("{menuFor ? ("));
  assert.match(menu, /launch\(tpl\)/);
});

test("la modification passe par le payload filtre", () => {
  // La regression du 2026-09-08 : sans ca, `kind` part dans le PATCH et le
  // schema strict le refuse. Voir tests/templates/model.test.ts.
  assert.match(SCREEN, /updateTemplateRequest\(editing\.id, templateUpdatePayload\(payload\)\)/);
});
