/**
 * Applique les migrations de `supabase/migrations/` sur une base.
 *
 *   node scripts/db/migrate.ts --status                  état des deux côtés
 *   node scripts/db/migrate.ts                           applique tout ce qui manque (dev)
 *   node scripts/db/migrate.ts --through 0006            s'arrête après 0006
 *   node scripts/db/migrate.ts --only 0007               n'applique que 0007
 *   node scripts/db/migrate.ts --dry-run                 dit ce qu'il ferait
 *   node scripts/db/migrate.ts --baseline 0006 --target prod
 *                                                        déclare 0001→0006 déjà
 *                                                        appliquées SANS les rejouer
 *
 * `--baseline` existe pour un cas précis, celui de la production : elle porte
 * déjà 0001→0006, appliquées à la main dans le SQL Editor bien avant que ce
 * registre existe. La rejouer serait destructeur (voir l'en-tête de client.ts).
 * `--baseline 0006` inscrit donc ces six lignes au registre sans exécuter une
 * seule instruction, après quoi la production est dans le même régime que la
 * dev et `--only 0007` fait le reste.
 */
import { parseArgs, resolveTarget, confirmProd, describeTarget } from "./env.ts";
import {
  openClient,
  ensureLedger,
  readLedger,
  readMigrations,
  applyMigration,
  recordApplied,
  type Migration,
} from "./client.ts";

const args = parseArgs(process.argv.slice(2));
const target = resolveTarget(args.target);
const migrations = readMigrations();

const dryRun = args.flags.has("dry-run");
const statusOnly = args.flags.has("status");
const through = args.values.through ?? null;
const only = args.values.only ?? null;
const baseline = args.values.baseline ?? null;

function requireKnownVersion(version: string, flag: string): void {
  if (!migrations.some((m) => m.version === version)) {
    throw new Error(
      `${flag} ${version} : aucune migration ne porte ce numéro.\n` +
        `  connues : ${migrations.map((m) => m.version).join(", ")}`,
    );
  }
}
if (through) requireKnownVersion(through, "--through");
if (only) requireKnownVersion(only, "--only");
if (baseline) requireKnownVersion(baseline, "--baseline");

console.log(`\n  base : ${describeTarget(target)}\n`);

const client = await openClient(target);
try {
  await ensureLedger(client);
  const ledger = await readLedger(client);

  /* ── état ──────────────────────────────────────────────────────────────── */

  const drift: Migration[] = [];
  const lines = migrations.map((m) => {
    const row = ledger.get(m.version);
    let state: string;
    if (!row) {
      state = "en attente";
    } else if (row.checksum !== m.checksum) {
      state = "APPLIQUÉE ≠ FICHIER";
      drift.push(m);
    } else {
      state = row.baselined ? "déclarée (baseline)" : "appliquée";
    }
    const when = row ? row.applied_at.toISOString().slice(0, 16).replace("T", " ") : "—";
    return `    ${m.version}  ${m.filename.padEnd(34)} ${state.padEnd(20)} ${when}`;
  });
  console.log("    ver   fichier                             état                 le");
  console.log("    ────  ──────────────────────────────────  ───────────────────  ────────────────");
  console.log(lines.join("\n"));
  console.log("");

  if (drift.length > 0) {
    console.warn(
      `  ⚠  ${drift.length} migration(s) ont changé sur disque APRÈS avoir été appliquées :\n` +
        drift.map((m) => `       ${m.filename}`).join("\n") +
        "\n     La base ne porte donc pas ce que dit le dépôt. Sur la base de dev, la\n" +
        "     réponse est de la reconstruire (voir README § « Repartir de zéro »).\n" +
        "     Sur la production, c'est à examiner avant toute chose.\n",
    );
  }

  if (statusOnly) {
    process.exit(drift.length > 0 ? 1 : 0);
  }

  /* ── sélection ─────────────────────────────────────────────────────────── */

  let selected: Migration[];
  if (baseline) {
    selected = migrations.filter((m) => m.version <= baseline && !ledger.has(m.version));
  } else if (only) {
    selected = migrations.filter((m) => m.version === only && !ledger.has(m.version));
  } else {
    selected = migrations.filter(
      (m) => !ledger.has(m.version) && (through === null || m.version <= through),
    );
  }

  if (selected.length === 0) {
    console.log("  Rien à faire — tout ce qui était demandé est déjà au registre.\n");
    process.exit(0);
  }

  const verb = baseline ? "déclarer (sans exécuter)" : "appliquer";
  console.log(`  À ${verb} :\n${selected.map((m) => `       ${m.filename}`).join("\n")}\n`);

  if (dryRun) {
    console.log("  --dry-run : rien n'a été exécuté.\n");
    process.exit(0);
  }

  await confirmProd(target, `${verb} ${selected.length} migration(s)`);

  /* ── exécution ─────────────────────────────────────────────────────────── */

  for (const m of selected) {
    const started = Date.now();
    if (baseline) {
      await recordApplied(client, m, true);
      console.log(`    ✓ ${m.filename} — déclarée, non exécutée`);
    } else {
      await applyMigration(client, m);
      console.log(`    ✓ ${m.filename} — ${Date.now() - started} ms`);
    }
  }
  console.log(`\n  ${selected.length} migration(s) traitée(s) sur ${describeTarget(target)}.\n`);
} finally {
  await client.end();
}
