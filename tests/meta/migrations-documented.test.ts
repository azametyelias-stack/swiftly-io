import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Le tableau des migrations de `supabase/README.md` doit citer chaque fichier.
 *
 * Il s'était arrêté à 0004 : 0005, 0006 et 0007 avaient été écrites sans que
 * personne ne le remarque. Ce n'est pas de la cosmétique — c'est ce tableau
 * qu'on lit pour savoir laquelle des migrations réécrit des données et laquelle
 * peut être rejouée sans dommage. Une ligne manquante, et on rejoue une
 * migration qui reclasse des lignes en production.
 */
const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

const files = readdirSync(repo("supabase/migrations/"))
  .filter((f) => f.endsWith(".sql"))
  .sort();

const readme = readFileSync(repo("supabase/README.md"), "utf8");

test("there is at least one migration to document", () => {
  assert.ok(files.length > 0, "no .sql files in supabase/migrations/");
});

for (const file of files) {
  test(`${file} is listed in supabase/README.md`, () => {
    assert.ok(
      readme.includes(file),
      `\`${file}\` is missing from the migrations table in supabase/README.md`,
    );
  });
}

test("every migration filename starts with the number the ledger indexes it by", () => {
  const seen = new Set<string>();
  for (const file of files) {
    const version = file.match(/^(\d+)_/)?.[1];
    assert.ok(version, `\`${file}\` must be named 000N_something.sql`);
    assert.ok(!seen.has(version), `two migrations share the version ${version}`);
    seen.add(version);
  }
});
