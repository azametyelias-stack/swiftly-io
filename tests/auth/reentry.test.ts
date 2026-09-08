import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/*
 * Retrouver son compte après une désinstallation (décision d'Elias, 2026-09-08).
 *
 * Un compte de bêta n'a ni mot de passe ni vraie adresse : jusqu'ici la session
 * posée sur l'appareil était le SEUL chemin vers les données. Supprimer l'app —
 * ou vider les données du navigateur — rendait le compte définitivement
 * inaccessible, ses lignes toujours en base, sans recours possible pour
 * personne. Le code d'invitation devient donc la clé permanente du compte qu'il
 * a ouvert.
 *
 * La route parle à Supabase : `node --test` ne peut pas la monter. On vérifie
 * ses invariants sur la source, comme `tests/pwa` le fait pour `sw.js`. Ce sont
 * les trois qui, lâchés, coûtent un compte.
 */

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), "utf8");

const ROUTE = read("app/api/auth/verify-code/route.ts");
const SESSION = read("lib/auth/invite-session.ts");
const SCREEN = read("app/(auth)/connexion/page.tsx");

test("un code déjà utilisé rouvre son compte au lieu d'être refusé", () => {
  const lookup = ROUTE.slice(ROUTE.indexOf("Retour au compte"), ROUTE.indexOf("if (!invitationId) {\n      // Inconnu"));
  assert.ok(lookup.length > 0, "la recherche du code consommé doit exister");
  assert.match(lookup, /\.not\("used_at", "is", null\)/, "on cherche parmi les codes CONSOMMÉS");
  assert.match(lookup, /reentry = true/);
});

test("la péremption ne joue PAS sur un retour au compte", () => {
  /*
   * `expires_at` borne la durée pendant laquelle une invitation reste offerte,
   * pas la vie du compte créé. La faire jouer ici enfermerait quelqu'un dehors
   * trente jours après son inscription — le sinistre qu'on évite.
   */
  // La requête seule, sans le commentaire qui l'explique — celui-ci prononce
  // « expires_at » précisément pour dire qu'on ne s'en sert pas ici.
  const start = ROUTE.indexOf('const { data: spent');
  const query = ROUTE.slice(start, ROUTE.indexOf('.maybeSingle();', start));
  assert.ok(query.length > 0, "la requête de reconnexion doit exister");
  assert.ok(!/expires_at/.test(query), "la reconnexion ne doit pas filtrer sur la péremption");
  // La première réclamation, elle, la vérifie toujours : une invitation périmée
  // n'ouvre pas de compte neuf.
  // L'en-tête du fichier parle lui aussi de « Retour au compte » : on borne la
  // première réclamation sur sa requête, pas sur la prose.
  const claimStart = ROUTE.indexOf("update({ used_at: nowIso })");
  const claim = ROUTE.slice(claimStart, ROUTE.indexOf(".maybeSingle();", claimStart));
  assert.match(claim, /\.gt\("expires_at", nowIso\)/);
  assert.match(claim, /\.is\("used_at", null\)/);
});

test("un échec de session ne relâche JAMAIS un code déjà utilisé", () => {
  /*
   * L'invariant le plus cher de tout ce fichier. Remettre `used_at` à null sur
   * une reconnexion rendrait le code réclamable à neuf : le suivant à le taper
   * repartirait sur un compte vierge, et l'ancien deviendrait inaccessible pour
   * de bon.
   */
  const rescue = ROUTE.slice(ROUTE.indexOf("catch (mintErr)"), ROUTE.indexOf("const profile"));
  assert.match(
    rescue,
    /if \(!reentry\) \{\s*await db\.from\("invitation_codes"\)\.update\(\{ used_at: null \}\)/,
    "le relâchement doit être gardé par `!reentry`",
  );
});

test("l'échec n'est compté que si AUCUN des deux chemins n'a abouti", () => {
  // Sinon chaque reconnexion nourrirait le blocage par code et finirait par
  // verrouiller le compte de son propre propriétaire.
  assert.ok(
    ROUTE.indexOf("reentry = true") < ROUTE.indexOf("await recordInviteFailure(codeHash)"),
    "la recherche de reconnexion doit précéder l'enregistrement de l'échec",
  );
  assert.equal(
    ROUTE.split("recordInviteFailure(codeHash)").length - 1,
    1,
    "un seul point d'enregistrement d'échec",
  );
});

test("une reconnexion ne cherche personne : l'identité vient de la base", () => {
  // `used_by` porte déjà l'utilisateur. S'en servir évite `createUser` (et son
  // échec attendu sur l'e-mail déjà pris) autant que le balayage des comptes.
  assert.match(ROUTE, /knownUserId = \(spent\.used_by as string \| null\) \?\? null/);
  assert.match(ROUTE, /\.select\("id, used_by"\)/);
  assert.match(ROUTE, /mintInviteSession\(db, invitationId, knownUserId\)/);
  assert.match(
    SESSION,
    /if \(knownUserId\) return \{ email, tokenHash: await magicLink\(db, email\), userId: knownUserId \}/,
    "l'id connu doit court-circuiter la création",
  );
});

test("le repli parcourt TOUTES les pages de comptes", () => {
  /*
   * `listUsers()` pagine — 50 par page par défaut. S'arrêter à la première
   * passait inaperçu tant que ce chemin n'était qu'un rattrapage après panne.
   * Depuis qu'il peut porter le retour d'un compte, s'y arrêter rendrait le 51e
   * inscrit introuvable : le sinistre qu'on répare, reproduit en silence.
   */
  assert.match(SESSION, /listUsers\(\{ page, perPage: PAGE_SIZE \}\)/);
  // On compte les APPELS (le commentaire, lui, prononce « listUsers() » pour
  // expliquer le piège) : un seul site, et c'est le paginé.
  assert.equal(
    SESSION.split("db.auth.admin.listUsers(").length - 1,
    1,
    "un seul appel à listUsers, et il pagine",
  );
  assert.match(SESSION, /if \(data\.users\.length < PAGE_SIZE\) return null/, "arrêt sur la dernière page");
  assert.match(SESSION, /page <= MAX_PAGES/, "borne contre une boucle sans fin");
});

test("où l'on renvoie la personne se décide sur le PROFIL, pas sur le code", () => {
  /*
   * Quelqu'un qui a abandonné à l'écran du prénom a un code consommé et rien
   * derrière : il doit reprendre son inscription, pas atterrir sur un tableau de
   * bord sans nom ni compte principal.
   */
  const decide = ROUTE.slice(ROUTE.indexOf("const profile"), ROUTE.indexOf("return ok("));
  assert.match(decide, /\.from\("users"\)/);
  assert.match(decide, /\.eq\("id", handoff\.userId\)/);
  assert.match(decide, /const returning = Boolean\(profile\.data\)/);
  assert.ok(!/returning = reentry/.test(ROUTE), "ne pas confondre « code réutilisé » et « compte installé »");
});

test("le client saute l'écran du prénom pour un compte déjà installé", () => {
  // Cet écran fait un upsert du nom : y repasser écraserait celui d'un compte
  // qui tourne depuis des semaines.
  assert.match(SCREEN, /const next = body\.data\.returning \? "\/dashboard" : "\/connexion\/nom"/);
  assert.match(SCREEN, /router\.replace\(next\)/);
});

test("le blocage par code reste hors de portée d'un tiers", () => {
  /*
   * `rate-limit-policy.ts` s'appuie sur : « seuls les échecs comptent, et un
   * code valide ne peut pas échouer ». C'est ce qui empêche un attaquant de
   * verrouiller le compte d'un autre. La reconnexion préserve l'invariant — un
   * code consommé réussit désormais — mais il faut que la vérification du
   * blocage reste AVANT, sinon un code valide bloqué ne pourrait plus rouvrir
   * son compte sans qu'on sache pourquoi.
   */
  assert.ok(
    ROUTE.indexOf("isInviteCodeLockedOut(codeHash)") < ROUTE.indexOf("Atomic claim"),
    "le blocage se vérifie avant toute écriture",
  );
});
