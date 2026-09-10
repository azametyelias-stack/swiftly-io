import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Aucun fichier d'environnement ne doit être VISIBLE par git — sauf le gabarit.
 *
 * Le dépôt est public et `.env.prod` porte la clé service_role de production :
 * celle qui contourne RLS et lit les lignes de tous les utilisateurs. Un seul
 * `git add -A` sur un fichier non ignoré, et le secret est dans l'historique
 * pour toujours — le retirer ensuite ne le retire pas des clones ni des forks.
 *
 * Pourquoi ce test EN PLUS du .gitignore : un motif ne couvre que les noms
 * qu'on a su prévoir. Le 2026-09-10, `.env.*` exigeait un point après « env »,
 * si bien que `.envrc` — le fichier de direnv, qui ne contient QUE des
 * secrets — serait parti au premier commit. Le motif a été élargi ; ce test
 * existe pour le cas d'après, celui qu'on n'a pas encore imaginé. Il ne
 * raisonne pas sur des motifs : il demande à git ce qu'il voit, et refuse tout
 * ce qui ressemble à un fichier d'environnement.
 *
 * Si ce test échoue : NE COMMITEZ RIEN. Ajoutez le fichier au .gitignore, et
 * s'il a déjà été commité, considérez la clé comme compromise — il faut la
 * faire tourner (Supabase → Settings → API Keys), pas seulement la retirer.
 */

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

/** Le seul nom qu'on accepte de publier : le gabarit documenté, sans valeurs. */
const TEMPLATES = new Set([".env.example"]);

/**
 * Ce qui compte comme « fichier d'environnement ». Volontairement large — un
 * faux positif coûte une ligne d'allow-list, un faux négatif coûte une clé.
 * `env.ts` n'entre pas dedans : lib/env/*.ts et scripts/db/env.ts sont du code.
 */
function looksLikeEnvFile(basename: string): boolean {
  if (basename.endsWith(".ts") || basename.endsWith(".d.ts")) return false;
  if (basename.startsWith(".env")) return true;          // .env, .env.local, .envrc, .env-prod
  if (basename.endsWith(".env")) return true;            // secrets.env, prod.env
  return /^env\.(local|prod|production|development|dev|test)$/.test(basename); // point de tête oublié
}

function git(args: string[]): string[] {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

let visibleToGit: string[] | null = null;
try {
  // Suivis + non-suivis-non-ignorés = tout ce qu'un `git add -A` emporterait.
  // Les sous-modules (ecc/) apparaissent comme une seule entrée, pas leur
  // contenu : leur .gitignore est leur affaire.
  visibleToGit = [...git(["ls-files"]), ...git(["ls-files", "--others", "--exclude-standard"])];
} catch {
  visibleToGit = null; // pas un checkout git (archive, tarball) — rien à vérifier
}

test("aucun fichier d'environnement n'est visible par git (hors gabarit)", (t) => {
  if (visibleToGit === null) return t.skip("hors dépôt git");

  const exposed = visibleToGit
    .filter((p) => looksLikeEnvFile(p.split("/").pop()!))
    .filter((p) => !TEMPLATES.has(p.split("/").pop()!));

  assert.deepEqual(
    exposed,
    [],
    `fichier(s) d'environnement exposé(s) au dépôt public : ${exposed.join(", ")}\n` +
      `→ ajoutez-les au .gitignore AVANT tout commit ; s'ils y sont déjà, faites tourner les clés.`,
  );
});

test(".gitignore couvre les noms de fichiers d'environnement usuels", (t) => {
  if (visibleToGit === null) return t.skip("hors dépôt git");

  // `git check-ignore` répond sur des chemins qui n'existent pas : on teste le
  // motif, pas l'arborescence du jour.
  const mustBeIgnored = [
    ".env",
    ".env.local",
    ".env.prod",
    ".env.production",
    ".env.local.bak-prod",
    ".envrc",           // direnv — le trou du 2026-09-10
    ".env-prod",
    ".environment",
    "secrets.env",
  ];

  const missed = mustBeIgnored.filter((name) => {
    try {
      execFileSync("git", ["check-ignore", "-q", "--", name], { cwd: repoRoot });
      return false;
    } catch {
      return true;
    }
  });

  assert.deepEqual(missed, [], `noms non couverts par .gitignore : ${missed.join(", ")}`);
});

test("le gabarit .env.example reste committable", (t) => {
  if (visibleToGit === null) return t.skip("hors dépôt git");

  // Le pendant du test précédent : élargir le motif ne doit pas emporter le
  // gabarit, seul fichier d'environnement que le dépôt DOIT porter.
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--", ".env.example"], { cwd: repoRoot });
    ignored = true;
  } catch {
    ignored = false;
  }
  assert.equal(ignored, false, ".env.example est devenu ignoré — le gabarit doit rester versionné");
});
