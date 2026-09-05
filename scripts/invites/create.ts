/**
 * Crée des codes d'invitation pour la bêta fermée (SECURITY MASTERPLAN Point 19).
 *
 *   node scripts/invites/create.ts 5 "amis bêta"
 *   node scripts/invites/create.ts --list
 *
 * Pourquoi un script et pas une page d'administration : `POST
 * /api/admin/create-invitations` est décrit dans `lib/auth/README.md` mais n'a
 * jamais été codé (aucun `app/api/admin/`). Tant que la bêta tient en une
 * poignée de testeurs, un script local suffit et évite d'exposer une route
 * capable de créer des accès.
 *
 * Il importe `lib/auth/invite-codes.ts` plutôt que de refaire le HMAC : si le
 * hachage changeait ici sans changer là-bas, les codes émis seraient
 * silencieusement irrecevables.
 *
 * Le texte en clair n'existe qu'ici, une seule fois. La base ne stocke que
 * HMAC-SHA256(code, INVITE_CODE_PEPPER) — un code perdu est perdu.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { generateInviteCodes, inviteCodeHash } from "../../lib/auth/invite-codes.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** `.env.local` n'est pas chargé automatiquement hors de Next. */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(`${ROOT}.env.local`, "utf8");
  } catch {
    throw new Error("`.env.local` introuvable à la racine du dépôt.");
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const PEPPER = env.INVITE_CODE_PEPPER;

for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", URL_],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE],
  ["INVITE_CODE_PEPPER", PEPPER],
] as const) {
  if (!value) {
    console.error(`[env] ${name} est absent de .env.local — impossible de continuer.`);
    process.exit(1);
  }
}

const headers = {
  apikey: SERVICE,
  Authorization: `Bearer ${SERVICE}`,
  "Content-Type": "application/json",
};

/* ── --list : l'état des codes, sans jamais révéler leur texte ───────────── */

async function list(): Promise<void> {
  const res = await fetch(
    `${URL_}/rest/v1/invitation_codes?select=used_at,expires_at,note,created_at&order=created_at`,
    { headers },
  );
  if (!res.ok) {
    console.error(`Lecture impossible : ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const rows = (await res.json()) as {
    used_at: string | null;
    expires_at: string;
    note: string | null;
    created_at: string;
  }[];

  const now = Date.now();
  let free = 0;
  console.log(`\n${rows.length} code(s) en base :\n`);
  for (const r of rows) {
    const expired = new Date(r.expires_at).getTime() < now;
    let state: string;
    if (r.used_at) state = `utilisé le ${r.used_at.slice(0, 10)}`;
    else if (expired) state = `expiré le ${r.expires_at.slice(0, 10)}`;
    else {
      state = `LIBRE (expire le ${r.expires_at.slice(0, 10)})`;
      free++;
    }
    console.log(`  · ${state.padEnd(34)}${r.note ?? ""}`);
  }
  console.log(
    `\n${free} code(s) encore utilisable(s).` +
      (free ? " Leur texte en clair n'est pas récupérable — il n'existe que là où il a été noté." : ""),
  );
}

/* ── création ────────────────────────────────────────────────────────────── */

async function create(count: number, note: string): Promise<void> {
  const codes = generateInviteCodes(count); // lève RangeError hors 1…200
  const rows = codes.map((code) => ({
    code_hash: inviteCodeHash(code, PEPPER),
    note,
  }));

  const res = await fetch(`${URL_}/rest/v1/invitation_codes`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    console.error(`Insertion refusée : ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const created = (await res.json()) as { expires_at: string }[];
  const expiry = created[0]?.expires_at?.slice(0, 10) ?? "dans 30 jours";

  console.log(`\n${codes.length} code(s) créé(s), valables jusqu'au ${expiry} :\n`);
  for (const code of codes) console.log(`      ${code}`);
  console.log(
    `\n  Note enregistrée : « ${note} »\n` +
      `\n  ⚠️  Ces codes ne s'afficheront plus jamais. La base ne contient que leur\n` +
      `      empreinte HMAC. Copie-les maintenant.\n` +
      `\n  Chaque code ouvre UN compte, puis devient inutilisable.\n`,
  );
}

/* ── entrée ──────────────────────────────────────────────────────────────── */

const [arg, ...rest] = process.argv.slice(2);

if (arg === "--list") {
  await list();
} else {
  const count = Number(arg ?? "5");
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    console.error(
      "Usage :\n" +
        '  node scripts/invites/create.ts <nombre 1-200> ["note"]\n' +
        "  node scripts/invites/create.ts --list\n",
    );
    process.exit(1);
  }
  const note = rest.join(" ") || `bêta ${new Date().toISOString().slice(0, 10)}`;
  await create(count, note);
}
