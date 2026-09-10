/**
 * Contrôles Go / No-Go de la migration multi-espaces — avant / après.
 *
 *   node scripts/db/check-espaces.ts --before     fige l'état d'aujourd'hui
 *   node scripts/db/check-espaces.ts --after      confronte la base à cet état
 *   node scripts/db/check-espaces.ts --after --target prod
 *
 * Ce script est le juge décrit par MIGRATION-CONTROLES-VALIDATION.md. Il porte
 * les quatre contrôles, dans l'ordre du document :
 *
 *   1. aucune donnée orpheline      2. les totaux sont identiques
 *   3. un seul espace personnel     4. l'isolation fonctionne
 *
 * ── pourquoi il existe AVANT la migration ──────────────────────────────────
 *
 * La mesure « avant » n'a pas de seconde chance : une fois `space_id` rempli,
 * l'état d'avant n'est plus observable nulle part. Le document l'écrit en
 * prérequis absolu, et c'est la seule partie de ce fichier qui ne pouvait pas
 * être écrite après coup.
 *
 * Il y a une seconde raison, moins visible. Le contrôle 2 est, le jour de la
 * bascule, presque condamné à passer : les données de production sont
 * exclusivement personnelles, donc `space_id` y sera une fonction pure de
 * `user_id` et tous les totaux correspondront nécessairement. Le seul contrôle
 * qui porte du risque est le 4 — et il exige un utilisateur à DEUX espaces, cas
 * qui n'existera jamais en production ce jour-là. Il ne peut vivre que dans le
 * jeu de dev. D'où un harnais construit avant, et pas un rapport rédigé après.
 *
 * ── ce que ce script prouve, et ce qu'il ne prouve pas ─────────────────────
 *
 * Il parle à Postgres. Il éprouve donc les politiques RLS — la SECONDE ligne de
 * défense — en endossant réellement le rôle `authenticated` avec les claims JWT
 * d'un utilisateur donné, exactement comme Supabase les évalue. C'est déjà plus
 * que ce que fait la suite actuelle, où aucun des 453 tests n'ouvre de connexion.
 *
 * Mais 24 des 26 routes d'API passent par `getServiceClient()`, qui contourne la
 * RLS : à l'exécution, ce qui isole vraiment est le code applicatif. Le test B
 * du contrôle 4 — « la boutique ne lit pas le restaurant » — se joue donc au
 * goulot applicatif (en-tête `X-Space-Id`, décision A), pas dans la base. Ici on
 * prouve la moitié qui est prouvable en SQL : que les données sont réellement
 * partitionnables, qu'aucune clé étrangère ne traverse deux espaces, et que les
 * politiques ont bien été réécrites. Que l'application applique effectivement le
 * filtre demande un harnais HTTP, à ajouter quand le goulot existera.
 *
 * ── lecture seule ──────────────────────────────────────────────────────────
 *
 * Aucune écriture en base, jamais — l'instantané part sur le disque. C'est
 * pourquoi `--target prod` ne réclame pas la confirmation tapée de
 * `confirmProd()` : cette confirmation protège des écritures, et la banaliser
 * sur des lectures l'userait pour le jour où elle compte.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import type pg from "pg";
// `pg` n'est importé que comme type ci-dessus ; escapeIdentifier est une vraie
// valeur, il lui faut son propre import.
import { escapeIdentifier } from "pg";

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
const SNAPSHOT = `${SNAPSHOT_DIR}check-espaces-${target.name}-${target.projectRef}.json`;

/* ── le périmètre ─────────────────────────────────────────────────────────── */

/** Les huit tables qui descendent entièrement dans l'espace. */
const SCOPED_TABLES = [
  "accounts",
  "transactions",
  "budgets",
  "projects",
  "templates",
  "people",
  "alerts",
  "reports",
] as const;

/**
 * `categories` est le neuvième cas, et le seul qui se coupe en deux : les lignes
 * système restent globales, seules les catégories personnalisées descendent.
 * Elle est donc comptée et contrôlée à part, partout dans ce fichier.
 */
const ALL_TABLES = [...SCOPED_TABLES, "categories"] as const;

/** Le schéma d'écosystème (décision G) : `spaces` n'est pas une table de SwiftlyTrack. */
const SPACES_TABLE = "core.spaces";

/* ── formes ───────────────────────────────────────────────────────────────── */

interface AccountBalance {
  readonly id: string;
  readonly name: string;
  /** Rendu en texte : un entier de XOF, comparé caractère par caractère. */
  readonly balance: string;
}

interface UserTotals {
  readonly user_id: string;
  readonly email: string;
  /** Faux si la ligne de profil `public.users` manque — voir le contrôle 3. */
  readonly hasProfile: boolean;
  readonly balanceTotal: string;
  readonly perAccount: readonly AccountBalance[];
  readonly transactions: number;
  readonly expenseSum: string;
  readonly incomeSum: string;
  readonly transferSum: string;
  readonly counts: Readonly<Record<string, number>>;
}

interface ModelState {
  readonly spacesTable: boolean;
  /** Les tables qui portent déjà une colonne `space_id`. */
  readonly scopedColumns: readonly string[];
  /** Vrai dès qu'au moins une ligne porte un `space_id` non nul. */
  readonly filled: boolean;
}

interface Snapshot {
  readonly takenAt: string;
  readonly projectRef: string;
  readonly model: ModelState;
  readonly tableCounts: Readonly<Record<string, number>>;
  readonly users: readonly UserTotals[];
}

type Status = "ok" | "ko" | "pending";

interface Check {
  readonly control: 1 | 2 | 3 | 4;
  readonly title: string;
  status: Status;
  readonly notes: string[];
}

const checks: Check[] = [];

function check(control: 1 | 2 | 3 | 4, title: string): Check {
  const c: Check = { control, title, status: "ok", notes: [] };
  checks.push(c);
  return c;
}

/** Un échec réel : il commande le retour arrière. */
function fail(c: Check, note: string): void {
  c.status = "ko";
  c.notes.push(note);
}

/**
 * Le modèle d'espaces n'existe pas encore, donc le contrôle ne s'applique pas.
 * Ce n'est PAS un succès, et ce n'est pas non plus un échec : c'est un critère
 * d'acceptation qui attend son objet. Il vire au rouge tout seul le jour où le
 * modèle est là et où il n'est pas satisfait.
 */
function pending(c: Check, note: string): void {
  if (c.status !== "ko") c.status = "pending";
  c.notes.push(note);
}

/* ── petits outils SQL ────────────────────────────────────────────────────── */

function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex").slice(0, 32);
}

/**
 * Les noms de table de ce fichier sont des littéraux des constantes ci-dessus.
 * SQL n'accepte pas de paramètre à la place d'un identifiant : il faut donc les
 * écrire dans la requête. `escapeIdentifier` les met entre guillemets et double
 * ceux qu'ils contiennent, ce qui rend la sortie inerte même si un nom venait un
 * jour d'ailleurs qu'un littéral de ce fichier.
 */
function qualify(table: string): string {
  return `public.${escapeIdentifier(table)}`;
}

async function countRows(client: pg.Client, table: string, where = ""): Promise<number> {
  const from = qualify(table);
  // Identifiant échappé ci-dessus, clause `where` littérale de ce fichier : la
  // règle regex ne sait pas lire la différence entre les deux.
  // nosemgrep: swiftly-sql-string-interpolation
  const sql = `select count(*)::text as n from ${from} ${where}`;
  const { rows } = await client.query<{ n: string }>(sql);
  return Number(rows[0]!.n);
}

async function countByUser(
  client: pg.Client,
  table: string,
  where = "",
): Promise<Map<string, number>> {
  const from = qualify(table);
  // Même raison qu'au-dessus.
  // nosemgrep: swiftly-sql-string-interpolation
  const sql = `select user_id::text as u, count(*)::text as n from ${from} ${where} group by user_id`;
  const { rows } = await client.query<{ u: string; n: string }>(sql);
  return new Map(rows.map((r) => [r.u, Number(r.n)]));
}

async function tableExists(client: pg.Client, qualified: string): Promise<boolean> {
  const { rows } = await client.query<{ t: string | null }>("select to_regclass($1)::text as t", [
    qualified,
  ]);
  return rows[0]!.t !== null;
}

async function columnExists(client: pg.Client, table: string, column: string): Promise<boolean> {
  const { rowCount } = await client.query(
    `select 1 from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  );
  return (rowCount ?? 0) > 0;
}

async function readModel(client: pg.Client): Promise<ModelState> {
  const spacesTable = await tableExists(client, SPACES_TABLE);

  const scopedColumns: string[] = [];
  for (const t of ALL_TABLES) {
    if (await columnExists(client, t, "space_id")) scopedColumns.push(t);
  }

  let filled = false;
  for (const t of scopedColumns) {
    if ((await countRows(client, t, "where space_id is not null")) > 0) {
      filled = true;
      break;
    }
  }

  return { spacesTable, scopedColumns, filled };
}

/* ── la mesure ────────────────────────────────────────────────────────────── */

/**
 * Les totaux par utilisateur, tels que le contrôle 2 les énumère.
 *
 * Les soldes passent par `public.account_balance()`, et c'est délibéré : cette
 * fonction résout aujourd'hui « le compte principal de l'utilisateur » en
 * traversant `user_id` (0004), et la décision C la réécrit sur l'espace. La
 * mesurer des deux côtés de la migration est précisément ce qui prouve que la
 * réécriture n'a pas déplacé un solde.
 *
 * Les montants sont des `bigint` de XOF entiers, pas des décimaux : la
 * comparaison exacte exigée par le document est ici triviale, il n'y a aucun
 * arrondi possible. On les compare quand même en texte, pour ne jamais passer
 * par le `number` de JavaScript.
 */
async function measure(client: pg.Client): Promise<UserTotals[]> {
  const { rows: users } = await client.query<{ id: string; email: string; has_profile: boolean }>(`
    select u.id::text as id,
           coalesce(u.email, '(sans email)') as email,
           (p.id is not null) as has_profile
      from auth.users u
      left join public.users p on p.id = u.id
     order by u.id
  `);

  const { rows: accounts } = await client.query<{
    user_id: string;
    id: string;
    name: string;
    balance: string;
  }>(`
    select a.user_id::text as user_id, a.id::text as id, a.name,
           public.account_balance(a.id)::text as balance
      from public.accounts a
     order by a.user_id, a.id
  `);

  const { rows: tx } = await client.query<{
    user_id: string;
    n: string;
    expense: string;
    income: string;
    transfer: string;
  }>(`
    select user_id::text as user_id,
           count(*)::text                                                  as n,
           coalesce(sum(amount) filter (where type = 'expense'),  0)::text as expense,
           coalesce(sum(amount) filter (where type = 'income'),   0)::text as income,
           coalesce(sum(amount) filter (where type = 'transfer'), 0)::text as transfer
      from public.transactions
     group by user_id
  `);
  const txByUser = new Map(tx.map((r) => [r.user_id, r]));

  const counters: Record<string, Map<string, number>> = {};
  for (const t of ["budgets", "projects", "templates", "people", "alerts", "reports"]) {
    counters[t] = await countByUser(client, t);
  }
  // Seules les catégories personnalisées comptent : les lignes système sont
  // globales et n'appartiennent à personne.
  counters.categories = await countByUser(client, "categories", "where user_id is not null");

  return users.map((u) => {
    const mine = accounts.filter((a) => a.user_id === u.id);
    const total = mine.reduce((sum, a) => sum + BigInt(a.balance), 0n);
    const t = txByUser.get(u.id);

    const counts: Record<string, number> = { accounts: mine.length };
    for (const [table, map] of Object.entries(counters)) counts[table] = map.get(u.id) ?? 0;

    return {
      user_id: u.id,
      email: u.email,
      hasProfile: u.has_profile,
      balanceTotal: total.toString(),
      perAccount: mine.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
      transactions: Number(t?.n ?? "0"),
      expenseSum: t?.expense ?? "0",
      incomeSum: t?.income ?? "0",
      transferSum: t?.transfer ?? "0",
      counts,
    };
  });
}

async function readTableCounts(client: pg.Client): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of ALL_TABLES) out[t] = await countRows(client, t);
  return out;
}

/**
 * Endosse un utilisateur réel au niveau de la base.
 *
 * `auth.uid()` lit `request.jwt.claims`, et les politiques RLS s'appliquent au
 * rôle `authenticated` — pas à `postgres`, qui possède les tables et les
 * traverse sans être filtré. Poser les deux, le temps d'une transaction annulée
 * à la fin, reproduit exactement ce qu'une session Supabase voit. C'est la seule
 * façon d'éprouver les 39 politiques depuis un script.
 */
async function asUser<T>(client: pg.Client, userId: string, fn: () => Promise<T>): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await client.query("set local role authenticated");
    return await fn();
  } finally {
    // Rien n'a été écrit ; le rollback ne sert qu'à rendre le rôle et les claims.
    await client.query("rollback");
  }
}

/* ── contrôle 1 — aucune donnée orpheline ─────────────────────────────────── */

async function control1(client: pg.Client, model: ModelState, snap: Snapshot): Promise<void> {
  const c = check(1, "Aucune donnée orpheline");

  // Le compte de lignes, lui, se vérifie dès aujourd'hui : c'est la promesse que
  // le remplissage n'a ni perdu ni ajouté une ligne.
  const now = await readTableCounts(client);
  for (const t of ALL_TABLES) {
    if (now[t] !== snap.tableCounts[t]) {
      fail(c, `${t} : ${snap.tableCounts[t]} ligne(s) avant, ${now[t]} après.`);
    }
  }

  if (!model.spacesTable || model.scopedColumns.length < ALL_TABLES.length) {
    pending(
      c,
      "space_id n'existe pas encore sur les 9 tables — rien à rattacher, donc rien\n" +
        "      d'orphelin à chercher. Ce contrôle s'arme au Temps 1.",
    );
    return;
  }

  for (const t of SCOPED_TABLES) {
    const nulls = await countRows(client, t, "where space_id is null");
    if (nulls > 0) fail(c, `${t} : ${nulls} ligne(s) sans space_id.`);
  }

  // `categories` se coupe en deux : personnalisée ⇒ rattachée, système ⇒ globale.
  const customOrphans = await countRows(
    client,
    "categories",
    "where is_system = false and space_id is null",
  );
  if (customOrphans > 0) {
    fail(c, `categories : ${customOrphans} catégorie(s) personnalisée(s) sans space_id.`);
  }
  const systemAttached = await countRows(
    client,
    "categories",
    "where is_system = true and space_id is not null",
  );
  if (systemAttached > 0) {
    fail(
      c,
      `categories : ${systemAttached} catégorie(s) SYSTÈME rattachée(s) à un espace.\n` +
        "      Elles doivent rester globales (décision 10 du document parent).",
    );
  }

  // Une référence vers un espace qui n'existe pas. Une clé étrangère devrait
  // l'interdire ; on vérifie quand même, parce qu'un `not valid` oublié suffit.
  for (const t of SCOPED_TABLES) {
    const from = qualify(t);
    // Identifiant échappé, reste du texte littéral.
    // nosemgrep: swiftly-sql-string-interpolation
    const sql = `select count(*)::text as n from ${from} t
                  where t.space_id is not null
                    and not exists (select 1 from ${SPACES_TABLE} s where s.id = t.space_id)`;
    const { rows } = await client.query<{ n: string }>(sql);
    if (Number(rows[0]!.n) > 0) {
      fail(c, `${t} : ${rows[0]!.n} ligne(s) pointent vers un espace inexistant.`);
    }
  }
}

/* ── contrôle 2 — les totaux sont identiques ──────────────────────────────── */

function control2(now: readonly UserTotals[], snap: Snapshot): void {
  const c = check(2, "Les totaux sont identiques");

  const byId = new Map(now.map((u) => [u.user_id, u]));

  for (const was of snap.users) {
    const is = byId.get(was.user_id);
    const who = `${was.email} (${was.user_id.slice(0, 8)})`;

    if (!is) {
      fail(c, `${who} : UTILISATEUR DISPARU.`);
      continue;
    }

    if (is.balanceTotal !== was.balanceTotal) {
      fail(c, `${who} : solde total ${was.balanceTotal} → ${is.balanceTotal}.`);
    }

    const wasAccounts = new Map(was.perAccount.map((a) => [a.id, a]));
    for (const a of is.perAccount) {
      const w = wasAccounts.get(a.id);
      if (!w) {
        fail(c, `${who} : compte « ${a.name} » apparu après coup.`);
        continue;
      }
      if (w.balance !== a.balance) {
        fail(c, `${who} · compte « ${a.name} » : ${w.balance} → ${a.balance}.`);
      }
      wasAccounts.delete(a.id);
    }
    for (const w of wasAccounts.values()) {
      fail(c, `${who} : compte « ${w.name} » DISPARU.`);
    }

    if (is.transactions !== was.transactions) {
      fail(c, `${who} : ${was.transactions} transaction(s) → ${is.transactions}.`);
    }
    if (is.expenseSum !== was.expenseSum) {
      fail(c, `${who} : somme des dépenses ${was.expenseSum} → ${is.expenseSum}.`);
    }
    if (is.incomeSum !== was.incomeSum) {
      fail(c, `${who} : somme des revenus ${was.incomeSum} → ${is.incomeSum}.`);
    }
    if (is.transferSum !== was.transferSum) {
      fail(c, `${who} : somme des virements ${was.transferSum} → ${is.transferSum}.`);
    }

    for (const [table, n] of Object.entries(was.counts)) {
      if (is.counts[table] !== n) {
        fail(c, `${who} : ${table} ${n} → ${is.counts[table]}.`);
      }
    }
  }

  for (const is of now) {
    if (!snap.users.some((w) => w.user_id === is.user_id)) {
      c.notes.push(
        `${is.email} : utilisateur créé depuis l'instantané — hors périmètre de la comparaison.`,
      );
    }
  }
}

/* ── contrôle 3 — un seul espace personnel par utilisateur ────────────────── */

async function control3(client: pg.Client, model: ModelState): Promise<void> {
  const c = check(3, "Un seul espace personnel par utilisateur");

  // Le même défaut, une couche plus bas : un profil manquant est déjà, dans le
  // modèle actuel, l'équivalent d'un « utilisateur sans conteneur affichable ».
  // C'est le motif que la décision H interdit de reproduire pour les espaces.
  const { rows: orphanProfiles } = await client.query<{ n: string }>(`
    select count(*)::text as n
      from auth.users u
      left join public.users p on p.id = u.id
     where p.id is null
  `);
  if (Number(orphanProfiles[0]!.n) > 0) {
    c.notes.push(
      `${orphanProfiles[0]!.n} compte(s) auth sans ligne public.users. Le profil est créé\n` +
        "      en best effort par app/api/auth/profile/route.ts — c'est exactement ce que\n" +
        "      la décision H interdit pour l'espace personnel.",
    );
  }

  if (!model.spacesTable) {
    pending(c, `${SPACES_TABLE} n'existe pas encore. Ce contrôle s'arme au Temps 1.`);
    return;
  }

  // Le seul élément interpolé est SPACES_TABLE, constante littérale en tête de ce
  // fichier ; tout le reste est du texte fixe et aucune valeur extérieure n'entre
  // dans la requête. La règle regex ne sait pas lire la différence.
  // nosemgrep: swiftly-sql-string-interpolation
  const { rows } = await client.query<{ zero: string; deux: string; users: string; perso: string }>(`
    with per_user as (
      select u.id,
             count(s.id) filter (where s.type = 'personal') as n_personal
        from auth.users u
        left join ${SPACES_TABLE} s on s.owner_id = u.id
       group by u.id
    )
    select count(*) filter (where n_personal = 0)::text as zero,
           count(*) filter (where n_personal > 1)::text as deux,
           count(*)::text                               as users,
           coalesce(sum(n_personal), 0)::text           as perso
      from per_user
  `);
  const r = rows[0]!;

  if (Number(r.zero) > 0) fail(c, `${r.zero} utilisateur(s) sans espace personnel.`);
  if (Number(r.deux) > 0) fail(c, `${r.deux} utilisateur(s) avec DEUX espaces personnels ou plus.`);
  if (r.users !== r.perso) {
    fail(c, `${r.users} utilisateur(s) pour ${r.perso} espace(s) personnel(s) — doit être égal.`);
  }

  // Non supprimable : un garde-fou en base, pas une règle d'interface.
  const { rowCount: guard } = await client.query(`
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'core' and c.relname = 'spaces'
       and not t.tgisinternal and (t.tgtype & 8) <> 0
  `);
  if (!guard) {
    fail(
      c,
      "Aucun trigger `before delete` sur core.spaces : rien n'empêche en base de\n" +
        "      supprimer un espace personnel (propriété « non supprimable »).",
    );
  }

  // Création automatique pour les NOUVEAUX inscrits — décision H.
  const { rowCount: autoCreate } = await client.query(`
    select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
     where n.nspname = 'auth' and c.relname = 'users'
       and not t.tgisinternal and p.proname ilike '%space%'
  `);
  if (!autoCreate) {
    fail(
      c,
      "Aucun trigger sur auth.users ne crée d'espace personnel : un nouvel inscrit\n" +
        "      arriverait sans conteneur (décision H — jamais en best effort).",
    );
  }
}

/* ── contrôle 4 — l'isolation fonctionne ──────────────────────────────────── */

async function control4(
  client: pg.Client,
  model: ModelState,
  now: readonly UserTotals[],
): Promise<void> {
  await test4A(client, now);
  await test4B(client, model);
  await test4C(client, model, now);
  await test4D(client, model);
}

/**
 * Test A — isolation entre utilisateurs. Jouable aujourd'hui, et c'est tout
 * l'intérêt : il donne la ligne de base AVANT que la migration ne réécrive les
 * politiques. Sans cette mesure d'avant, « l'isolation marche toujours » n'a
 * rien à quoi se comparer.
 */
async function test4A(client: pg.Client, now: readonly UserTotals[]): Promise<void> {
  const c = check(4, "Test A — un utilisateur ne lit pas les données d'un autre");

  const populated = now.filter((u) => u.transactions > 0);
  if (populated.length < 2) {
    pending(
      c,
      "Il faut au moins deux utilisateurs porteurs de données pour que le test ait\n" +
        "      un sens. Lancez `npm run db:seed` sur la dev.",
    );
    return;
  }

  const [one, two] = [populated[0]!, populated[1]!];

  try {
    await asUser(client, one.user_id, async () => {
      for (const t of SCOPED_TABLES) {
        const from = qualify(t);
        // Identifiant échappé ; l'id de l'autre utilisateur est paramétré.
        // nosemgrep: swiftly-sql-string-interpolation
        const sql = `select count(*)::text as n from ${from} where user_id = $1`;
        const { rows } = await client.query<{ n: string }>(sql, [two.user_id]);
        if (Number(rows[0]!.n) > 0) {
          fail(
            c,
            `${one.email} voit ${rows[0]!.n} ligne(s) de ${two.email} dans ${t} —` +
              " la RLS ne filtre pas.",
          );
        }
      }

      // Et le miroir : il doit voir les siennes, sinon le test passerait pour une
      // base vide ou un rôle sans aucun droit.
      const { rows: mine } = await client.query<{ n: string }>(
        "select count(*)::text as n from public.transactions",
      );
      if (Number(mine[0]!.n) !== one.transactions) {
        fail(
          c,
          `${one.email} devrait voir ses ${one.transactions} transaction(s), il en voit ` +
            `${mine[0]!.n}. Un test d'isolation qui ne voit rien ne prouve rien.`,
        );
      }
    });
  } catch (cause) {
    fail(
      c,
      "Impossible d'endosser le rôle `authenticated` :\n      " +
        `${(cause as Error).message}`,
    );
  }
}

/**
 * Test B — isolation entre deux espaces d'un MÊME propriétaire.
 *
 * La RLS ne peut pas trancher ce cas : les deux espaces appartiennent à la même
 * personne, donc toute politique cadrée sur le propriétaire les laisse passer
 * l'un et l'autre. C'est la décision A qui tranche, au goulot applicatif, à
 * partir de l'en-tête `X-Space-Id`.
 *
 * Ce qui se prouve ici est la précondition, et elle n'est pas rien : que les
 * données soient réellement partitionnables. Une seule clé étrangère qui
 * traverse deux espaces — une transaction de la boutique tirant sur un compte
 * personnel — et le cloisonnement est faux quel que soit le filtre appliqué
 * au-dessus.
 */
async function test4B(client: pg.Client, model: ModelState): Promise<void> {
  const c = check(4, "Test B — deux espaces d'un même propriétaire ne se lisent pas");

  if (!model.spacesTable || !model.filled) {
    pending(
      c,
      "Aucun espace rempli. Le jeu de dev fabrique pourtant déjà le cas : Koffi\n" +
        "      tient deux univers financiers (personnel + boutique, 5 comptes, 28\n" +
        "      transactions). Il leur manque seulement un conteneur — ce test s'arme\n" +
        "      donc de lui-même au Temps 1, sans rien retoucher ici.",
    );
    return;
  }

  // Même raison qu'au contrôle 3 : SPACES_TABLE est une constante de ce fichier.
  // nosemgrep: swiftly-sql-string-interpolation
  const { rows: multi } = await client.query<{ owner_id: string; n: string }>(`
    select owner_id::text as owner_id, count(*)::text as n
      from ${SPACES_TABLE}
     group by owner_id having count(*) > 1
  `);
  if (multi.length === 0) {
    pending(
      c,
      "Aucun utilisateur n'a deux espaces. Le test le plus important du document\n" +
        "      reste sans objet tant que le semis n'en fabrique pas un.",
    );
    return;
  }

  // Aucune clé étrangère ne traverse deux espaces.
  const crossings: ReadonlyArray<readonly [string, string]> = [
    ["transactions t join public.accounts a on a.id = t.source_account_id", "compte source"],
    ["transactions t join public.accounts a on a.id = t.destination_account_id", "compte destination"],
    ["transactions t join public.categories a on a.id = t.category_id", "catégorie"],
    ["budgets t join public.categories a on a.id = t.category_id", "catégorie de budget"],
    ["transactions t join public.templates a on a.id = t.template_id", "template"],
  ];

  for (const [join, label] of crossings) {
    // Texte entièrement littéral de ce fichier ; aucune valeur extérieure.
    // nosemgrep: swiftly-sql-string-interpolation
    const sql = `select count(*)::text as n from public.${join}
                  where a.space_id is not null and t.space_id is not null
                    and a.space_id <> t.space_id`;
    const { rows } = await client.query<{ n: string }>(sql);
    if (Number(rows[0]!.n) > 0) {
      fail(c, `${rows[0]!.n} ligne(s) pointent vers un ${label} d'un AUTRE espace.`);
    }
  }

  // Les catégories système sont le seul lien légitimement transverse : elles ne
  // portent pas de space_id, donc elles ne peuvent pas en traverser deux.
  c.notes.push(
    `${multi.length} propriétaire(s) à plusieurs espaces contrôlé(s) — aucune référence croisée.`,
  );
  c.notes.push(
    "Rappel : que l'API applique le filtre X-Space-Id se prouve au niveau HTTP,\n" +
      "      pas ici. C'est le second harnais, à écrire avec le goulot.",
  );
}

/**
 * Test C — la consolidation reste sans perte.
 *
 * L'assertion est exacte : passer par les espaces du propriétaire doit rendre
 * précisément ce que rendait le cadrage par `user_id`. C'est la preuve que le
 * droit du propriétaire (décision 8 du document parent) n'a rien perdu en route.
 */
async function test4C(
  client: pg.Client,
  model: ModelState,
  now: readonly UserTotals[],
): Promise<void> {
  const c = check(4, "Test C — la vue consolidée du propriétaire reste complète");

  if (!model.spacesTable || !model.filled) {
    pending(
      c,
      "Pas d'espaces remplis : rien à consolider. S'arme avec le test B, au Temps 1.",
    );
    return;
  }

  for (const u of now) {
    for (const t of SCOPED_TABLES) {
      const from = qualify(t);
      // Identifiant échappé ; l'id du propriétaire est paramétré.
      // nosemgrep: swiftly-sql-string-interpolation
      const sql = `select count(*)::text as n from ${from}
                    where space_id in (select id from ${SPACES_TABLE} where owner_id = $1)`;
      const { rows } = await client.query<{ n: string }>(sql, [u.user_id]);
      const viaSpaces = Number(rows[0]!.n);
      const viaUser = u.counts[t] ?? 0;
      if (viaSpaces !== viaUser) {
        fail(
          c,
          `${u.email} · ${t} : ${viaUser} ligne(s) par user_id, ${viaSpaces} par espaces.`,
        );
      }
    }
  }
}

/**
 * Test D — les politiques RLS ont bien été réécrites.
 *
 * Une politique laissée sur `user_id` après le Temps 4 ne protège plus rien :
 * la colonne aura disparu. Une politique qui mentionne les deux est une
 * contradiction en attente. On lit donc le texte des politiques.
 */
async function test4D(client: pg.Client, model: ModelState): Promise<void> {
  const c = check(4, "Test D — les politiques RLS pointent sur space_id");

  if (!model.spacesTable || model.scopedColumns.length < ALL_TABLES.length) {
    pending(c, "Les politiques n'ont pas encore à changer : la bascule est au Temps 3.");
    return;
  }

  const { rows } = await client.query<{
    tablename: string;
    policyname: string;
    qual: string | null;
    with_check: string | null;
  }>(
    `select tablename, policyname, qual, with_check
       from pg_policies
      where schemaname = 'public' and tablename = any($1)
      order by tablename, policyname`,
    [[...ALL_TABLES]],
  );

  if (rows.length === 0) {
    fail(c, "Aucune politique RLS sur les 9 tables — la seconde ligne de défense a disparu.");
    return;
  }

  for (const p of rows) {
    const text = `${p.qual ?? ""} ${p.with_check ?? ""}`;
    const where = `${p.tablename}.${p.policyname}`;
    if (/\buser_id\b/.test(text)) {
      fail(c, `${where} référence encore user_id.`);
    }
    if (!/\bspace_id\b/.test(text)) {
      fail(c, `${where} ne référence pas space_id.`);
    }
  }

  const covered = new Set(rows.map((r) => r.tablename));
  for (const t of ALL_TABLES) {
    if (!covered.has(t)) fail(c, `${t} n'a plus aucune politique RLS.`);
  }
}

/* ── exécution ────────────────────────────────────────────────────────────── */

console.log(`\n  base : ${describeTarget(target)}\n`);

const client = await openClient(target);
let exitCode = 0;

try {
  const model = await readModel(client);

  console.log("  Modèle d'espaces :");
  console.log(`    ${SPACES_TABLE.padEnd(24)} ${model.spacesTable ? "présente" : "absente"}`);
  console.log(
    `    colonnes space_id        ${model.scopedColumns.length} / ${ALL_TABLES.length}` +
      (model.scopedColumns.length > 0 ? `  (${model.scopedColumns.join(", ")})` : ""),
  );
  console.log(`    lignes rattachées        ${model.filled ? "oui" : "aucune"}\n`);

  /* ── AVANT ─────────────────────────────────────────────────────────────── */
  if (before) {
    if (model.filled) {
      throw new Error(
        "Des lignes portent déjà un space_id : le remplissage a commencé.\n" +
          "  L'état d'avant n'est plus observable, et c'est irréversible — le document\n" +
          "  le pose en prérequis absolu. Sur la dev, repartez d'une base propre\n" +
          "  (`npm run db:seed -- --reset`). En production, il est trop tard : un\n" +
          "  instantané pris maintenant décrirait l'après en croyant décrire l'avant.",
      );
    }

    const users = await measure(client);
    const snapshot: Snapshot = {
      takenAt: new Date().toISOString(),
      projectRef: target.projectRef,
      model,
      tableCounts: await readTableCounts(client),
      users,
    };

    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2), "utf8");

    console.log(`  ${users.length} utilisateur(s) mesuré(s) :\n`);
    for (const u of users) {
      const flag = u.hasProfile ? " " : "!";
      console.log(
        `   ${flag} ${u.email.padEnd(34)} ${String(u.transactions).padStart(4)} tx · ` +
          `${u.counts.accounts} compte(s) · solde ${u.balanceTotal}`,
      );
    }

    console.log("\n  Lignes par table :\n");
    for (const t of ALL_TABLES) {
      console.log(`    ${t.padEnd(14)} ${String(snapshot.tableCounts[t]).padStart(6)}`);
    }

    console.log(`\n  Empreinte : ${digest(users)}`);
    console.log(`  Instantané écrit :\n    ${SNAPSHOT}\n`);
    console.log("  Cet instantané est le seul témoin de l'état d'avant. Ne le supprimez pas");
    console.log("  avant que le --after correspondant soit passé au vert.\n");
    process.exit(0);
  }

  /* ── APRÈS ─────────────────────────────────────────────────────────────── */

  if (!existsSync(SNAPSHOT)) {
    throw new Error(
      `Aucun instantané pour cette base :\n    ${SNAPSHOT}\n` +
        "  Il fallait lancer --before AVANT le remplissage.",
    );
  }

  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as Snapshot;
  if (snapshot.projectRef !== target.projectRef) {
    throw new Error(
      `L'instantané a été pris sur le projet ${snapshot.projectRef}, pas ${target.projectRef}.`,
    );
  }

  console.log(`  Instantané du ${snapshot.takenAt} — ${snapshot.users.length} utilisateur(s).\n`);

  const now = await measure(client);

  await control1(client, model, snapshot);
  control2(now, snapshot);
  await control3(client, model);
  await control4(client, model, now);

  /* ── verdict ───────────────────────────────────────────────────────────── */

  const mark: Record<Status, string> = { ok: "✓", ko: "✗", pending: "○" };
  let current = 0;

  for (const c of checks) {
    if (c.control !== current) {
      current = c.control;
      console.log(`  ── CONTRÔLE ${current} ${"─".repeat(56)}`);
    }
    console.log(`   ${mark[c.status]} ${c.title}`);
    for (const n of c.notes) console.log(`      ${n}`);
  }

  const failed = checks.filter((c) => c.status === "ko");
  const waiting = checks.filter((c) => c.status === "pending");

  console.log("");
  if (failed.length > 0) {
    console.error(`  ✗ NO-GO — ${failed.length} contrôle(s) en échec.\n`);
    console.error("  Le document ne laisse pas le choix : un seul contrôle en échec suffit.");
    console.error("  Retour arrière immédiat — l'ancienne colonne existe encore.\n");
    exitCode = 1;
  } else if (waiting.length > 0) {
    console.log(
      `  ○ ${checks.length - waiting.length} contrôle(s) au vert, ` +
        `${waiting.length} en attente du modèle d'espaces.\n`,
    );
    console.log("  Rien n'est en échec. Les contrôles en attente sont les critères");
    console.log("  d'acceptation de la migration : ils virent au rouge d'eux-mêmes le jour");
    console.log("  où le modèle existe sans les satisfaire.\n");
  } else {
    console.log(`  ✓ GO — les ${checks.length} contrôles passent.\n`);
    console.log("  Surveillance rapprochée ensuite : rejouer les contrôles 1 et 3 chaque");
    console.log("  jour la première semaine, et n'ouvrir le Temps 4 qu'après plusieurs");
    console.log("  semaines sans incident.\n");
  }
} finally {
  await client.end();
}

process.exit(exitCode);
