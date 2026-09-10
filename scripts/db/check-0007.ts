/**
 * Contrôle de la migration 0007 (people.kind) — avant / après.
 *
 *   node scripts/db/check-0007.ts --before     fige l'état attendu
 *   node scripts/db/check-0007.ts --after      compare le résultat réel
 *
 * 0007 fait un `update` qui déduit le type de chaque personne de son usage
 * passé. Une fois qu'il a tourné, l'information d'avant n'existe plus nulle
 * part : impossible de dire après coup si une personne classée « dépense »
 * l'était à raison. D'où ce script — il calcule la réponse attendue AVANT,
 * l'écrit sur disque, et confronte la base à cette réponse APRÈS.
 *
 * La règle appliquée est celle que la migration énonce elle-même :
 *   une personne référencée par au moins une transaction de type 'income'
 *   est un revenu ; toutes les autres, y compris celles qui ne sont
 *   référencées nulle part, sont des dépenses.
 *
 * Le script vérifie aussi ce que la migration promet de NE PAS faire :
 * aucune ligne de `people` supprimée ou renommée, aucun `linked_to_id` de
 * transaction déplacé. C'est la moitié du contrat, et la moitié qu'on oublie
 * de tester.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import type pg from "pg";

import { parseArgs, resolveTarget, describeTarget, ROOT } from "./env.ts";
import { openClient } from "./client.ts";

const args = parseArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

const before = args.flags.has("before");
const after = args.flags.has("after");
if (before === after) {
  throw new Error("Choisissez --before OU --after.");
}

const SNAPSHOT_DIR = `${ROOT}supabase/.temp/`;
const SNAPSHOT = `${SNAPSHOT_DIR}check-0007-${target.name}-${target.projectRef}.json`;

interface PersonExpectation {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly expected: "income" | "expense";
  /** Pourquoi on attend ça — sert à lire le rapport d'écart. */
  readonly reason: "revenu seul" | "les deux" | "dépense seule" | "jamais utilisée";
}

interface Snapshot {
  readonly takenAt: string;
  readonly projectRef: string;
  readonly peopleCount: number;
  readonly transactionCount: number;
  /** Empreinte de tous les liens de transactions, pour prouver qu'aucun ne bouge. */
  readonly linkDigest: string;
  readonly people: readonly PersonExpectation[];
}

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex").slice(0, 32);
}

async function hasPeopleKind(client: pg.Client): Promise<boolean> {
  const { rowCount } = await client.query(
    `select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'people' and column_name = 'kind'`,
  );
  return (rowCount ?? 0) > 0;
}

/** L'empreinte des liens « lié à » de toutes les transactions. */
async function linkDigest(client: pg.Client): Promise<string> {
  const { rows } = await client.query<{ id: string; t: string | null; l: string | null }>(
    `select id, linked_to_type as t, linked_to_id as l
       from public.transactions order by id`,
  );
  return digest(rows);
}

/** La règle de 0007, calculée côté base. */
async function expectations(client: pg.Client): Promise<PersonExpectation[]> {
  const { rows } = await client.query<{
    id: string; user_id: string; name: string; n_income: string; n_expense: string;
  }>(`
    select p.id, p.user_id, p.name,
           count(*) filter (where t.type = 'income')  ::text as n_income,
           count(*) filter (where t.type = 'expense') ::text as n_expense
      from public.people p
      left join public.transactions t
        on t.linked_to_type = 'person' and t.linked_to_id = p.id
     group by p.id, p.user_id, p.name
     order by p.id
  `);

  return rows.map((r) => {
    const income = Number(r.n_income) > 0;
    const expense = Number(r.n_expense) > 0;
    const reason: PersonExpectation["reason"] = income
      ? expense
        ? "les deux"
        : "revenu seul"
      : expense
        ? "dépense seule"
        : "jamais utilisée";
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      expected: income ? "income" : "expense",
      reason,
    };
  });
}

/* ── exécution ────────────────────────────────────────────────────────────── */

console.log(`\n  base : ${describeTarget(target)}\n`);

const client = await openClient(target);
try {
  const kindPresent = await hasPeopleKind(client);

  /* ── AVANT ─────────────────────────────────────────────────────────────── */
  if (before) {
    if (kindPresent) {
      throw new Error(
        "`people.kind` existe déjà : 0007 a déjà tourné sur cette base.\n" +
          "  L'état d'avant n'est plus observable. Sur la dev, reconstruisez la base\n" +
          "  (README § « Repartir de zéro ») ; sur la production, passez directement à\n" +
          "  --after si un instantané avait été pris.",
      );
    }

    const people = await expectations(client);
    const { rows: txCount } = await client.query<{ n: string }>(
      "select count(*)::text as n from public.transactions",
    );

    const snapshot: Snapshot = {
      takenAt: new Date().toISOString(),
      projectRef: target.projectRef,
      peopleCount: people.length,
      transactionCount: Number(txCount[0]!.n),
      linkDigest: await linkDigest(client),
      people,
    };

    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2), "utf8");

    const counts = people.reduce<Record<string, number>>((acc, p) => {
      acc[p.reason] = (acc[p.reason] ?? 0) + 1;
      return acc;
    }, {});

    console.log(`  ${people.length} personne(s), réparties ainsi :\n`);
    for (const reason of ["revenu seul", "les deux", "dépense seule", "jamais utilisée"]) {
      const n = counts[reason] ?? 0;
      const attendu = reason === "revenu seul" || reason === "les deux" ? "income" : "expense";
      console.log(`    ${reason.padEnd(16)} ${String(n).padStart(4)}  → attendu : ${attendu}`);
    }

    if ((counts["les deux"] ?? 0) === 0) {
      console.warn(
        "\n  ⚠  Aucune personne n'est utilisée des DEUX côtés. C'est justement le cas\n" +
          "     que 0007 arbitre (le revenu l'emporte) : sans lui, le test ne prouve\n" +
          "     pas grand-chose. Lancez `node scripts/db/seed.ts` d'abord.",
      );
    }

    console.log(`\n  Instantané écrit :\n    ${SNAPSHOT}\n`);
    console.log("  Vous pouvez appliquer 0007 :\n    node scripts/db/migrate.ts --only 0007\n");
    process.exit(0);
  }

  /* ── APRÈS ─────────────────────────────────────────────────────────────── */

  if (!existsSync(SNAPSHOT)) {
    throw new Error(
      `Aucun instantané pour cette base :\n    ${SNAPSHOT}\n` +
        "  Il fallait lancer --before AVANT d'appliquer 0007.",
    );
  }
  if (!kindPresent) {
    throw new Error("`people.kind` n'existe pas : 0007 n'a pas encore été appliquée.");
  }

  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Snapshot;
  if (snapshot.projectRef !== target.projectRef) {
    throw new Error(
      `L'instantané a été pris sur le projet ${snapshot.projectRef}, pas ${target.projectRef}.`,
    );
  }

  const problems: string[] = [];

  /* 1. le classement lui-même */
  const { rows: actual } = await client.query<{ id: string; name: string; kind: string }>(
    "select id, name, kind from public.people order by id",
  );
  const actualById = new Map(actual.map((r) => [r.id, r]));

  const mismatches: string[] = [];
  const byReason: Record<string, { ok: number; ko: number }> = {};

  for (const p of snapshot.people) {
    const row = actualById.get(p.id);
    const bucket = (byReason[p.reason] ??= { ok: 0, ko: 0 });
    if (!row) {
      bucket.ko++;
      mismatches.push(`    ${p.name} (${p.reason}) — LIGNE DISPARUE`);
      continue;
    }
    if (row.name !== p.name) {
      mismatches.push(`    ${p.name} → renommée en « ${row.name} »`);
    }
    if (row.kind !== p.expected) {
      bucket.ko++;
      mismatches.push(`    ${p.name} (${p.reason}) — attendu ${p.expected}, obtenu ${row.kind}`);
    } else {
      bucket.ok++;
    }
  }

  console.log("  Classement :\n");
  for (const reason of ["revenu seul", "les deux", "dépense seule", "jamais utilisée"]) {
    const b = byReason[reason];
    if (!b) continue;
    const mark = b.ko === 0 ? "✓" : "✗";
    console.log(`    ${mark} ${reason.padEnd(16)} ${String(b.ok).padStart(4)} conformes, ${b.ko} écart(s)`);
  }
  console.log("");

  if (mismatches.length > 0) {
    problems.push(`Classement incorrect :\n${mismatches.join("\n")}`);
  }

  /* 2. rien n'a disparu, rien n'a été ajouté */
  if (actual.length !== snapshot.peopleCount) {
    problems.push(
      `Le nombre de personnes a changé : ${snapshot.peopleCount} avant, ${actual.length} après.`,
    );
  }

  /* 3. les liens des transactions n'ont pas bougé */
  const { rows: txCount } = await client.query<{ n: string }>(
    "select count(*)::text as n from public.transactions",
  );
  if (Number(txCount[0]!.n) !== snapshot.transactionCount) {
    problems.push(
      `Le nombre de transactions a changé : ${snapshot.transactionCount} avant, ${txCount[0]!.n} après.`,
    );
  }
  const nowDigest = await linkDigest(client);
  if (nowDigest !== snapshot.linkDigest) {
    problems.push(
      "Au moins un lien « lié à » de transaction a changé. 0007 ne doit toucher\n" +
        "  aucun linked_to_id — une transaction existante doit continuer d'afficher\n" +
        "  le même nom qu'avant.",
    );
  }

  /* 4. la structure promise est bien là */
  const { rowCount: hasCheck } = await client.query(
    `select 1 from pg_constraint where conname = 'people_kind_check'`,
  );
  if (!hasCheck) problems.push("La contrainte `people_kind_check` est absente.");

  const { rowCount: hasIndex } = await client.query(
    `select 1 from pg_indexes where schemaname = 'public' and indexname = 'people_user_kind_idx'`,
  );
  if (!hasIndex) problems.push("L'index `people_user_kind_idx` est absent.");

  const { rows: badKind } = await client.query<{ n: string }>(
    "select count(*)::text as n from public.people where kind not in ('expense','income')",
  );
  if (Number(badKind[0]!.n) > 0) {
    problems.push(`${badKind[0]!.n} ligne(s) portent un kind hors ('expense','income').`);
  }

  /* verdict */
  if (problems.length > 0) {
    console.error("  ✗ ÉCHEC\n");
    for (const p of problems) console.error(`  • ${p}\n`);
    console.error("  N'appliquez pas 0007 en production tant que ceci n'est pas compris.\n");
    process.exit(1);
  }

  console.log("  ✓ 0007 est conforme sur cette base.");
  console.log("    · chaque personne porte le type déduit de son usage réel");
  console.log("    · aucune ligne de people perdue, ajoutée ni renommée");
  console.log("    · aucun lien de transaction déplacé");
  console.log("    · contrainte et index en place\n");
} finally {
  await client.end();
}
