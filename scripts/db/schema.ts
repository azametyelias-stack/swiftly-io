/**
 * Empreinte du schéma, et comparaison entre deux bases.
 *
 *   node scripts/db/schema.ts --snapshot                     → .temp/schema-dev-<ref>.json
 *   node scripts/db/schema.ts --snapshot --target prod       → .temp/schema-prod-<ref>.json
 *   node scripts/db/schema.ts --diff dev prod                compare les deux
 *
 * La base de dev ne sert à rien si elle n'est pas la jumelle de la production.
 * Rejouer les migrations donne le schéma que DÉCRIT le dépôt — pas forcément
 * celui que la production PORTE : deux ans de SQL Editor laissent des traces
 * (un index posé à la main, une contrainte relâchée un soir de panne, une
 * colonne ajoutée puis oubliée du dépôt). Tester la migration multi-espaces sur
 * une jumelle approximative, c'est tester autre chose.
 *
 * Ce script lit `information_schema` et `pg_catalog` — uniquement des SELECT,
 * y compris quand il vise la production.
 *
 * `public.schema_migrations` est exclue : c'est l'outillage de migrate.ts, pas
 * du schéma applicatif, et elle n'apparaît pas des deux côtés au même moment.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import type pg from "pg";

import { parseArgs, resolveTarget, describeTarget, ROOT, type TargetName } from "./env.ts";
import { openClient } from "./client.ts";

const args = parseArgs(process.argv.slice(2));
const OUT_DIR = `${ROOT}supabase/.temp/`;

const EXCLUDED_TABLES = ["schema_migrations"];

interface SchemaSnapshot {
  readonly takenAt: string;
  readonly projectRef: string;
  readonly columns: readonly string[];
  readonly constraints: readonly string[];
  readonly indexes: readonly string[];
  readonly policies: readonly string[];
  readonly rls: readonly string[];
  readonly routines: readonly string[];
  readonly triggers: readonly string[];
}

async function capture(client: pg.Client, projectRef: string): Promise<SchemaSnapshot> {
  const excluded = EXCLUDED_TABLES;

  const q = async (sql: string, params: unknown[] = []): Promise<string[]> => {
    const { rows } = await client.query<{ line: string }>(sql, params);
    return rows.map((r) => r.line);
  };

  // Chaque objet devient UNE ligne de texte normalisée. Comparer des chaînes
  // triées rend le diff lisible par un humain, ce qu'un diff de JSON imbriqué
  // n'est jamais.
  const columns = await q(
    `select format('%s.%s %s%s%s',
              c.table_name, c.column_name, c.data_type,
              case when c.is_nullable = 'NO' then ' not-null' else '' end,
              coalesce(' default ' || c.column_default, '')) as line
       from information_schema.columns c
       join information_schema.tables t
         on t.table_schema = c.table_schema and t.table_name = c.table_name
      where c.table_schema = 'public'
        and t.table_type = 'BASE TABLE'
        and c.table_name <> all($1::text[])
      order by 1`,
    [excluded],
  );

  const constraints = await q(
    `select format('%s %s %s', rel.relname, con.conname, pg_get_constraintdef(con.oid)) as line
       from pg_constraint con
       join pg_class rel on rel.oid = con.conrelid
       join pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname = 'public'
        and rel.relname <> all($1::text[])
      order by 1`,
    [excluded],
  );

  const indexes = await q(
    `select format('%s %s', tablename, indexdef) as line
       from pg_indexes
      where schemaname = 'public'
        and tablename <> all($1::text[])
      order by 1`,
    [excluded],
  );

  const policies = await q(
    `select format('%s %s %s %s using(%s) check(%s)',
              tablename, policyname, cmd, array_to_string(roles, ','),
              coalesce(qual, '-'), coalesce(with_check, '-')) as line
       from pg_policies
      where schemaname = 'public'
        and tablename <> all($1::text[])
      order by 1`,
    [excluded],
  );

  const rls = await q(
    `select format('%s rls=%s force=%s', rel.relname, rel.relrowsecurity, rel.relforcerowsecurity) as line
       from pg_class rel
       join pg_namespace ns on ns.oid = rel.relnamespace
      where ns.nspname = 'public' and rel.relkind = 'r'
        and rel.relname <> all($1::text[])
      order by 1`,
    [excluded],
  );

  // Le corps des fonctions compte : account_balance() a été RÉÉCRITE par 0004,
  // et une prod restée sur la version 0002 calculerait des soldes différents
  // sans qu'aucune colonne ne diffère.
  const routines = await q(
    `select format('%s(%s) -> %s :: %s',
              p.proname,
              pg_get_function_identity_arguments(p.oid),
              pg_get_function_result(p.oid),
              md5(pg_get_functiondef(p.oid))) as line
       from pg_proc p
       join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public'
      order by 1`,
  );

  const triggers = await q(
    `select format('%s %s', c.relname, t.tgname) as line
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and not t.tgisinternal
        and c.relname <> all($1::text[])
      order by 1`,
    [excluded],
  );

  return {
    takenAt: new Date().toISOString(),
    projectRef,
    columns, constraints, indexes, policies, rls, routines, triggers,
  };
}

const snapshotPath = (name: TargetName, ref: string) => `${OUT_DIR}schema-${name}-${ref}.json`;

/** Retrouve l'instantané d'une cible sans avoir à répéter son project ref. */
function findSnapshot(name: TargetName): string {
  const target = resolveTarget(name);
  const path = snapshotPath(name, target.projectRef);
  if (!existsSync(path)) {
    throw new Error(
      `Aucun instantané pour « ${name} » :\n    ${path}\n` +
        `  → node scripts/db/schema.ts --snapshot --target ${name}`,
    );
  }
  return path;
}

/* ── comparaison ──────────────────────────────────────────────────────────── */

function diffSection(label: string, a: readonly string[], b: readonly string[]): string[] {
  const setB = new Set(b);
  const setA = new Set(a);
  const onlyA = a.filter((x) => !setB.has(x));
  const onlyB = b.filter((x) => !setA.has(x));
  if (onlyA.length === 0 && onlyB.length === 0) return [];

  const out = [`  ── ${label} ──`];
  for (const line of onlyA) out.push(`    − ${line}`);
  for (const line of onlyB) out.push(`    + ${line}`);
  return out;
}

/* ── exécution ────────────────────────────────────────────────────────────── */

if (args.flags.has("snapshot") || args.values.snapshot !== undefined) {
  const target = resolveTarget(args.target);
  console.log(`\n  base : ${describeTarget(target)}\n`);

  const client = await openClient(target);
  try {
    const snap = await capture(client, target.projectRef);
    mkdirSync(OUT_DIR, { recursive: true });
    const path = snapshotPath(target.name, target.projectRef);
    writeFileSync(path, JSON.stringify(snap, null, 2), "utf8");

    console.log(`    ${String(snap.columns.length).padStart(4)} colonnes`);
    console.log(`    ${String(snap.constraints.length).padStart(4)} contraintes`);
    console.log(`    ${String(snap.indexes.length).padStart(4)} index`);
    console.log(`    ${String(snap.policies.length).padStart(4)} politiques RLS`);
    console.log(`    ${String(snap.routines.length).padStart(4)} fonctions`);
    console.log(`    ${String(snap.triggers.length).padStart(4)} déclencheurs`);
    console.log(`\n  Écrit :\n    ${path}\n`);
  } finally {
    await client.end();
  }
} else if (args.values.diff !== undefined || args.positional.length >= 2) {
  const [left, right] = (
    args.values.diff !== undefined
      ? [args.values.diff, args.positional[0] ?? "prod"]
      : args.positional
  ) as [string, string];

  for (const name of [left, right]) {
    if (name !== "dev" && name !== "prod") {
      throw new Error(`--diff attend « dev » et « prod », pas « ${name} ».`);
    }
  }

  const a = JSON.parse(readFileSync(findSnapshot(left as TargetName), "utf8")) as SchemaSnapshot;
  const b = JSON.parse(readFileSync(findSnapshot(right as TargetName), "utf8")) as SchemaSnapshot;

  console.log(`\n  − ${left}  (${a.projectRef}, ${a.takenAt.slice(0, 16).replace("T", " ")})`);
  console.log(`  + ${right} (${b.projectRef}, ${b.takenAt.slice(0, 16).replace("T", " ")})\n`);

  const sections: [string, readonly string[], readonly string[]][] = [
    ["colonnes", a.columns, b.columns],
    ["contraintes", a.constraints, b.constraints],
    ["index", a.indexes, b.indexes],
    ["politiques RLS", a.policies, b.policies],
    ["RLS activée", a.rls, b.rls],
    ["fonctions", a.routines, b.routines],
    ["déclencheurs", a.triggers, b.triggers],
  ];

  const out = sections.flatMap(([label, x, y]) => diffSection(label, x, y));

  if (out.length === 0) {
    console.log("  ✓ Schémas identiques. La base de dev est bien la jumelle de la production.\n");
    process.exit(0);
  }

  console.log(out.join("\n"));
  console.log(
    `\n  ✗ ${out.filter((l) => l.startsWith("    ")).length} différence(s).\n` +
      `      − présent côté ${left} seulement\n` +
      `      + présent côté ${right} seulement\n\n` +
      "  Une différence ici n'est pas forcément une faute : la production peut porter\n" +
      "  une correction faite à la main que le dépôt n'a jamais eue. Mais elle doit être\n" +
      "  expliquée AVANT de tester une migration lourde sur la dev — c'est précisément\n" +
      "  là que le test mentirait.\n",
  );
  process.exit(1);
} else {
  console.log(
    "\n  node scripts/db/schema.ts --snapshot [--target dev|prod]\n" +
      "  node scripts/db/schema.ts --diff dev prod\n",
  );
  process.exit(1);
}
