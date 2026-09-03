# 🔎 LAYER 3 — Revue logique métier · fin de Lot 3 (Transactions)

Date : 2026-09-03 · Périmètre : le cœur financier (écrans 06-10 + `/api/transactions*`,
`/api/categories`, `/api/people`, `/api/projects`, `/api/templates`).
Référence : `SECURITY-3-LAYERS.md` § LAYER 3 · `BUILD-PLAN.md` § LOT 3.

Cette revue est **manuelle** (l'outil `ecc-agentshield` reste en support). Elle
vérifie les classes de défauts que Semgrep (L1) et Zod (L2) ne voient pas :
autorisation, cohérence du solde dérivé, races, règle du solde négatif.

---

## 1. Un utilisateur ne peut ni lire ni écrire les données d'un autre

| Chemin | Contrôle | Verdict |
|---|---|---|
| `GET /api/transactions` | `listTransactions` filtre **toujours** `.eq("user_id", userId)` ; le curseur keyset et les filtres (`type`, `account`, `linked_to_*`) s'ajoutent en `AND`. RLS `transactions_select_own` est le filet. | ✅ |
| `GET /api/transactions/:id` | `getTransaction` lit la ligne **sans** filtre `user_id` puis `assertOwnership(row, user)` → 404 si absente, 403 si autre propriétaire (+ log `security.unauthorized_access_attempt`). | ✅ |
| `PATCH` / `DELETE /api/transactions/:id` | `updateTransaction` / `deleteTransaction` : `assertOwnership` sur la ligne existante **avant** toute écriture, puis `UPDATE/DELETE … .eq("id", id).eq("user_id", user.id)` (double garde). | ✅ |
| Références croisées (compte, catégorie, personne, projet) | `verifyRefs` : chaque `account_id` du body doit exister **et** appartenir au caller (`is_archived=false`) ; la catégorie doit être système (`user_id is null`) **ou** au caller ; `people`/`projects` filtrés `user_id`. Un id volé → `NotFoundError` (404), jamais d'écriture. | ✅ |
| `GET /api/categories` | `.or("user_id.is.null,user_id.eq.<caller>")` — système + siennes uniquement. | ✅ |
| `GET /api/people` \| `/api/projects` \| `/api/templates` | `.eq("user_id", user.id)`. | ✅ |
| `POST /api/people` \| `/api/templates` | `user_id` **écrit depuis `withAuth`**, jamais le body ; `templates` re-vérifie compte/catégorie/lié-à. | ✅ |

Identité : `withAuth` → `authenticate()` (Bearer JWT vérifié par Supabase). **Aucune
route ne lit `user_id` / `id` du body.** `transactionCreateSchema` ne déclare pas
ces champs (`.strict()` les rejette).

## 2. `amount` / `source` / `destination` jamais pris du body sans revalidation

- `amount` : `zod` `amount` (entier XOF, `> 0`, plafond 10¹²). Le `bigint`
  colonne a un `CHECK (amount > 0)`.
- `source_account_id` / `destination_account_id` : `verifyRefs` prouve la
  propriété **et** l'existence ; `tx_accounts_by_type` (CHECK) impose la présence
  du bon compte selon le type et `source <> destination` pour un transfert ;
  `transactionCreateSchema.superRefine` re-bloque `source == destination` côté
  entrée.
- `scoring_axis` : **résolu serveur** (`resolveScoringAxis`) depuis la catégorie
  (dépense) ou le « lié à » (revenu) ; le body ne peut pas l'imposer (`.strict()`).
- `status` / `recurrence` : enums Zod + CHECK `tx_status_by_type`.
- `category_id` d'un mauvais `kind` (catégorie revenu sur une dépense) →
  `BadRequestError` explicite dans `verifyRefs`.

## 3. Recalcul du solde dérivé (D3) — cohérent à l'édition / suppression

Il n'y a **aucune colonne `balance`** : `public.account_balance(uuid)` recompose
tout à la lecture depuis `transactions` + `projects.allocated_amount`. Donc :

- **Créer / éditer / supprimer** une transaction ne demande aucune étape de
  réconciliation — la prochaine lecture (`/api/dashboard`, `/api/accounts`,
  `TxSuccess`) reflète le nouveau total.
- `updateTransaction` **réinitialise** les colonnes polymorphes/FK
  (`category_id`, `linked_to_*`, `source/destination_account_id`) avant de
  ré-appliquer le body → une édition qui *vide* un champ (ex. retirer le « lié
  à ») persiste, pas de valeur fantôme qui fausserait un futur calcul de score.
- Les règles « compte dans le solde » de `lib/dashboard/aggregates.txDelta` et de
  `account_balance()` sont **identiques** (income: done/received ; expense: done ;
  transfer: toujours) — vérifié par `tests/dashboard/aggregates.test.ts` et
  `tests/transactions/model.test.ts` (`countsTowardBalance`).
- La courbe historique (`computeAggregate`) relit toutes les transactions
  `< range.end` à chaque appel → un point passé bouge si on édite une vieille
  transaction. Conforme à D3 (« editing/deleting a transaction recomputes
  everything incl. past graph points »).

## 4. Races sur écritures concurrentes

- Le solde n'étant jamais stocké, **deux écritures concurrentes ne peuvent pas
  diverger d'un total mis en cache** : chacune insère/à-jour sa propre ligne,
  `account_balance()` fait la somme au moment de lire. Pas de `read-modify-write`
  sur un compteur.
- `verifyRefs` puis `insert` ne sont pas transactionnels, mais la seule course
  possible (le compte est archivé/supprimé entre la vérif et l'insert) est
  rattrapée par le FK `transactions_*_account_id_fkey … on delete restrict` +
  RLS. Pas de corruption, au pire une 500 → générique.
- `POST /api/people` sous double-clic peut créer deux personnes homonymes : sans
  gravité (pas d'unicité requise), et l'UI ne lance qu'une requête (`busy`).
- **Templates / récurrences** : l'exécution des règles de récurrence est **hors
  périmètre Lot 3** (D2, tranché au Lot 5). Aujourd'hui `transactions.recurrence`
  n'est qu'une étiquette stockée — aucun job ne la lit → pas de double
  prélèvement possible. À re-vérifier à la 2ᵉ revue L3 (fin Lot 5).

## 5. Solde négatif = avertissement, jamais un blocage silencieux (D4)

- Aucun chemin de création/édition ne rejette une dépense ou un transfert pour
  cause de solde insuffisant.
- `negativeBalanceWarning` relit `account_balance()` du compte source **après**
  l'écriture ; si `< 0`, la réponse porte
  `warning: { code: "NEGATIVE_BALANCE", account, balance }`.
- L'UI (`TxSuccess`) affiche un bandeau encre/rouge non bloquant
  (`t.warning.negativeBalance`). La transaction est déjà enregistrée.
- Revenu : pas d'avertissement (ne peut pas rendre un solde négatif).
- ⚠️ **Non couvert Lot 3** : l'affectation de projet qui refuse si solde
  insuffisant (D4, second volet) — c'est l'écran 16, Lot 5.

---

## Constats & suites

| # | Gravité | Constat | Suite |
|---|---|---|---|
| A | info | `verifyRefs` + `insert` non transactionnels (fenêtre de course étroite, rattrapée par FK/RLS). | Acceptable MVP. Envisager une `rpc` transactionnelle si un cas réel apparaît. |
| B | info | Pagination keyset `(occurred_on, id)` : un tri client « par montant / alpha » ne réordonne que la fenêtre chargée. | Acceptable pour la bêta (peu de transactions). Documenté dans `useHistory`. |
| C | info | `POST /api/categories` absent → les testeurs sont limités aux 7 catégories système. | Décider au Lot 5 (écran Paramètres / Templates). |
| D | rappel | Rate-limiting (Point 3) toujours non branché sur `/api/auth/verify-code`. | Bloquant avant prod, pas avant la bêta fermée. |
| E | rappel | Clé `sb_secret_` exposée en clair 2× (terminal/captures). | À **faire tourner** dans le dashboard Supabase avant l'arrivée de testeurs. |

**Verdict global : ✅** — le cœur financier respecte l'autorisation (double garde
API + RLS), n'accepte aucune identité ni aucun montant/compte du body sans
revalidation, le solde dérivé (D3) reste cohérent à l'édition/suppression sans
réconciliation, et la règle D4 (solde négatif = avertissement) est appliquée.
Prochaine revue L3 : fin de Lot 5 (affectations projet, exécution des
récurrences, job de frais mensuels).
