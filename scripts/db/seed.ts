/**
 * Remplit la base de dev de données représentatives.
 *
 *   node scripts/db/seed.ts                 crée ce qui manque
 *   node scripts/db/seed.ts --reset         supprime les comptes de seed, puis recrée
 *   node scripts/db/seed.ts --summary       compte ce qui existe, n'écrit rien
 *
 * Une base vide ne prouve rien. La migration multi-espaces va déplacer neuf
 * tables de `user_id` vers `space_id` : les seules erreurs qui comptent —
 * lignes orphelines, clés étrangères qui pointent à travers deux espaces,
 * agrégats faux — n'apparaissent que s'il y a plusieurs utilisateurs, des
 * comptes, des transactions reliées entre elles et des budgets. D'où ce jeu.
 *
 * ── ce que le jeu couvre volontairement ────────────────────────────────────
 *
 *   • trois utilisateurs, dont un presque vide (le cas limite qu'on oublie)
 *   • un usage « perso » et un usage « pro » — les deux futurs types d'espace
 *   • les 4 situations que 0007 doit départager, pour chaque personne :
 *       revenu seul → 'income' · dépense seule → 'expense'
 *       les deux    → 'income' (le revenu l'emporte) · jamais utilisée → 'expense'
 *   • les trois types de transaction, dont un virement entre deux comptes
 *   • une dépense rattachée à un projet, qui fait travailler account_balance()
 *   • des lignes sur trois mois, pour que les écrans de statistiques aient
 *     matière et que les rapports mensuels aient un sens
 *
 * ── compatible avant ET après 0007 ─────────────────────────────────────────
 *
 *   Le script regarde si `people.kind` existe avant d'écrire. C'est ce qui lui
 *   permet de tourner sur une base arrêtée à 0006 — l'état exact dans lequel il
 *   faut être pour tester 0007 sur des lignes qui la précèdent — puis de
 *   resservir tel quel une fois la base à jour.
 *
 * Les mots de passe sont sans conséquence : ces comptes n'existent que sur la
 * base de dev, que `env.ts` empêche d'être la production.
 */
import type pg from "pg";
// `pg` n'est importé que comme type ci-dessus ; escapeIdentifier est une vraie
// valeur, il lui faut son propre import.
import { escapeIdentifier } from "pg";

import { parseArgs, resolveTarget, describeTarget, loadEnvFile, type Target } from "./env.ts";
import { openClient } from "./client.ts";
import { inviteCodeHash, syntheticInviteEmail } from "../../lib/auth/invite-codes.ts";

const args = parseArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

if (target.name === "prod") {
  throw new Error(
    "REFUS : le seed n'est pas fait pour la production.\n" +
      "  Il crée de faux utilisateurs et de fausses transactions. Il n'existe aucune\n" +
      "  raison de le lancer ailleurs que sur la base de dev.",
  );
}

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "swiftly-dev-2026";

/**
 * Le poivre qui hache les codes. Lu dans le MEME fichier .env que la cible :
 * un code n'ouvre que la base dont le fichier porte le poivre qui l'a hache.
 */
const PEPPER = loadEnvFile(target.envFile).INVITE_CODE_PEPPER ?? "";
if (!PEPPER) {
  throw new Error(
    `INVITE_CODE_PEPPER est absent de \`${target.envFile}\`.
  Sans lui le seed ne peut pas hacher les codes d'invitation, donc pas
  fabriquer de comptes dans lesquels on puisse entrer.`,
  );
}

/* ── petit socle ──────────────────────────────────────────────────────────── */

/** Le 1er du mois courant décalé de `offset` mois, au format date SQL. */
function monthDay(offset: number, day: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, day));
  return d.toISOString().slice(0, 10);
}
const monthStart = (offset: number) => monthDay(offset, 1);

async function insertId(
  client: pg.Client,
  table: string,
  row: Record<string, unknown>,
): Promise<string> {
  // Les VALEURS passent par $1..$n — jamais dans le texte SQL. Restent la table
  // et les colonnes : SQL n'accepte pas de paramètre à la place d'un
  // identifiant, il faut donc les écrire dans la requête. `escapeIdentifier`
  // les met entre guillemets et double ceux qu'ils contiennent, ce qui rend la
  // sortie inerte même si un jour un nom venait d'ailleurs que d'un littéral
  // de ce fichier.
  const cols = Object.keys(row).map((c) => escapeIdentifier(c));
  const holes = cols.map((_, i) => `$${i + 1}`);
  const target = `public.${escapeIdentifier(table)}`;
  // Identifiants échappés ci-dessus, valeurs paramétrées : la règle regex ne
  // sait pas lire la différence entre les deux.
  // nosemgrep: swiftly-sql-string-interpolation
  const sql = `insert into ${target} (${cols.join(", ")}) values (${holes.join(", ")}) returning id`;
  const { rows } = await client.query<{ id: string }>(sql, Object.values(row));
  return rows[0]!.id;
}

async function columnExists(client: pg.Client, table: string, column: string): Promise<boolean> {
  const { rowCount } = await client.query(
    `select 1 from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = $2`,
    [table, column],
  );
  return (rowCount ?? 0) > 0;
}

async function tableExists(client: pg.Client, table: string): Promise<boolean> {
  const { rows } = await client.query<{ ok: boolean }>(
    `select to_regclass('public.' || $1) is not null as ok`,
    [table],
  );
  return rows[0]?.ok === true;
}

/* ── comptes d'authentification (Admin API) ───────────────────────────────── */

interface AuthUser {
  readonly id: string;
  readonly email: string;
}

function adminHeaders(t: Target): Record<string, string> {
  return {
    apikey: t.serviceKey,
    Authorization: `Bearer ${t.serviceKey}`,
    "Content-Type": "application/json",
  };
}

async function listAuthUsers(t: Target): Promise<AuthUser[]> {
  const res = await fetch(`${t.supabaseUrl}/auth/v1/admin/users?per_page=200`, {
    headers: adminHeaders(t),
  });
  if (!res.ok) {
    throw new Error(`Admin API (liste) a répondu ${res.status} : ${await res.text()}`);
  }
  const body = (await res.json()) as { users?: AuthUser[] };
  return body.users ?? [];
}

async function createAuthUser(t: Target, email: string, name: string): Promise<AuthUser> {
  const res = await fetch(`${t.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(t),
    body: JSON.stringify({
      email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { name, seeded: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`Admin API (création de ${email}) a répondu ${res.status} : ${await res.text()}`);
  }
  return (await res.json()) as AuthUser;
}

async function deleteAuthUser(t: Target, id: string): Promise<void> {
  const res = await fetch(`${t.supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: "DELETE",
    headers: adminHeaders(t),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Admin API (suppression) a répondu ${res.status} : ${await res.text()}`);
  }
}

/* ── le jeu de données ────────────────────────────────────────────────────── */

interface Profile {
  /** Identifiant court, interne au seed. Remplace l'ancienne adresse e-mail. */
  readonly slug: string;
  /** Le code a six chiffres qui ouvre ce compte depuis l'ecran 2. */
  readonly code: string;
  /** Une ligne pour le recapitulatif de fin. */
  readonly blurb: string;
  readonly name: string;
  readonly currency: "XOF" | "EUR" | "USD";
  readonly language: "fr" | "en";
  readonly theme: "light" | "dark";
}

/**
 * `theme` reste 'light' ou 'dark' — jamais 'system' : 0006 seulement ajoute la
 * troisième valeur, et s'en tenir aux deux anciennes évite de dépendre d'elle.
 * Le plancher réel du seed est 0005, qui apporte les colonnes d'alerte
 * (tone, facts, dedup_key) et, avant elle, 0004 pour `templates.next_run_on`.
 */
const PROFILES: readonly Profile[] = [
  { slug: "awa",   code: "111111", name: "Awa Traoré",   blurb: "usage perso, 3 mois d'historique", currency: "XOF", language: "fr", theme: "light" },
  { slug: "koffi", code: "222222", name: "Koffi Mensah", blurb: "usage pro, gros montants",         currency: "XOF", language: "fr", theme: "dark" },
  { slug: "nina",  code: "333333", name: "Nina Okonkwo", blurb: "le cas limite : rien dedans",      currency: "EUR", language: "en", theme: "light" },
];

export const SEED_CODES: readonly string[] = PROFILES.map((p) => p.code);

interface Seeded {
  people: number;
  accounts: number;
  transactions: number;
  budgets: number;
  projects: number;
  templates: number;
  alerts: number;
  reports: number;
  categories: number;
}

const tally: Seeded = {
  people: 0, accounts: 0, transactions: 0, budgets: 0,
  projects: 0, templates: 0, alerts: 0, reports: 0, categories: 0,
};

/** Le nom d'une catégorie système, dont l'id dépend de la base. */
async function systemCategory(client: pg.Client, name: string, kind: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    "select id from public.categories where user_id is null and name = $1 and kind = $2 limit 1",
    [name, kind],
  );
  if (!rows[0]) {
    throw new Error(
      `Catégorie système « ${name} » (${kind}) absente.\n` +
        "  La migration 0002 n'a pas été appliquée sur cette base — lancez migrate.ts d'abord.",
    );
  }
  return rows[0].id;
}

async function seedUser(
  client: pg.Client,
  user: AuthUser,
  profile: Profile,
  hasPeopleKind: boolean,
): Promise<void> {
  const isBusiness = profile.slug === "koffi";
  const isSparse = profile.slug === "nina";

  await client.query(
    `insert into public.users (id, name, preferred_currency, language, theme)
     values ($1, $2, $3, $4, $5)
     on conflict (id) do nothing`,
    [user.id, profile.name, profile.currency, profile.language, profile.theme],
  );

  /* comptes ---------------------------------------------------------------- */
  const cash = await insertId(client, "accounts", {
    user_id: user.id, name: "Espèces", type: "cash",
    initial_balance: 50_000, currency: profile.currency, is_primary: true,
  });
  tally.accounts++;

  let mobile: string | null = null;
  let bank: string | null = null;
  if (!isSparse) {
    mobile = await insertId(client, "accounts", {
      user_id: user.id, name: isBusiness ? "Wave Pro" : "Wave", type: "mobile",
      initial_balance: 120_000, currency: profile.currency, provider: "Wave", is_favorite: true,
    });
    bank = await insertId(client, "accounts", {
      user_id: user.id, name: isBusiness ? "Ecobank Entreprise" : "Ecobank", type: "bank",
      initial_balance: 300_000, currency: profile.currency,
      monthly_fee: 2_000, fee_type: "fixed", account_number: "TG0081234567",
    });
    tally.accounts += 2;
  }

  /* catégories -------------------------------------------------------------- */
  const catAlimentation = await systemCategory(client, "Alimentation", "expense");
  const catTransport = await systemCategory(client, "Transport", "expense");
  const catLoyer = await systemCategory(client, "Loyer", "expense");
  const catSalaire = await systemCategory(client, "Salaire", "income");
  const catAutreIncome = await systemCategory(client, "Autre", "income");

  const catCustom = await insertId(client, "categories", {
    user_id: user.id,
    name: isBusiness ? "Fournitures chantier" : "École",
    kind: "expense",
    color: isBusiness ? "#7B3FE4" : "#0F9D58",
    axis: isBusiness ? "investment" : "consumption",
  });
  tally.categories++;

  if (isSparse) {
    // Le cas limite : un compte ouvert, rien dedans. Aucune personne, aucune
    // transaction — c'est exactement l'utilisateur sur lequel une migration
    // écrite « pour les cas normaux » se casse.
    return;
  }

  /* personnes — les 4 cas de 0007 ------------------------------------------ */
  const kindCol = (k: string) => (hasPeopleKind ? { kind: k } : {});

  // On n'écrit `kind` que si la colonne existe ; et quand elle existe, on
  // écrit la valeur que 0007 aurait déduite, pour que le jeu reste cohérent
  // qu'il soit posé avant ou après la migration.
  const pIncomeOnly = await insertId(client, "people", {
    user_id: user.id,
    name: isBusiness ? "Client BTP Lomé" : "Employeur SARL",
    ...kindCol("income"),
  });
  const pBoth = await insertId(client, "people", {
    user_id: user.id,
    name: isBusiness ? "Ami Kodjo" : "Fatou Diallo",
    ...kindCol("income"),
  });
  const pExpenseOnly = await insertId(client, "people", {
    user_id: user.id,
    name: isBusiness ? "Fournisseur Ciment" : "Bailleur M. Sow",
    ...kindCol("expense"),
  });
  // Son id n'est volontairement gardé nulle part : cette personne ne doit être
  // référencée par AUCUNE transaction. C'est le quatrième cas de 0007, celui
  // qui retombe sur le défaut 'expense'.
  await insertId(client, "people", {
    user_id: user.id,
    name: isBusiness ? "Prospect jamais relancé" : "Ancien collègue",
    ...kindCol("expense"),
  });
  tally.people += 4;

  /* projet ------------------------------------------------------------------ */
  const project = await insertId(client, "projects", {
    user_id: user.id,
    name: isBusiness ? "Camion benne" : "Ordinateur portable",
    description: isBusiness ? "Remplacement du 2e véhicule" : "Pour les cours du soir",
    category: isBusiness ? "equipment" : "tech",
    target_amount: isBusiness ? 4_500_000 : 500_000,
    allocated_amount: isBusiness ? 900_000 : 75_000,
    start_date: monthStart(-2),
    status: "active",
    account_id: bank,
    is_favorite: true,
  });
  tally.projects++;

  /* transactions ------------------------------------------------------------ */
  const addTx = async (row: Record<string, unknown>) => {
    await insertId(client, "transactions", { user_id: user.id, ...row });
    tally.transactions++;
  };

  const salaire = isBusiness ? 1_250_000 : 385_000;

  for (const offset of [-2, -1, 0]) {
    // revenu régulier, rattaché à la personne « revenu seul »
    await addTx({
      type: "income", amount: salaire, occurred_on: monthDay(offset, 3),
      category_id: catSalaire, scoring_axis: "active",
      destination_account_id: bank, linked_to_type: "person", linked_to_id: pIncomeOnly,
      note: isBusiness ? "Facture chantier" : "Salaire du mois", status: "done",
      recurrence: "monthly",
    });

    // loyer, rattaché à la personne « dépense seule »
    await addTx({
      type: "expense", amount: isBusiness ? 250_000 : 120_000, occurred_on: monthDay(offset, 5),
      category_id: catLoyer, scoring_axis: "consumption",
      source_account_id: bank, linked_to_type: "person", linked_to_id: pExpenseOnly,
      note: isBusiness ? "Loyer dépôt" : "Loyer", status: "done", recurrence: "monthly",
    });

    // dépenses courantes, sans personne
    await addTx({
      type: "expense", amount: 18_500 + offset * -1_500, occurred_on: monthDay(offset, 11),
      category_id: catAlimentation, scoring_axis: "consumption",
      source_account_id: mobile, note: "Marché", status: "done",
    });
    await addTx({
      type: "expense", amount: 7_000, occurred_on: monthDay(offset, 17),
      category_id: catTransport, scoring_axis: "consumption",
      source_account_id: cash, note: "Taxi", status: "done",
    });
  }

  // la personne « les deux » : d'abord une dépense, ensuite un revenu.
  // C'est le cas que 0007 tranche en faveur du revenu.
  await addTx({
    type: "expense", amount: 25_000, occurred_on: monthDay(-1, 8),
    category_id: catCustom, scoring_axis: "consumption",
    source_account_id: mobile, linked_to_type: "person", linked_to_id: pBoth,
    note: "Avance rendue", status: "done",
  });
  await addTx({
    type: "income", amount: 25_000, occurred_on: monthDay(-1, 22),
    category_id: catAutreIncome,
    destination_account_id: mobile, linked_to_type: "person", linked_to_id: pBoth,
    note: "Remboursement", status: "received",
  });

  // dépense rattachée au projet : fait travailler account_balance() (0004)
  await addTx({
    type: "expense", amount: isBusiness ? 300_000 : 40_000, occurred_on: monthDay(0, 6),
    category_id: catCustom, scoring_axis: "investment",
    source_account_id: bank, linked_to_type: "project", linked_to_id: project,
    note: "Acompte", status: "done",
  });

  // virement : ni catégorie ni « lié à », contrainte tx_transfer_has_no_category
  await addTx({
    type: "transfer", amount: 60_000, occurred_on: monthDay(0, 7),
    source_account_id: bank, destination_account_id: mobile,
    note: "Approvisionnement", status: "done",
  });

  // une ligne planifiée : elle ne doit PAS compter dans le solde
  await addTx({
    type: "expense", amount: 35_000, occurred_on: monthDay(1, 2),
    category_id: catAlimentation, scoring_axis: "consumption",
    source_account_id: mobile, note: "Prévu le mois prochain", status: "planned",
  });

  /* budgets ----------------------------------------------------------------- */
  const budgetIds: string[] = [];
  for (const [categoryId, amount] of [
    [catAlimentation, isBusiness ? 400_000 : 80_000],
    [catTransport, isBusiness ? 150_000 : 30_000],
    [catLoyer, isBusiness ? 260_000 : 125_000],
  ] as const) {
    budgetIds.push(
      await insertId(client, "budgets", {
        user_id: user.id, category_id: categoryId, allocated_amount: amount,
      }),
    );
    tally.budgets++;
  }

  /* modèles ----------------------------------------------------------------- */
  await insertId(client, "templates", {
    user_id: user.id, name: "Loyer", description: "Tous les 5 du mois",
    kind: "expense", amount: isBusiness ? 250_000 : 120_000,
    category_id: catLoyer, linked_to_type: "person", linked_to_id: pExpenseOnly,
    account_id: bank, recurrence: "monthly", usage_count: 3,
    next_run_on: monthDay(1, 5), last_run_on: monthDay(0, 5),
  });
  await insertId(client, "templates", {
    user_id: user.id, name: isBusiness ? "Facture type" : "Salaire",
    kind: "income", amount: salaire, category_id: catSalaire,
    linked_to_type: "person", linked_to_id: pIncomeOnly,
    account_id: bank, recurrence: "monthly", usage_count: 3, is_favorite: true,
    next_run_on: monthDay(1, 3), last_run_on: monthDay(0, 3),
  });
  tally.templates += 2;

  /* alertes ----------------------------------------------------------------- */
  // `alerts_link_consistent` exige (link_type is null) = (link_id is null) :
  // l'alerte pointe donc sur un budget réellement créé ci-dessus, pas sur un
  // link_type orphelin. C'est aussi plus représentatif — l'inbox de l'écran 18
  // ouvre le budget concerné au clic.
  await insertId(client, "alerts", {
    user_id: user.id, kind: "alert",
    title: "Budget Transport à 92 %",
    body: "Il reste peu avant la limite du mois.",
    link_type: "budget", link_id: budgetIds[1],
    dedup_key: `budget:${budgetIds[1]}:${monthStart(0).slice(0, 7)}:92`,
    value: "92 %", tone: "warn",
    facts: JSON.stringify([{ label: "Dépensé", value: "27 600" }, { label: "Alloué", value: "30 000" }]),
    read: false,
  });
  await insertId(client, "alerts", {
    user_id: user.id, kind: "scheduled",
    title: "Loyer prévu le 5",
    body: "Un modèle récurrent va générer une dépense.",
    value: null, tone: "neutral", read: true,
  });
  tally.alerts += 2;

  /* rapports ---------------------------------------------------------------- */
  for (const offset of [-2, -1]) {
    await insertId(client, "reports", {
      user_id: user.id, period_type: "monthly", period_start: monthStart(offset),
      payload: JSON.stringify({
        income: salaire,
        expense: isBusiness ? 275_500 : 145_500,
        score: isBusiness ? 71 : 64,
        top_category: "Loyer",
      }),
      read: offset === -2,
    });
    tally.reports++;
  }
}

/* ── exécution ────────────────────────────────────────────────────────────── */

console.log(`\n  base : ${describeTarget(target)}\n`);

const client = await openClient(target);
try {
  const existing = await listAuthUsers(target);
  const byUserId = new Map(existing.map((u) => [u.id, u]));

  if (!(await tableExists(client, "invitation_codes"))) {
    throw new Error(
      `REFUS : public.invitation_codes n'existe pas (migration 0003).
  Le seed pose les codes qui ouvrent l'application ; sans cette table il
  fabriquerait des comptes dans lesquels personne ne peut entrer.
  → npm run db:migrate -- --through 0006`,
    );
  }

  /*
   * L'invitation est l'état civil du compte : c'est elle qui dit quel code
   * ouvre quoi. On interroge donc la table, et non plus la liste des adresses —
   * les adresses sont désormais synthétiques et dérivées de l'invitation.
   */
  const hashByCode = new Map(PROFILES.map((p) => [p.code, inviteCodeHash(p.code, PEPPER)]));
  const { rows: invRows } = await client.query<{
    code_hash: string;
    id: string;
    used_by: string | null;
  }>(`select code_hash, id, used_by from public.invitation_codes where code_hash = any($1)`, [
    [...hashByCode.values()],
  ]);
  const invByHash = new Map(invRows.map((r) => [r.code_hash, r]));

  /** Déjà semé = l'invitation existe ET le compte qu'elle a ouvert vit encore. */
  const alreadySeeded = (code: string): boolean => {
    const inv = invByHash.get(hashByCode.get(code)!);
    return !!inv?.used_by && byUserId.has(inv.used_by);
  };

  if (args.flags.has("summary")) {
    const { rows } = await client.query<{ table_name: string; n: string }>(`
      select 'people' as table_name, count(*)::text as n from public.people
      union all select 'accounts',     count(*)::text from public.accounts
      union all select 'transactions', count(*)::text from public.transactions
      union all select 'budgets',      count(*)::text from public.budgets
      union all select 'projects',     count(*)::text from public.projects
      union all select 'templates',    count(*)::text from public.templates
      union all select 'alerts',       count(*)::text from public.alerts
      union all select 'reports',      count(*)::text from public.reports
      union all select 'categories',   count(*)::text from public.categories
      order by table_name
    `);
    const present = SEED_CODES.filter(alreadySeeded).length;
    console.log(`  comptes de seed présents : ${present} / ${SEED_CODES.length}\n`);
    for (const r of rows) console.log(`    ${r.table_name.padEnd(14)} ${r.n.padStart(5)}`);
    console.log("");
    process.exit(0);
  }

  if (args.flags.has("reset")) {
    for (const profile of PROFILES) {
      const inv = invByHash.get(hashByCode.get(profile.code)!);
      if (!inv) continue;
      if (inv.used_by && byUserId.has(inv.used_by)) {
        await deleteAuthUser(target, inv.used_by);
        byUserId.delete(inv.used_by);
        console.log(`    − ${profile.name} supprimé (les lignes applicatives suivent en cascade)`);
      }
      // L'invitation part avec le compte. La garder laisserait un code dont le
      // `used_by` pointe dans le vide : la reconnexion croirait à un compte.
      await client.query(`delete from public.invitation_codes where id = $1`, [inv.id]);
      invByHash.delete(inv.code_hash);
    }
  }

  const hasPeopleKind = await columnExists(client, "people", "kind");
  console.log(
    `    people.kind ${hasPeopleKind ? "existe → la base est à 0007 ou au-delà" : "absente → la base est à 0006 ou avant"}\n`,
  );

  for (const profile of PROFILES) {
    if (alreadySeeded(profile.code)) {
      console.log(`    = ${profile.name} existe déjà — ignoré (--reset pour refaire)`);
      continue;
    }

    /*
     * On refait, dans l'ordre, ce que fait une vraie redemption
     * (app/api/auth/verify-code/route.ts). L'ordre n'est pas décoratif :
     * l'e-mail de l'utilisateur SE DÉDUIT de l'identifiant de l'invitation
     * (`syntheticInviteEmail`), donc l'invitation doit exister en premier.
     * L'inverse donnerait un compte que la reconnexion ne retrouve jamais —
     * elle réclame un lien magique pour `invite-<id>@invite.swiftly.io`,
     * adresse qu'aucun utilisateur ne porterait.
     */
    const codeHash = hashByCode.get(profile.code)!;
    const orphan = invByHash.get(codeHash);
    let invitationId: string;
    if (orphan) {
      invitationId = orphan.id; // invitation dont le compte a disparu : on la ressert
    } else {
      const { rows } = await client.query<{ id: string }>(
        `insert into public.invitation_codes (code_hash, expires_at, note)
         values ($1, now() + interval '30 days', $2)
         returning id`,
        [codeHash, `seed dev — ${profile.name}`],
      );
      invitationId = rows[0]!.id;
    }

    const user = await createAuthUser(target, syntheticInviteEmail(invitationId), profile.name);

    await client.query("begin");
    try {
      // `used_at` + `used_by` : le code cesse d'être une invitation offerte et
      // devient la clé du compte qu'il a ouvert (décision du 2026-09-08).
      await client.query(
        `update public.invitation_codes set used_at = now(), used_by = $2 where id = $1`,
        [invitationId, user.id],
      );
      await seedUser(client, user, profile, hasPeopleKind);
      await client.query("commit");
    } catch (cause) {
      await client.query("rollback");
      await deleteAuthUser(target, user.id);
      throw cause;
    }
    console.log(`    + ${profile.name} — code ${profile.code}`);
  }

  console.log("\n  Écrit :");
  for (const [table, n] of Object.entries(tally)) {
    if (n > 0) console.log(`    ${table.padEnd(14)} ${String(n).padStart(4)}`);
  }
  console.log("\n  Pour entrer dans l'application (npm run dev), écran 2 :\n");
  console.log("    code    compte           contenu");
  console.log("    ──────  ───────────────  ──────────────────────────────────");
  for (const profile of PROFILES) {
    console.log(`    ${profile.code}  ${profile.name.padEnd(15)}  ${profile.blurb}`);
  }
  console.log(
    `\n  Ces codes n'ouvrent que cette base : ils sont hachés avec le poivre de` +
      `\n  ${target.envFile}. Le mot de passe (${SEED_PASSWORD}) ne sert à rien dans` +
      `\n  l'application — l'identité, ici, c'est le code.\n`,
  );
} finally {
  await client.end();
}
