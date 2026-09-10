/**
 * Connexion Postgres + registre des migrations appliquées.
 *
 * Pourquoi un vrai client Postgres et pas `fetch` sur PostgREST, comme le fait
 * `scripts/invites/create.ts` : PostgREST ne sait faire que du DML (select,
 * insert, update, delete sur des tables existantes). Créer une table, ajouter
 * une colonne, poser une contrainte — tout ce que contiennent les fichiers de
 * `supabase/migrations/` — passe obligatoirement par une connexion Postgres.
 *
 * Pourquoi un registre : trois de nos migrations NE SONT PAS rejouables.
 *
 *   0002  seed les catégories système avec `on conflict do nothing`, mais la
 *         table `categories` n'a aucun index unique sur (user_id, name, kind) :
 *         il n'y a donc aucun conflit à détecter, et un second passage crée
 *         7 doublons de catégories système. (0004 insère « Frais bancaires »
 *         de la bonne façon, avec un `where not exists` — elle, est rejouable.)
 *   0006  `update public.users set theme = 'system' where theme = 'light'`,
 *         que le fichier signale lui-même comme non rejouable : un second
 *         passage écraserait les « Clair » choisis délibérément depuis.
 *   0007  `update ... set kind = 'income' where exists (...)` reclasse des
 *         lignes selon leur usage ; rejoué après que l'utilisateur a corrigé
 *         un classement à la main, il le défait.
 *
 * Sans registre, « rejouer les migrations » corrompt donc les données à chaque
 * fois. `public.schema_migrations` retient ce qui a déjà tourné, et personne
 * n'a plus à se souvenir de rien.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

import { ROOT, type Target, describeTarget } from "./env.ts";

export const MIGRATIONS_DIR = `${ROOT}supabase/migrations/`;

export interface Migration {
  /** Le préfixe numérique, « 0007 ». C'est la clé du registre. */
  readonly version: string;
  readonly filename: string;
  readonly sql: string;
  readonly checksum: string;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Les migrations du dépôt, dans l'ordre lexicographique de leur nom. */
export function readMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((filename) => {
      const version = filename.match(/^(\d+)/)?.[1];
      if (!version) {
        throw new Error(
          `\`supabase/migrations/${filename}\` ne commence pas par un numéro.\n` +
            "  Le registre est indexé par ce numéro : renommez le fichier en 000N_....sql.",
        );
      }
      const sql = readFileSync(MIGRATIONS_DIR + filename, "utf8");
      return { version, filename, sql, checksum: sha256(sql) };
    });
}

/* ── connexion ────────────────────────────────────────────────────────────── */

export async function openClient(target: Target): Promise<pg.Client> {
  if (!target.dbUrl) {
    throw new Error(
      `SUPABASE_DB_URL est absent de \`${target.envFile}\`.\n` +
        "  → Supabase → Project Settings → Database → Connection string → URI,\n" +
        "    en choisissant « Session pooler ». Voir scripts/db/README.md.",
    );
  }

  const url = new URL(target.dbUrl);
  if (url.port === "6543") {
    console.warn(
      "  ⚠  SUPABASE_DB_URL utilise le port 6543 (transaction pooler). Le DDL y est\n" +
        "     fragile (pas de requêtes préparées, transactions écourtées). Prenez la\n" +
        "     chaîne « Session pooler », port 5432.\n",
    );
  }

  const client = new pg.Client({
    connectionString: target.dbUrl,
    // Supabase impose TLS mais présente une chaîne que Node ne sait pas valider
    // seul (autorité interne). `rejectUnauthorized: false` chiffre toujours le
    // transport, sans authentifier le serveur. Pour une vérification complète,
    // téléchargez le certificat depuis Supabase → Database → SSL Configuration
    // et posez PGSSLROOTCERT sur son chemin : la branche stricte ci-dessous
    // prend alors le relais.
    ssl: process.env.PGSSLROOTCERT
      ? { ca: readFileSync(process.env.PGSSLROOTCERT, "utf8"), rejectUnauthorized: true }
      : { rejectUnauthorized: false },
    application_name: `swiftly-scripts-db (${target.name})`,
    // Un script bloqué sur une base injoignable doit rendre la main vite.
    connectionTimeoutMillis: 20_000,
    statement_timeout: 120_000,
  });

  try {
    await client.connect();
  } catch (cause) {
    throw new Error(
      `Connexion impossible à la base ${describeTarget(target)}.\n` +
        `  ${(cause as Error).message}\n` +
        "  Pistes : mot de passe non encodé pour-cent, mauvaise région dans l'hôte\n" +
        "  du pooler, ou antivirus interceptant TLS. Chemin de secours sans connexion\n" +
        "  directe : `node scripts/db/bundle.ts` puis collage dans le SQL Editor.",
      { cause },
    );
  }
  return client;
}

/* ── registre ─────────────────────────────────────────────────────────────── */

/**
 * Le registre est créé par ce script, pas par une migration numérotée : c'est
 * de l'outillage, pas du schéma applicatif. RLS activée sans aucune politique —
 * refus net pour `anon` et `authenticated`, conformément à la règle du dépôt
 * pour les tables écrites uniquement côté serveur (supabase/README.md, Point 4).
 * `scripts/db/schema.ts` l'exclut de la comparaison dev ↔ prod pour cette même
 * raison : sa présence n'est pas une divergence de schéma.
 */
export async function ensureLedger(client: pg.Client): Promise<void> {
  await client.query(`
    create table if not exists public.schema_migrations (
      version     text        primary key,
      filename    text        not null,
      checksum    text        not null,
      applied_at  timestamptz not null default now(),
      applied_by  text        not null default current_user,
      baselined   boolean     not null default false
    );
    alter table public.schema_migrations enable row level security;
    comment on table public.schema_migrations is
      'Registre des migrations appliquées (scripts/db/migrate.ts). Outillage, pas du schéma applicatif.';
  `);
}

export interface LedgerRow {
  readonly version: string;
  readonly filename: string;
  readonly checksum: string;
  readonly applied_at: Date;
  readonly baselined: boolean;
}

export async function readLedger(client: pg.Client): Promise<Map<string, LedgerRow>> {
  const { rows } = await client.query<LedgerRow>(
    "select version, filename, checksum, applied_at, baselined from public.schema_migrations order by version",
  );
  return new Map(rows.map((r) => [r.version, r]));
}

export async function recordApplied(
  client: pg.Client,
  migration: Migration,
  baselined: boolean,
): Promise<void> {
  await client.query(
    `insert into public.schema_migrations (version, filename, checksum, baselined)
     values ($1, $2, $3, $4)
     on conflict (version) do update
       set filename = excluded.filename,
           checksum = excluded.checksum,
           baselined = excluded.baselined,
           applied_at = now()`,
    [migration.version, migration.filename, migration.checksum, baselined],
  );
}

/**
 * Applique un fichier dans UNE transaction, registre compris.
 *
 * Postgres sait annuler du DDL : si la migration échoue à sa dernière ligne,
 * les précédentes disparaissent avec elle et le registre n'est pas écrit. La
 * base reste donc exactement dans l'état d'avant — c'est ce qui rend la
 * migration multi-espaces réessayable autant de fois qu'il le faudra.
 */
export async function applyMigration(client: pg.Client, migration: Migration): Promise<void> {
  await client.query("begin");
  try {
    await client.query(migration.sql);
    await recordApplied(client, migration, false);
    await client.query("commit");
  } catch (cause) {
    await client.query("rollback");
    throw new Error(
      `${migration.filename} a échoué — la transaction a été annulée, la base est intacte.\n` +
        `  ${(cause as Error).message}`,
      { cause },
    );
  }
}
