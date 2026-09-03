# 🔎 LAYER 3 — Revue logique métier · fin de Lot 5 (Templates, Budgets, Projets, Comptes)

Date : 2026-09-03 · Périmètre : écrans 14-17 + `/api/templates*`, `/api/budgets*`,
`/api/projects*`, `/api/accounts*`, `/api/cron/run`, `lib/recurrence/*`,
`supabase/migrations/0004_lot5_recurrence_fees.sql`.
Référence : `SECURITY-3-LAYERS.md` § LAYER 3 · `BUILD-PLAN.md` § LOT 5 · suites de
`LOT-3-LAYER-3-REVIEW.md`.

Cette revue est **manuelle**. Elle vise les trois classes de défauts propres à ce
lot : (1) l'**affectation de projet** qui déplace le solde sans transaction —
double-comptage, fonds insuffisants ; (2) l'**exécution des récurrences** (D2) —
double prélèvement ; (3) l'**idempotence du job de frais mensuels**. Plus les
contrôles d'autorisation habituels.

---

## 1. Autorisation — un utilisateur ne touche que ses données

| Chemin | Contrôle | Verdict |
|---|---|---|
| `GET /api/{templates,budgets,projects}` + `/api/accounts` | service `list*` filtre **toujours** `.eq("user_id", userId)` ; RLS `*_select_own` est le filet. | ✅ |
| `GET/PATCH/DELETE …/:id` | lecture ligne → `assertOwnership(row, user)` (404 absente / 403 autre proprio + log) **avant** toute écriture, puis `UPDATE/DELETE … .eq("id").eq("user_id")` (double garde). | ✅ |
| Réfs croisées | `templates.verifyRefs` (compte + catégorie de bon `kind` + lié-à), `budgets.verifyExpenseCategory` (système ou sienne, `kind=expense`), `projects.verifyAccount`, `accounts` : rien à revérifier. Id volé → `NotFoundError`. | ✅ |
| `POST` (create) | `user_id` **écrit depuis `withAuth`**, jamais le body. `is_primary` **forcé `false`** à la création de compte (`createAccount`). `is_archived`, `usage_count`, `allocated_amount`, `next_run_on`, `last_fee_on` : hors schémas Zod (`.strict()`), posés serveur. | ✅ |
| `POST /api/cron/run` | **pas** `withAuth` (machine-to-machine). Bearer comparé à `CRON_SECRET` ; `CRON_SECRET` absent → **404** (endpoint invisible). Aucune entrée utilisateur. | ✅ |
| `allocate_to_project` (fonction SQL) | `security invoker` — la RLS des tables sous-jacentes s'applique ; l'API a déjà prouvé la propriété du projet avant l'appel. | ✅ |

Identité : `withAuth` → `authenticate()` (Bearer JWT Supabase). Aucune route ne lit
`user_id`/`id` du body.

## 2. 🎯 Affectation de projet (D4) — pas de double-comptage, refus si fonds courts

**Le risque** : `projects.allocated_amount` réduit `account_balance()` **sans**
transaction. Une dépense « Lié à » le projet réduit *aussi* le solde. Réserver
100 k puis dépenser 50 k liés au projet ferait chuter le solde de 150 k.

**La correction** (migration 0004, `account_balance()` réécrite) : le montant
retenu par un projet est
`greatest(0, allocated_amount − Σ dépenses réglées liées au projet)`.
La réserve **fond au fur et à mesure** qu'on la dépense → jamais de double compte.
Cas limites : dépenses > allocation → retenue plancher 0 (le compte n'est pas
sur-crédité) ; `account_id` NULL → rattaché au compte principal, cohérent avec la
version 0002.

**Atomicité + refus** : `public.allocate_to_project(project_id, delta)` fait tout
en **une instruction** :
- `SELECT … FOR UPDATE` sur la ligne projet → deux « Affecter » concurrents sont
  sérialisés, pas de sur-allocation ;
- `delta > 0` : `SELECT account_balance(target)` (déjà net des allocations) ; si
  `< delta` → `RAISE … errcode='check_violation'` → service mappe en
  `BadRequestError` 400 « Fonds insuffisants… ». **Refus dur**, jamais un
  déplacement partiel (D4 : l'allocation projet est un blocage, pas un
  avertissement — contrairement à une dépense/transfert).
- `delta < 0` : `new := greatest(0, allocated_amount + delta)` — on ne retire
  jamais plus que l'alloué, `allocated_amount` ne passe pas sous 0.
L'UI (`AllocateSheet`) pré-bloque aussi (retrait > alloué, ajout > solde) mais le
serveur est l'autorité.

Verdict : ✅ — double-comptage éliminé au niveau du calcul de solde ; allocation
atomique et refus net.

## 3. 🎯 Exécution des récurrences (D2) — pas de double prélèvement

Modèle : un template `recurrence ≠ 'once'` porte un curseur `next_run_on`
(posé/effacé par `createTemplate`/`updateTemplate` à chaque bascule de fréquence,
= `initialNextRun(today, recurrence)` — une période **après** aujourd'hui, donc
jamais de rétro-génération à la création). Le cron quotidien
(`POST /api/cron/run`, `vercel.json` `0 3 * * *`) :

- `runTemplates` sélectionne `next_run_on ≤ today`, calcule `dueDates(next_run_on,
  today, recurrence, cap=60)` (rattrapage borné — une règle dormante ne peut pas
  faire tourner le cron), génère une transaction par échéance, puis avance
  `next_run_on = advanceRunDate(dernière échéance)` + `last_run_on` + incrémente
  `usage_count`.
- **Idempotence** : chaque ligne générée porte `recurrence_key =
  "tpl:<template_id>:<YYYY-MM-DD>"`, derrière l'index **UNIQUE partiel**
  `transactions_recurrence_key_uq`. `insertGenerated` avale le `23505` → un second
  passage du cron le même jour (ou un chevauchement de deux invocations) insère
  **zéro** doublon. `advanceRunDate` n'est appliqué qu'après, donc même si le
  `UPDATE` du curseur échoue, le run suivant retombe sur les mêmes clés → no-op.
- Champs de la transaction générée : `type` depuis `kind`, compte = `account_id`
  du template **ou** compte principal (`primaryAccountByUser`) — si aucun,
  `cron.template_skipped` loggé, rien créé (pas de ligne invalide). `scoring_axis`
  **résolu serveur** (`resolveScoringAxis`), jamais stocké depuis un template.
  `status='done'`, `recurrence='once'` sur la ligne fille (ce n'est pas elle la
  règle).
- `addMonthsISO` borne le jour au dernier jour du mois cible (31 janv. → 28/29
  févr.) — testé.

Tests : `tests/recurrence/model.test.ts` (dueDates rattrapage/borne/vide,
addMonths clamp, clés d'idempotence).

Verdict : ✅ — double prélèvement impossible (clé unique + `ON CONFLICT`
silencieux) ; rattrapage borné ; aucune ligne invalide.

## 4. 🎯 Frais mensuels de compte — idempotence

`runAccountFees` : comptes `bank`/`card` non archivés, `monthly_fee` non nul,
`feeDue(last_fee_on, today)` (nul ou `< 1er du mois courant`).

- Montant : `feeAmount(fee_type, monthly_fee, balance)` — `fixed` = francs à plat ;
  `percent` = points de base du solde (`50 pb = 0,50 %`), planché à 0 (un solde ≤ 0
  ne paie pas de frais %). Testé.
- **Idempotence** : `recurrence_key = "fee:<account_id>:<YYYY-MM>"` (granularité
  **mois**, pas jour) derrière le même index unique. Deux passages le même mois →
  une seule ligne « Frais mensuels ». `last_fee_on` est aussi avancé au 1er du
  mois, double garde.
- La ligne : `type=expense`, `status=done`, catégorie système « Frais bancaires »
  (semée par 0004), `source_account_id` = le compte, `scoring_axis='consumption'`.
  Passe `tx_accounts_by_type` + `tx_status_by_type`.
- `amount = 0` (frais % sur solde nul) → aucune ligne insérée, mais `last_fee_on`
  quand même avancé → pas de réessai en boucle le lendemain.

Verdict : ✅ — un prélèvement par compte et par mois, garanti par la clé mensuelle.

## 5. Budgets — le calcul « dépensé » ne fuit pas entre catégories / mois

- `monthlySpendByCategory` : `type=expense`, `status=done`, `occurred_on ≥ 1er du
  mois courant`, groupé par `category_id`, scoppé `user_id`. Le ratio
  `dépensé/alloué` peut dépasser 100 % (affiché tel quel, `budgetStatus.percent`
  non plafonné) ; le seuil couleur 92 % (`budgetTone`) est identique côté
  `runBudgetAlerts`.
- **Un budget par catégorie** : `UNIQUE (user_id, category_id)` en base ;
  `createBudget` mappe le `23505` en `BadRequestError` « Un budget existe déjà… »
  (pas de 500).
- Alerte 92 % (`runBudgetAlerts`) : crée **une** ligne `alerts` par budget et par
  mois (garde : pas d'alerte `link_type='budget'` `link_id=<budget>` créée depuis
  le 1er du mois). Pas de spam quotidien.

Verdict : ✅.

## 6. Comptes — suppression, compte principal, archivage

- **Compte principal** (`is_primary`) : jamais réattribué par le client
  (`updateAccount` `delete patch.is_primary`) ; **suppression refusée**
  (`deleteAccount` → `BadRequestError` « Le compte principal ne peut pas être
  supprimé »). Il reste le pivot de `account_balance()` (allocations projet sans
  `account_id`).
- **Suppression d'un compte utilisé** : FK `transactions_*_account_id_fkey … on
  delete restrict`. `deleteAccount` compte d'abord les transactions liées : `> 0`
  → **archive** (`is_archived=true`, soft delete), transactions intactes,
  réponse `{archived:true}` → toast explicite ; `0` → suppression dure. Aucune 500
  sur violation FK.
- Comptes archivés : exclus des listes (`listAccountCards` défaut, `verifyRefs`
  Lot 3, `getDashboard`, `getStats`) ; le solde dérivé les ignore aussi.

Verdict : ✅.

---

## Constats & suites

| # | Gravité | Constat | Suite |
|---|---|---|---|
| A | info | `account_balance()` réécrite en 0004 — la sous-requête « dépenses liées au projet » ajoute un coût par projet-compte. Volumétrie bêta négligeable. | Surveiller si un testeur crée beaucoup de projets ; indexer `transactions (linked_to_type, linked_to_id)` existe déjà (0002). |
| B | info | `runTemplates`/`runAccountFees`/`runBudgetAlerts` bouclent par utilisateur sans transaction globale ; une erreur en cours de route laisse un état partiel (curseurs avancés pour les templates déjà traités). Le prochain run reprend proprement (clés d'idempotence). | Acceptable MVP. Envisager un `try/catch` par utilisateur qui loggue et continue. |
| C | info | `/api/cron/run` accepte `GET` **et** `POST` (Vercel Cron émet un GET). Le `GET` est protégé par le même secret. | OK. À restreindre à `POST` si un jour l'endpoint est exposé autrement. |
| D | info | `projectProgress` sur les listes/détails = `(alloué + dépensé) / cible`, pas `dépensé / cible` comme le disait le doc écran 16 §5 (rédigé avant l'existence des allocations D4). Choix délibéré : « financé vers l'objectif » est le nombre honnête. | Documenté ici. Revalider avec Elias au besoin. |
| E | rappel | Rate-limiting (Point 3) toujours non branché sur `/api/auth/verify-code`. | Bloquant avant prod, pas avant la bêta fermée. |
| F | rappel | Clé `sb_secret_` exposée en clair (terminal/captures). `CRON_SECRET` à générer (`openssl rand -base64 32`) et poser dans Vercel avant le déploiement. | Faire tourner la clé service + poser `CRON_SECRET` avant l'arrivée de testeurs / le déploiement Vercel. |
| G | rappel | Migration `0004_lot5_recurrence_fees.sql` **à appliquer** (SQL editor Supabase) avant que les écrans 14-17 fonctionnent — nouvelles colonnes + fonction `allocate_to_project`. | Étape 1 du hand-off Lot 5. |

**Verdict global : ✅** — l'affectation de projet est atomique, refusée à sec quand
les fonds manquent, et ne double-compte plus (calcul de solde réécrit) ; les
récurrences et les frais mensuels sont idempotents par clé unique
`(règle, échéance)` ; l'autorisation reste doublement gardée (API + RLS) ; le
compte principal est protégé et une suppression de compte utilisé bascule en
archivage. Prochaine revue L3 : Day 29 (Go/No-Go).
