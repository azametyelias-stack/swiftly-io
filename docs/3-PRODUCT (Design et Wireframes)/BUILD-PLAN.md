# 🏗️ BUILD PLAN — 22 écrans MVP

**Statut** : Actif — pilote la construction écran par écran
**Date** : 2026-09-02
**À lire avec** : [DESIGN-RECONCILIATION.md](DESIGN-RECONCILIATION.md) (règle de préséance + décisions D1–D6),
`SWIFTLY-CARTE-PRODUIT-22-ECRANS.md` (flux), les 22 `Les 22 ECRANS/NN-*.md` (comportement),
`DESIGN-HANDOFF/design/*.dc.html` (visuel).

---

## 0. État du dépôt au démarrage

**Déjà en place** (ne pas refaire) :
- Next 16 **App Router**, React 19, Tailwind **v4** (`@import "tailwindcss"` + `@theme` dans `app/globals.css`), TS strict.
- Couche sécurité : `lib/env`, `lib/auth` (`authenticate`/`withAuth`/`assertOwnership`/`requireAdmin`, invite-codes HMAC), `lib/http` (`ok`/`fail`, `toErrorResponse`, CORS `proxy.ts`), `lib/log`, `lib/security/headers`, `lib/supabase/server`.
- Route handlers : `app/api/**/route.ts`. Réponses via `lib/http`. Auth via `withAuth`.
- Privacy : `app/privacy`, `app/privacy-settings`, `components/privacy/*`, `lib/privacy/*`, migration `0001_privacy_consent.sql`. Wiré dans `app/layout.tsx` (`ConsentProvider` + `ConsentBanner` + `GoogleAnalytics`).
- `components/ui/` : `BackButton`, `Toast`.
- Tests : `node --test` sur `tests/**` (RLS, auth, http, privacy, env, headers…).

**Pas encore fait** (prérequis, voir §1) :
- Schéma DB applicatif (accounts, transactions, categories, budgets, projects, templates, people, alerts, reports).
- Couche validation Zod partagée (`lib/validation`).
- Design system en code (jetons, typo, géométrie, motion, format des montants).
- Shell de navigation (menu par swipe, header racine/sous-écran).
- Fond « nuit » global.

⚠️ Les docs Foundation montrent des exemples en `pages/…` (Pages Router) — **périmé**. Tout est App Router.

---

## 1. PRÉREQUIS (avant le Lot 1)

Ordre imposé. Chaque étape se termine par `npm test` au vert.

### P0 — Défense en profondeur, LAYER 1 (Semgrep) — ✅ FAIT (2026-09-02)
`semgrep.yml` (règles maison Points 6/7/10/11/14/19) + `.semgrepignore` + job `sast`
dans `ci.yml` (règles maison + `p/typescript` `p/react` `p/nextjs` `p/owasp-top-ten`
`p/secrets`, bloque sur ERROR). Local : `npm run scan`. Lock : `tests/security/semgrep.test.ts`.
Les 3 couches et leur calendrier : `docs/2-ARCHITECTURE (…)/SECURITY-3-LAYERS.md`.
LAYER 2 (Zod) = P2. LAYER 3 (revue logique métier) = fin de Lot 3, fin de Lot 5, Day 29.

### P1 — Schéma DB applicatif  (= PROMPT #PAYMENT, volet schéma)
Migration `supabase/migrations/0002_core_schema.sql`. Tables (colonnes détaillées à dériver des `NN-*.md`) :

| Table | Points clés (issus des `NN-*.md` + décisions) |
|---|---|
| `users` | complète `auth.users` ; `name`, `preferred_currency` (défaut `XOF`), `theme`, `language`. Owner = `id`. |
| `accounts` | `name`, `type` (`cash`/`mobile`/`bank`/`card`), `initial_balance`, `currency`, `provider?`, `monthly_fee?`, `fee_type?`, `is_favorite`, `is_archived`, `notes?`. **Pas de colonne `balance`** — le solde est dérivé (D3). Compte Principal créé à 0 à l'inscription (D5). |
| `categories` | `user_id` **nullable** (NULL = catégorie système). `name`, `kind` (`expense`/`income`), `color` (teinte fixe), `axis?` (`investment`/`consumption` pour dépense ; `active`/`passive` pour revenu). |
| `transactions` | `type` (`expense`/`income`/`transfer`), `amount` (entier, plus petite unité), `date`, `category_id?` (NULL pour transfert), `source_account_id?`, `destination_account_id?`, `linked_to_type?` (`person`/`project`), `linked_to_id?`, `note?`, `status` (`done`/`planned`/`refunded`/`received`), `recurrence?` (`once`/`daily`/`monthly`), `template_id?`. |
| `people` | « Lié à » côté personnes. `name`. |
| `templates` | `name`, `description?`, `kind`, `amount`, `category_id?`, `linked_to_*?`, `usage_count`, `is_favorite`. Le toggle récurrence d'une transaction pointe ici (D2bis) via `recurrence` + `template_id`. |
| `budgets` | `category_id`, `allocated_amount`, période = mois courant. Seuils **50 / 91 / 92 %**, alerte à 92 %. |
| `projects` | `name`, `description`, `category`, `target_amount?` (NULL = pas de barre), `allocated_amount` (affecté depuis le solde, **sans** transaction — D4), `start_date?`, `end_date?`, `status` (`active`/`done`/`paused`/`onhold`), `account_id?`. |
| `alerts` | `title`, `body`, `kind` (`alert`/`scheduled`), `created_at`, `read`. |
| `reports` | `period`, `period_type` (`monthly`/`annual`), `payload` (JSON calculé), `read`, `generated_at`. |

- RLS : appliquer `supabase/rls-core-tables.sql` **dans la même migration** (attendu par `tests/db/rls.test.ts`).
- Catégories système par défaut : seed (Loisirs `#152BC7`, Alimentation `#29ABE2`, Transport `#A3121A`, Salaire `#006B3C`, Loyer `#F5A524`, + les autres listées dans `08`/`09`).
- Fonction de solde dérivé (SQL ou TS) : `solde(account) = initial_balance + Σ revenus − Σ dépenses ± transferts − Σ affectations projet`. Une seule implémentation, réutilisée partout (D3, règle 1 du handoff).

### P2 — Validation Zod  (= PROMPT #INPUT, utilisé immédiatement)
`lib/validation/` : `Amount`, `Currency`, `AccountInput`, `TransactionInput` (× expense/income/transfer), `TemplateInput`, `BudgetInput`, `ProjectInput`, `PeopleInput`. Helper `parseBody()` pour les route handlers (voir `lib/validation/README.md`). Chaque route `app/api/**` valide en entrée. Messages FR.

### P3 — Design system en code — ✅ FAIT (2026-09-02)
`app/globals.css` réécrit ; source = `DESIGN-HANDOFF/README.md` (§ Couleur / Typographie / Format des montants / Géométrie / Motion) + corrections `DESIGN-RECONCILIATION.md` §2.
- **24 jetons couleur** clair + sombre sur `:root` (raw hex) → `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` + `:root[data-theme="dark"]` (toggle écran 22, gagne dans les 2 sens). Exposés en utilitaires Tailwind via `@theme inline` (`bg-surface-card`, `text-text-primary`, `text-semantic-out`…). Zéro hex en dur dans un composant.
- Les anciens `--color-sf-*` + `--animate-*` sont **conservés tels quels** dans un bloc `@theme inline` marqué **DEPRECATED** — utilisés uniquement par les écrans privacy 19–21 ; le **Lot 6** les migre sur les vrais jetons et supprime le bloc.
- **Typo** : pile système Apple via `@theme { --font-sans }` (pas de `next/font`, Geist retiré de `app/layout.tsx`). 7 rôles `.t-*` (`.t-balance`, `.t-amount-input`, `.t-screen-title`, `.t-section-title`, `.t-body`, `.t-secondary`, `.t-label`) + `.tabular`. `--font-logo` (Georgia) réservé au logotype.
- **Géométrie** : 19 variables (`--radius-card: 20px`, `--radius-pill: 999px`, `--switch-w/h/knob`, `--tap-min: 44px`, …).
- **Motion** : `--dur-tap 120ms` / `--dur-toggle 180ms` / `--dur-sheet 280ms` / `--dur-curve 1200ms` + `--ease-standard cubic-bezier(.23,1,.32,1)` / `--ease-emphasized cubic-bezier(.32,.72,0,1)` + fallback `prefers-reduced-motion`.
- **Format des montants** : `lib/format/money.ts` (`formatBalance` / `formatSigned` / `formatMoney`) — U+2009, U+2212, `+`/pas de signe, suffixe séparé par une espace normale, masqué `•• •••` longueur fixe, entiers (D1). 8 tests `tests/format/money.test.ts`. Doc `lib/format/README.md`.
- **Fond nuit** : `nuit.jpg` + `objectif-spheres.jpg` → `public/brand/`, servis via `next/image` (AVIF/WebP + srcset au runtime, cache navigateur — `DESIGN-GLOBAL.md` §3). Le composant `NightBackdrop` qui les enveloppe arrive au Lot 1 (P5). Voir `public/brand/README.md`.

### P4 — Shell de navigation
- `components/nav/AppHeader` : bouton gauche = menu (niveau racine) ou chevron retour (sous-écran) ; titre centré ; cloche + pastille non-lus à droite. Hauteur 56.
- `components/nav/MenuDrawer` : ouverture par **swipe gauche→droite**, l'écran courant est poussé, bande visible sur le bord (style app Claude, `05-menu-navigation.md`). ~10 entrées, item actif mis en évidence, libellé long en marquee.
- Distinction racine / sous-écran + continuité directionnelle (droite↔droite, bas↔bas ; modale jamais latérale).
- `(app)` route group protégé (redirection vers `/` si pas de session).

### P5 — Composants transverses (les 14)
Construits au fil des lots mais **spec unique** (§03 de la doc). Le lot indiqué est celui qui l'introduit :

| Composant | Lot | Composant | Lot |
|---|---|---|---|
| Barre de navigation | P4 | Interrupteur | 6 |
| Tiroir latéral | P4 | Rangée de paramètre | 6 |
| Bouton principal (verre poli / encre) | 1 | Carte de solde | 2 |
| Toast | ✅ existe (à réaligner) | Courbe de solde | 2 |
| Feuille modale | 2 | Carte de liste (+ variante progression) | 3 |
| Badge de type | 3 | Pilule de filtre | 3 |
| Pavé numérique | 3 | Barre de progression | 4 |

---

## 2. LES 6 LOTS

Ordre = `SWIFTLY-CARTE-PRODUIT`. **Validation en fin de lot** par Elias avant le suivant.

### LOT 1 — Onboarding & Auth · écrans 01-03
- **Écrans** : 01 Landing · 02 Connexion Code (6 chiffres) · 03 Connexion Username.
- **Visuel** : `Lot 1 Onboarding.dc.html`. Bande d'identité (nuit) + feuille claire + 1 champ + 1 bouton.
- **Back** : `POST /api/auth/verify-code` (existe : `lib/auth/invite-codes`), `POST /api/auth/profile` (username). Création du **Compte Principal à 0 F** au succès du profil (D5).
- **Tables** : `users`, `accounts` (1 ligne).
- **Composants** : Bouton principal, champ sur nuit, cases OTP-like (6 digits, auto-focus, paste, backspace), indicateur d'étape.
- **États** : code invalide/expiré/déjà utilisé/erreur serveur (messages différenciés `02` §5) ; username vide/espaces.
- **Go/No-Go** : login OK sans bug, redirection Dashboard, session persiste au refresh.

### LOT 2 — Core UI & Dashboard · écrans 04-05
- **Écrans** : 04 Dashboard · 05 Menu.
- **Visuel** : `Lot 2 Core UI.dc.html`. C'est le « magasin de pièces » — carte, ligne de liste, chiffre, puce, bandeau — repris tel quel aux lots 3-6.
- **Comportements clés** (`04`) : sélecteur compte + période pilotent tout ; **animation odomètre du solde** (1 s) au retour de transaction ; **tracé progressif de la courbe** (1200 ms) rejoué au changement compte/période/retour tx, jamais au scroll ; **double scroll** (page ↑ jusqu'à ce que « + Nouvelle transaction » colle en haut, puis scroll interne du panneau blanc) ; **bandeau rotatif** 30 s + swipe + pause à l'interaction + priorisation alertes + notice « rapport prêt » clignotante ; œil masquer/afficher ; historique récent = 3 dernières + « Voir plus » ; troncature note avant « lié à ».
- **Menu** (`05`) : swipe reveal (P4).
- **Tables** : lecture `accounts`, `transactions`, `projects`, `alerts`, `reports` (notice).
- **Composants** : Carte de solde, Courbe de solde, Feuille modale, Carte de liste, bandeau.
- **Calcul** : solde dérivé + agrégats période (solde début / revenus / dépenses / actuel) + variation vs période précédente équivalente.
- **Go/No-Go** : navigation fluide, courbe + odomètre OK, double scroll correct.

### LOT 3 — Transactions · écrans 06-10
- **Écrans** : 06 Historiques · 07 Détails · 08 Créer/Modifier Dépense · 09 Revenu · 10 Transfert.
- **Visuel** : `Lot 3 Transactions.dc.html` — « une seule feuille, trois formulaires ». Feuille modale radius haut 24/28, champs radius 14, boutons 999.
- **Flux** (`08` 4 slides / `09` 4 slides / `10` 3 slides) : Date+Montant+Compte → Catégorie+Lié à → Notes+Récurrence+Statut → Succès (+ « Enregistrer comme template »). Transfert : pas de catégorie, pas de scoring, source ≠ destination.
- **Règles** : montant > 0 ; catégorie appartient à un type (bascule dépense↔revenu vide la catégorie) ; « Lié à » **requis pour revenu**, optionnel pour dépense ; solde négatif autorisé dépense/transfert **avec avertissement** (D4) ; édition rouvre le même formulaire pré-rempli ; **tout recalcul via le solde dérivé** (D3).
- **Historiques** (`06`) : groupé par période, filtre type (Tout/Dépense/Revenu/Transfert), tri + navigation temporelle, swipe (droite = détails, gauche = suppr. avec confirmation), scroll infini.
- **Tables** : `transactions`, `people`, `categories`, `templates` (création à la volée).
- **Composants** : Pavé numérique, Badge de type, Pilule de filtre, Carte de liste.
- **États** : lot 10 — vide (« Aucune transaction »), filtre sans résultat (≠ vide), erreur de chargement, écriture refusée (toast encre, valeurs conservées), succès (toast + retour).
- **Go/No-Go** : créer les 3 types, apparition dans Historiques, solde + courbe à jour, Score recalculé.
- **🔎 LAYER 3 — 1re revue logique métier** (`SECURITY-3-LAYERS.md`) : le cœur financier est là. Vérifier — un user ne peut ni lire ni écrire les tx/comptes d'un autre (RLS + `assertOwnership`) ; `amount`/`source`/`destination` jamais issus du body sans revalidation ; le recalcul du solde dérivé (D3) est atomique et cohérent à l'édition/suppression ; pas de race sur des écritures concurrentes ; solde négatif = avertissement, jamais un blocage silencieux (D4). Support : `npx ecc-agentshield scan --opus`.

### LOT 4 — Statistiques & Rapports · écrans 11-13
- **Écrans** : 11 Statistiques · 12 Rapport · 13 Aides.
- **Visuel** : `Lot 4 Statistiques.dc.html`. Le vert n'apparaît QUE sur le score ; rouge = risque / sortie d'argent.
- **11** : dropdown mode (Aperçu [seul designé] / Dépense / Revenu / Patrimoine) + période + compte ; section vue d'ensemble (réutilise la courbe du Dashboard + bénéfice net) ; répartition dépenses/revenus (donut + liste cliquable → Historique filtré, dropdown Catégorie/Compte/Personnes/Projets) ; **Score Financier /100** = 4 critères pondérés (Liberté 40 %, Investissement 25 %, Épargne 25 %, Diversification 10 %), paliers 0-40/41-60/61-80/81-100.
- **12 Rapport** : mensuel & annuel, auto-généré fin de période, affiche la dernière période terminée. **⏳ D6 à trancher ici** : périmètre MVP (reco : sections 1-6 + 10 ; différer benchmark communautaire §8 + comparaison annuelle §9).
- **13 Aides** : page statique, texte validé (`13-aides.md` §3 — intégrer tel quel), 4 critères + paliers, bouton « Retour au rapport ».
- **Tables** : `reports` + agrégats sur `transactions` (aucune nouvelle donnée utilisateur).
- **Composants** : Barre de progression, donut, gauge.
- **Dépend de** : Lot 3 (il faut des transactions).

### LOT 5 — Comptes, Budgets, Projets, Templates · écrans 14-17
- **Écrans** : 14 Templates · 15 Budgets · 16 Projets · 17 Gestion des comptes.
- **Visuel** : `Lot 5` (Templates + Budgets, une seule carte de liste) + `Lot 6 Projets` + `Lot 7 Comptes & Notifications`.
- **14 Templates** : liste, tap = lance transaction pré-remplie, long-press = menu, swipe droite = suppr. (confirmation), filtres type + tri. **⏳ D2 à trancher ici** : moment d'exécution du prélèvement des règles de récurrence (reco : cron serveur ; échéance ratée = tx créée à sa date).
- **15 Budgets** : barre de progression, couleurs 50/91/92 %, alerte 92 % (Dashboard + notifications + push), mensuel uniquement, calcul = Σ tx catégorie mois courant / alloué.
- **16 Projets** : barre conditionnelle (si `target_amount`), affectation depuis le solde **sans transaction**, refus si solde insuffisant (D4), statut, catégorie, formulaire d'ajout + détail.
- **17 Comptes** : cartes de compte (icône type, nom, solde dérivé, frais mensuels), tap = détails, « Voir les historiques » = Historique filtré compte, long-press modifier/supprimer (**pas** sur Compte Principal), formulaire créer/modifier (champs conditionnels selon type), soft-delete.
- **Tables** : `templates`, `budgets`, `projects`, `accounts` (+ frais mensuels → job fin de mois créant une tx « Frais bancaires »).
- **Dépend de** : Lot 2 + Lot 3.
- **🔎 LAYER 3 — 2e revue logique métier** : affectation projet qui bouge le solde **sans** transaction (D4) — pas de double comptage, refus si insuffisant ; exécution des règles de récurrence (D2) — pas de double prélèvement, échéance ratée gérée ; job de frais mensuels idempotent (une seule tx par mois).

### LOT 6 — Alertes & Paramètres · écrans 18-22
- **Écrans** : 18 Alertes & Notifications · 19 Consentement · 20 Privacy Page · 21 Privacy Settings · 22 Paramètres.
- **Visuel** : `Lot 7` (Alertes) + `Lot 8 Privacy` + `Lot 9 Paramètres`.
- **19-21 Privacy** : **déjà construits** (`app/privacy`, `app/privacy-settings`, `components/privacy/*`). Tâche = **réconcilier** le visuel avec `Lot 8` + intégrer dans le shell de nav, **pas reconstruire**. Bannière 19 déjà wirée dans `layout.tsx`.
- **18 Alertes** : inbox (2 types : alertes + notifications programmées, **pas** transientes), pastille non-lu, tap = détail.
- **22 Paramètres** : profil (nom éditable, email lecture seule, avatar), préférences (devise **= libellé seul**, D1 ; thème clair/sombre → `data-theme` ; langue FR/EN), liens aide/privacy/CGU/support, déconnexion (confirmation → Landing). Version simplifiable (`22` §11).
- **Tables** : `alerts`, `users` (préférences), tables privacy (existent).
- **Dépend de** : Lot 1 (peut se faire dès que Lot 1 fini, en parallèle des lots 3-5).

---

## 3. Transverse (tous les lots)

- **5 états par écran** : empty / loading (squelettes aux dimensions réelles, pulsation 1→0,45, jamais de spinner centré) / error (bandeau non bloquant, cache visible, « Réessayer ») / success (toast + retour dans le même geste) / pending (bouton grisé).
- **Hors ligne** : bandeau persistant, écritures en file. (Peut être minimal au MVP — à confirmer.)
- **Langue** : FR par défaut. Prévoir une couche i18n légère dès le Lot 1 (clés, pas de texte en dur) pour éviter la dette — EN est un réglage écran 22.
- **Devise** : `XOF` / `F` partout, format `lib/format/money.ts`.
- **Thème sombre** : chaque jeton a sa valeur sombre ; la zone d'identité (nuit) ne bascule jamais.
- **A11y** : cibles 44, contraste AA (les 2 verts), Dynamic Type jusqu'à 200 %, focus 2 px `brand/accent`, montants annoncés en entier au lecteur d'écran, la couleur ne porte jamais seule.
- **Sécurité — les 3 couches tournent en continu** (`SECURITY-3-LAYERS.md`) : **L1** Semgrep à chaque push (job `sast`) ; **L2** `parseJsonBody` + schéma Zod en tête de **chaque** route (body + query + params, `.strict()`), `user_id` toujours depuis `withAuth`, jamais le body ; **L3** revue logique métier fin de Lot 3 et fin de Lot 5. Aussi : chaque route via `withAuth` + `assertOwnership` ; erreurs via `toErrorResponse` (rien d'interne sur le fil).
- **Après chaque écran** : `graphify update .` + `npm test` (+ `npm run scan` si des règles maison sont touchées).

---

## 4. Séquence

```
P0 Semgrep(L1) ─ P1 schéma DB ─ P2 Zod(L2) ─ P3 design system ─ P4 nav shell ─ P5 (au fil de l'eau)
   ✅ fait          ✅ fait        ✅ fait        ✅ fait          ← ici
        │
        ▼
LOT 1 ──▶ [valid.] ──▶ LOT 2 ──▶ [valid.] ──▶ LOT 3 ──▶ [valid.] ──▶ LOT 4 ──▶ [valid.] ──▶ LOT 5 ──▶ [valid.] ──▶ LOT 6 ──▶ [valid.]
                                              🔎 L3 #1         (D6)                🔎 L3 #2
                                                                                  (D2)
L1 Semgrep : à chaque push, tous les lots.   L2 Zod : à chaque route, tous les lots.
LOT 6 peut démarrer en parallèle dès la fin du LOT 1.   Revue L3 finale + scan complet à Day 29.
```

**Prochaine action** : P4 — shell de navigation (`AppHeader`, `MenuDrawer`, route group `(app)` protégé).
