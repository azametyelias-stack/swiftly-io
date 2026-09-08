import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * Deux carnets d'adresses, pas un (retour terrain d'Elias, 2026-09-08).
 *
 * Le picker « Lié à » d'une dépense affichait les noms saisis pendant un
 * revenu : « qui m'a payé » et « à qui j'ai payé » sont deux questions
 * différentes, elles partageaient la même liste. `people` gagne donc un `kind`,
 * exactement comme `categories`.
 *
 * La route et le hook parlent à Supabase / à React : `node --test` ne peut pas
 * les monter. On verrouille leurs invariants sur la source, comme `tests/pwa`
 * le fait pour `sw.js`.
 */

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");

const MIGRATION = read("supabase/migrations/0007_people_kind.sql");
const ROUTE = read("app/api/people/route.ts");
const HOOK = read("lib/transactions/useTxRefData.ts");
const SCHEMAS = read("lib/validation/schemas.ts");

// ── la colonne ─────────────────────────────────────────────────────────────

test("la migration ajoute kind, borné aux deux types, sans casser l'existant", () => {
  const sql = MIGRATION.replace(/^--.*$/gm, ""); // les commentaires ne comptent pas

  assert.match(sql, /add column if not exists kind text not null default 'expense'/);
  assert.match(sql, /check \(kind in \('expense', 'income'\)\)/);
  // Le picker filtre toujours sur les deux colonnes ensemble.
  assert.match(sql, /on public\.people \(user_id, kind\)/);

  // Rien ne disparaît et aucun lien existant ne bouge : une transaction déjà
  // saisie doit continuer d'afficher le nom auquel elle est rattachée.
  assert.ok(!/delete\s+from/i.test(sql), "la migration ne supprime aucune personne");
  assert.ok(
    !/update\s+public\.transactions/i.test(sql),
    "la migration ne touche à aucun linked_to_id",
  );
});

test("le rattrapage déduit le type de l'usage réel, revenu prioritaire", () => {
  const backfill = MIGRATION.slice(
    MIGRATION.indexOf("update public.people"),
    MIGRATION.indexOf("alter table public.people drop constraint"),
  );
  assert.ok(backfill.length > 0, "le rattrapage doit exister");
  assert.match(backfill, /set kind = 'income'/);
  assert.match(backfill, /t\.linked_to_type = 'person'/);
  assert.match(backfill, /t\.linked_to_id = p\.id/);
  assert.match(backfill, /t\.type = 'income'/);
  // « Lié à » est obligatoire en revenu et facultatif en dépense : une personne
  // présente des deux côtés est presque toujours une source de revenu.
  assert.ok(
    !/set kind = 'expense'/.test(backfill),
    "une personne jamais vue en revenu garde le défaut de la colonne",
  );
});

// ── la route ───────────────────────────────────────────────────────────────

test("GET /api/people filtre par kind, et rend tout sans paramètre", () => {
  const get = ROUTE.slice(ROUTE.indexOf("export const GET"), ROUTE.indexOf("export const POST"));
  assert.match(get, /peopleListQuerySchema/);
  assert.match(get, /if \(kind\) q = q\.eq\("kind", kind\)/);
  // Sans `kind` la liste reste complète : un client servi depuis le cache du
  // service worker ne doit pas se retrouver avec un carnet vide.
  assert.ok(
    !/\.eq\("kind"/.test(get.replace(/if \(kind\) q = q\.eq\("kind", kind\);/, "")),
    "le filtre ne doit pas être inconditionnel",
  );
});

test("POST /api/people écrit le carnet du formulaire ouvert", () => {
  const post = ROUTE.slice(ROUTE.indexOf("export const POST"));
  assert.match(post, /const \{ name, kind \} = await parseJsonBody/);
  assert.match(post, /kind: kind \?\? "expense"/);
});

test("le schéma accepte kind, et le laisse optionnel", () => {
  const schema = SCHEMAS.slice(
    SCHEMAS.indexOf("export const personCreateSchema"),
    SCHEMAS.indexOf("// ── categories"),
  );
  assert.match(schema, /kind: categoryKind\.optional\(\)/);
  assert.match(schema, /\.strict\(\)/);
});

// ── le formulaire ──────────────────────────────────────────────────────────

test("le hook demande et crée dans le bon carnet, et le recharge au changement de type", () => {
  assert.match(HOOK, /apiJson<\{ people: RefNamed\[\] \}>\(`\/api\/people\?kind=\$\{kind\}`\)/);
  const create = HOOK.slice(
    HOOK.indexOf("const createPerson"),
    HOOK.indexOf("const createProject"),
  );
  assert.match(create, /kind: type === "income" \? "income" : "expense"/);
  // sans `type` en dépendance, un wizard rouvert en revenu créerait encore
  // dans le carnet des dépenses
  assert.match(create, /\[type\],/);
});

test("aucun autre appel à /api/people ne contourne le filtre", () => {
  const roots = ["app", "components", "lib"];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(new URL(`../../${dir}/`, import.meta.url), {
      withFileTypes: true,
    })) {
      if (e.isDirectory()) walk(`${dir}/${e.name}`);
      else if (/\.tsx?$/.test(e.name)) {
        const src = read(`${dir}/${e.name}`);
        for (const m of src.matchAll(/["'`]\/api\/people([^"'`]*)["'`]/g)) {
          const isList = !src.slice(m.index).slice(0, 400).includes('method: "POST"');
          if (isList && !m[1].includes("kind=")) offenders.push(`${dir}/${e.name}`);
        }
      }
    }
  };
  for (const r of roots) walk(r);
  assert.deepEqual(offenders, [], "une lecture du carnet oublie le filtre kind");
});
