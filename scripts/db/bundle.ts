/**
 * Chemin de secours : un seul fichier SQL à coller dans le SQL Editor Supabase.
 *
 *   node scripts/db/bundle.ts                 toutes les migrations
 *   node scripts/db/bundle.ts --through 0006  0001 → 0006
 *   node scripts/db/bundle.ts --only 0007     0007 seule
 *
 * À utiliser quand `migrate.ts` ne peut pas ouvrir de connexion : port 5432
 * filtré par le réseau, antivirus qui intercepte TLS, mot de passe de base
 * égaré. Le résultat est équivalent — mêmes migrations, même registre — au prix
 * d'un copier-coller manuel.
 *
 * Aucune connexion n'est ouverte ici, donc le script ignore ce que la base a
 * déjà reçu. C'est le rôle du garde-fou en tête du fichier généré : si l'une
 * des migrations demandées figure déjà au registre, il lève une exception, et
 * comme tout le fichier tient dans une transaction, rien ne s'exécute. C'est ce
 * qui empêche un second collage de recréer les 7 catégories système en double
 * (0002 et 0004 ne peuvent pas s'en protéger seules, faute d'index unique).
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { parseArgs, ROOT } from "./env.ts";
import { readMigrations } from "./client.ts";

const args = parseArgs(process.argv.slice(2));
const migrations = readMigrations();

const through = args.values.through ?? null;
const only = args.values.only ?? null;

const selected = only
  ? migrations.filter((m) => m.version === only)
  : migrations.filter((m) => through === null || m.version <= through);

if (selected.length === 0) {
  throw new Error("Aucune migration ne correspond à la sélection demandée.");
}

/** Une chaîne SQL littérale, apostrophes doublées. */
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

const versionList = selected.map((m) => lit(m.version)).join(", ");

const parts: string[] = [];

parts.push(`-- ============================================================================
-- Swiftly.io — lot de migrations généré par scripts/db/bundle.ts
-- ${new Date().toISOString()}
--
-- Migrations incluses : ${selected.map((m) => m.version).join(", ")}
--
-- MODE D'EMPLOI
--   1. Supabase → le projet visé → SQL Editor → New query
--   2. Coller ce fichier ENTIER (il commence par « begin; » et finit par « commit; »)
--   3. Run
--
-- Vérifiez le projet ouvert AVANT de coller : ce fichier ne sait pas où il
-- atterrit. En cas d'erreur, tout est annulé d'un bloc — la base reste intacte.
-- ============================================================================

begin;

-- Registre des migrations (voir scripts/db/client.ts). RLS activée sans
-- politique : refus net pour anon et authenticated.
create table if not exists public.schema_migrations (
  version     text        primary key,
  filename    text        not null,
  checksum    text        not null,
  applied_at  timestamptz not null default now(),
  applied_by  text        not null default current_user,
  baselined   boolean     not null default false
);
alter table public.schema_migrations enable row level security;

-- Garde-fou : on refuse de rejouer ce qui a déjà tourné.
do $swiftly_guard$
declare
  deja text;
begin
  select string_agg(version, ', ' order by version)
    into deja
    from public.schema_migrations
   where version in (${versionList});

  if deja is not null then
    raise exception
      'Migrations déjà au registre : %. Rien n''a été exécuté. Générez un lot restreint avec --only / --through.',
      deja;
  end if;
end
$swiftly_guard$;
`);

for (const m of selected) {
  parts.push(`
-- ============================================================================
-- ▼▼▼  ${m.filename}
-- ============================================================================

${m.sql.trim()}

insert into public.schema_migrations (version, filename, checksum)
values (${lit(m.version)}, ${lit(m.filename)}, ${lit(m.checksum)});

-- ▲▲▲  ${m.filename}
`);
}

parts.push(`
commit;

-- Contrôle : doit lister les migrations ci-dessus.
select version, filename, applied_at from public.schema_migrations order by version;
`);

const outDir = `${ROOT}supabase/.temp/`;
mkdirSync(outDir, { recursive: true });
const suffix = only ? `only-${only}` : through ? `through-${through}` : "toutes";
const outPath = `${outDir}bundle-${suffix}.sql`;
writeFileSync(outPath, parts.join("\n"), "utf8");

console.log(`\n  ${selected.length} migration(s) écrites dans :\n    ${outPath}\n`);
console.log("  Ce dossier est ignoré par git (supabase/.temp/ dans .gitignore).\n");
