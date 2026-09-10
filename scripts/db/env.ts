/**
 * Cible base de données — le sélecteur commun à tous les scripts de `scripts/db/`.
 *
 * Depuis le 2026-09-09 le dépôt parle à DEUX projets Supabase :
 *
 *   dev  ← `.env.local` : la base de travail. C'est elle que `next dev` ouvre,
 *         elle que ces scripts ouvrent par défaut, et la seule sur laquelle on
 *         répète une migration jusqu'à ce qu'elle passe sans erreur.
 *   prod ← `.env.prod`  : la production. Aucun script ne l'ouvre sans
 *         `--target prod` ET une confirmation tapée à la main.
 *
 * Pourquoi `.env.prod` et surtout PAS `.env.production` : Next cherche les
 * variables dans l'ordre `.env.$(NODE_ENV).local`, `.env.local`,
 * `.env.$(NODE_ENV)`, `.env` (doc Next « Environment Variables », §
 * Environment Variable Load Order — node_modules/next/dist/docs/01-app/
 * 02-guides/environment-variables.md). Un fichier `.env.production` serait donc
 * avalé par `next build`, et les clés de production repartiraient dans le
 * bundle qu'on cherche précisément à séparer. `.env.prod` ne correspond à aucun
 * NODE_ENV : Next l'ignore, ces scripts sont les seuls à le lire.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Le project ref de la PRODUCTION, en dur.
 *
 * Ce n'est pas un secret : il est inliné dans le bundle JS servi par
 * https://swiftly-io.vercel.app, donc public depuis toujours. Il est ici pour
 * une seule raison — servir de garde-fou. Si `.env.local` se remet un jour à
 * pointer là-dessus (copier-coller malheureux, restauration d'une vieille copie
 * du fichier), tout script lancé en `--target dev` s'arrête net au lieu
 * d'écrire dans la base des vrais utilisateurs. C'est exactement l'accident
 * qu'on élimine aujourd'hui.
 */
export const PROD_PROJECT_REF = "dloyglqjmeipbtsjnncd";

export type TargetName = "dev" | "prod";

export interface Target {
  readonly name: TargetName;
  readonly envFile: string;
  readonly projectRef: string;
  readonly supabaseUrl: string;
  readonly anonKey: string;
  readonly serviceKey: string;
  /** Chaîne de connexion Postgres. Absente tant que le DDL n'est pas nécessaire. */
  readonly dbUrl: string | null;
}

/* ── lecture d'un fichier .env ────────────────────────────────────────────── */

export function loadEnvFile(relPath: string): Record<string, string> {
  const abs = `${ROOT}${relPath}`;
  if (!existsSync(abs)) {
    throw new Error(
      `\`${relPath}\` est introuvable à la racine du dépôt.\n` +
        `  → voir scripts/db/README.md § « Les deux fichiers d'environnement ».`,
    );
  }
  const env: Record<string, string> = {};
  for (const line of readFileSync(abs, "utf8").split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

/* ── extraction du project ref ────────────────────────────────────────────── */

export function projectRefFromSupabaseUrl(url: string): string | null {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.(co|in)\/?$/i);
  return m ? m[1]!.toLowerCase() : null;
}

/**
 * Le ref tel qu'il apparaît dans une chaîne de connexion Postgres.
 * Deux formes possibles chez Supabase :
 *   pooler  postgresql://postgres.<ref>:<pwd>@aws-1-<region>.pooler.supabase.com:5432/postgres
 *   direct  postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres
 * On passe par `new URL` plutôt que par une expression régulière : un mot de
 * passe contenant « @ » ou « : » ferait dérailler la seconde, alors que l'URI
 * exige de toute façon un encodage pour-cent qui rend l'analyse fiable.
 */
export function projectRefFromDbUrl(dbUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(dbUrl);
  } catch {
    throw new Error(
      "SUPABASE_DB_URL n'est pas une URI valide.\n" +
        "  → si le mot de passe contient un caractère spécial (@ : / # ?), il doit être\n" +
        "    encodé pour-cent. Copiez la chaîne telle que Supabase la donne dans\n" +
        "    Project Settings → Database → Connection string → URI.",
    );
  }
  const user = decodeURIComponent(u.username);
  if (user.startsWith("postgres.")) return user.slice("postgres.".length).toLowerCase();
  const direct = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.(co|in)$/i);
  return direct ? direct[1]!.toLowerCase() : null;
}

/* ── résolution + garde-fous ──────────────────────────────────────────────── */

const ENV_FILE: Record<TargetName, string> = {
  dev: ".env.local",
  prod: ".env.prod",
};

export function resolveTarget(name: TargetName): Target {
  const envFile = ENV_FILE[name];
  const env = loadEnvFile(envFile);

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const dbUrl = env.SUPABASE_DB_URL || null;

  for (const [key, value] of [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anonKey],
    ["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
  ] as const) {
    if (!value) throw new Error(`${key} est absent de \`${envFile}\`.`);
  }

  const projectRef = projectRefFromSupabaseUrl(supabaseUrl);
  if (!projectRef) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL de \`${envFile}\` ne ressemble pas à une URL de projet\n` +
        `  Supabase (https://<ref>.supabase.co) : ${supabaseUrl}`,
    );
  }

  // ── les deux garde-fous, symétriques ──────────────────────────────────────
  if (name === "dev" && projectRef === PROD_PROJECT_REF) {
    throw new Error(
      "REFUS : `.env.local` pointe sur la PRODUCTION.\n" +
        `  ref trouvé : ${projectRef} (= PROD_PROJECT_REF)\n` +
        "  `.env.local` doit décrire la base de dev. Les clés de production vivent\n" +
        "  dans `.env.prod`, et n'y sont lues qu'avec --target prod.",
    );
  }
  if (name === "prod" && projectRef !== PROD_PROJECT_REF) {
    throw new Error(
      "REFUS : `.env.prod` ne pointe pas sur la production connue.\n" +
        `  attendu : ${PROD_PROJECT_REF}\n  trouvé  : ${projectRef}\n` +
        "  Si la production a changé de projet, mettez à jour PROD_PROJECT_REF dans\n" +
        "  scripts/db/env.ts — délibérément, pas au passage.",
    );
  }

  if (dbUrl) {
    const dbRef = projectRefFromDbUrl(dbUrl);
    if (dbRef && dbRef !== projectRef) {
      throw new Error(
        `REFUS : \`${envFile}\` se contredit.\n` +
          `  NEXT_PUBLIC_SUPABASE_URL désigne le projet ${projectRef}\n` +
          `  SUPABASE_DB_URL       désigne le projet ${dbRef}\n` +
          "  Un script écrirait alors ses données dans une base et ses vérifications\n" +
          "  dans une autre. Corrigez le fichier avant de relancer.",
      );
    }
  }

  return { name, envFile, projectRef, supabaseUrl, anonKey, serviceKey, dbUrl };
}

/* ── analyse de la ligne de commande ──────────────────────────────────────── */

export interface Args {
  readonly target: TargetName;
  readonly flags: ReadonlySet<string>;
  readonly values: Readonly<Record<string, string>>;
  readonly positional: readonly string[];
}

export function parseArgs(argv: readonly string[]): Args {
  const flags = new Set<string>();
  const values: Record<string, string> = {};
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [name, inline] = arg.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (inline !== undefined) {
      values[name!] = inline;
    } else if (next !== undefined && !next.startsWith("--")) {
      values[name!] = next;
      i++;
    } else {
      flags.add(name!);
    }
  }

  const rawTarget = values.target ?? "dev";
  if (rawTarget !== "dev" && rawTarget !== "prod") {
    throw new Error(`--target accepte « dev » ou « prod », pas « ${rawTarget} ».`);
  }

  return { target: rawTarget, flags, values, positional };
}

/**
 * Confirmation manuelle avant toute écriture en production.
 *
 * En terminal : il faut retaper le project ref. En non interactif (CI, tâche
 * planifiée) : `SWIFTLY_CONFIRM_PROD=<ref>` doit être posé explicitement. Dans
 * les deux cas l'accord vaut pour CETTE exécution, jamais mémorisé.
 */
export async function confirmProd(target: Target, action: string): Promise<void> {
  if (target.name !== "prod") return;

  const banner =
    `\n  ⚠  CIBLE : PRODUCTION (${target.projectRef})\n` +
    `     action : ${action}\n` +
    `     Cette base contient les données des vrais utilisateurs.\n`;

  if (!stdin.isTTY) {
    if (process.env.SWIFTLY_CONFIRM_PROD === target.projectRef) {
      console.warn(`${banner}     confirmé par SWIFTLY_CONFIRM_PROD.\n`);
      return;
    }
    throw new Error(
      `${banner}     Terminal non interactif : posez SWIFTLY_CONFIRM_PROD=${target.projectRef}\n` +
        "     pour confirmer, ou relancez depuis un vrai terminal.",
    );
  }

  console.warn(banner);
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question(`     Tapez le ref « ${target.projectRef} » pour continuer : `);
    if (answer.trim() !== target.projectRef) {
      throw new Error("Confirmation incorrecte — rien n'a été exécuté.");
    }
    console.warn("");
  } finally {
    rl.close();
  }
}

/** Étiquette commune à l'en-tête de chaque script. */
export function describeTarget(target: Target): string {
  const label = target.name === "prod" ? "PRODUCTION" : "dev";
  return `${label} · ${target.projectRef} · ${target.envFile}`;
}
