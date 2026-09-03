# 🔀 DESIGN RECONCILIATION — Handoff Claude Design ↔ Spec 22 écrans

**Statut** : D1, D2bis, D3, D4, D5 tranchés (2026-09-02) · D2, D6 différés au Lot 4/5
**Date** : 2026-09-02
**Auteur** : Claude Code (étape 1 de la phase « construction des écrans »)
**Périmètre** : rapprochement entre le handoff `DESIGN-HANDOFF/` et les 22 documents `Les 22 ECRANS/NN-*.md` + docs `docs/1..5`

---

## 0. TL;DR

Le handoff est **beaucoup plus aligné qu'il n'y paraît**. Les **10 fichiers de lot**
(`Lot 1` → `Lot 10`) ont été refaits pour coller aux 22 documents d'Elias : onboarding par
**code d'invitation 6 chiffres** (pas d'OTP), dépense/revenu/transfert, Score Financier +
Aides + Rapport, Templates + Budgets, seuils de budget 50/91/92 %… tout y est.

Ce qui a « dérivé », ce sont les **4 fichiers système** (`Documentation développeurs`,
`Design System`, `Thème sombre`, `Passe de cohérence`) : ils datent d'une version antérieure,
plus simple, du produit. **On les suit pour les valeurs du design system uniquement.**

Résultat : **1 correction de valeurs à appliquer** (déjà tranchée, non bloquante) +
**6 décisions produit** à prendre avant de coder les lots concernés. Rien ne bloque le Lot 1.

---

## 1. Règle de préséance (à graver)

Quand deux sources se contredisent, cet ordre tranche :

| Sujet | Source qui fait foi |
|---|---|
| **Comportement d'un écran** (rôle, logique, états, navigation, champs, règles métier) | `Les 22 ECRANS/NN-*.md` |
| **Rendu visuel d'un écran** (layout, hiérarchie, copie exacte, composants employés) | `DESIGN-HANDOFF/design/Swiftly - Lot N *.dc.html` |
| **Valeurs du design system** (jetons couleur, typo, géométrie, motion, specs de composant) | `DESIGN-HANDOFF/design/Swiftly - Documentation développeurs.dc.html` §01–03, §06 |
| **Couleurs — arbitrages** (les 2 verts, gris, rouge, géométrie de carte) | `Swiftly - Thème sombre.dc.html` + `Swiftly - Passe de cohérence.dc.html` |
| **Schéma de données, sécurité, infra** | `docs/2-ARCHITECTURE`, `docs/5-FOUNDATION`, conventions `lib/` déjà en place |

### ⚠️ Sections du handoff à IGNORER (périmées — décrivent l'ancien produit)

Dans `Swiftly - Documentation développeurs.dc.html` **et** `Swiftly Design System.dc.html` :

- **§04 « Carte des écrans »** — liste 20 écrans, nomme « Récurrences » (→ c'est *Templates + Budgets*),
  « Note et validation », « OTP », « Inscription — devise »… Le vrai inventaire = les 22 `NN-*.md`
  et les titres `<h2>` des 10 lots.
- **« State Management »** (`user/settings/accounts/transactions/…`) — modèle sous-spécifié :
  il manque `linkedTo` (« Lié à »), `status` (Effectué/Planifié/Remboursé), `sourceAccount`/
  `destinationAccount`, les champs de scoring, les frais de compte, la table `reports`, la table
  `budgets`… **Ne pas s'en servir pour le schéma DB.** Le schéma vient des `NN-*.md` + Foundation.
- **§05 « Règles métier »** — utile comme rappel, mais **« Transfert entre comptes : ni écran ni
  geste »** et **« Modification d'une transaction : reste à décider »** sont FAUX : l'écran 10
  (transfert) et l'édition (07 → 08/09/10) sont spécifiés et présents dans le Lot 3.
- **§09 « Ce qui n'est pas décidé »** — 8 points, dont plusieurs déjà tranchés par les `NN-*.md`
  (voir §3 ci-dessous).
- **Onboarding** — pas de « solde de départ », pas de « devise » à l'inscription, pas d'OTP.
  Lot 1 = Landing → Code d'invitation (6 chiffres) → Nom. Point.

---

## 2. Correction de valeurs (design system) — NON bloquant, déjà tranché

Le fichier `Swiftly Design System.dc.html` a 3 valeurs fausses. **Les lots ET la
`Documentation développeurs` utilisent déjà les bonnes** — je coderai celles-ci :

| Rôle | ❌ `Design System.dc.html` | ✅ Valeur retenue (lots) |
|---|---|---|
| Bleu d'action / `brand/accent` (clair) | `#1B3BF5` | **`#152BC7`** |
| Fond de page `surface/page` (clair) | `#F4F4F6` | **`#EBEBEF`** |
| Rouge sémantique `semantic/out` (clair) | `#E5352B` | **`#A80010`** |

+ Le bloc **« Surfaces — sombre »** de `Design System.dc.html` est **obsolète** → valeurs sombres
depuis `Swiftly - Thème sombre.dc.html`, reprises dans la table de jetons de
`Documentation développeurs.dc.html` §01 (24 jetons, colonnes clair/sombre).

**Seuils de budget** : `Documentation développeurs` §03 dit « vert <75 %, ambre 75–99 %, rouge
≥100 % ». **Périmé.** Le Lot 5 dit explicitement « 0–50 % vert, 51–91 % ambre, 92 %+ rouge,
exactement comme vos documents » → on garde **50 / 91 / 92 %**, alerte à **92 %** (repo 15-budgets).

→ Rien à décider ici. Listé pour traçabilité.

---

## 3. Décisions produit

> Format : **Question** — ce que dit chaque source — **recommandation** — lot impacté.

| # | Décision | Statut |
|---|---|---|
| D1 | Devise = **symbole seul** (pas de conversion au MVP) | ✅ tranché 2026-09-02 |
| D2 | Récurrences : moment d'exécution | ✅ tranché 2026-09-03 (Lot 5) — cron serveur quotidien |
| D2bis | **Un seul système = Templates** (pas d'écran « Récurrences ») | ✅ tranché 2026-09-02 |
| D3 | **Solde toujours dérivé**, tout se recalcule à l'édition | ✅ tranché 2026-09-02 |
| D4 | Solde négatif : dépense/transfert OK + avertissement, affectation projet refusée | ✅ validé 2026-09-02 |
| D5 | **Compte Principal créé à 0 F**, ajusté via écran 17 (pas d'étape onboarding) | ✅ tranché 2026-09-02 |
| D6 | Rapport : périmètre MVP = **sections 1-6 + 10** ; §8 (benchmark communauté) & §9 (comparaison annuelle) → Phase 2 | ✅ tranché 2026-09-03 (Lot 4) |

### D1 — Devise : conversion réelle ou symbole seul ? 🔴 bloque Lot 1 (choix devise) + partout

- **22 écrans** : `22-parametres` dit « la devise s'applique immédiatement à tous les écrans »,
  « recharge balances » — sans dire si les **montants sont convertis** ou si seul le **symbole**
  change. `17-gestion-comptes` a une devise **par compte** (FCFA défaut, USD, EUR).
- **Handoff** : symbole seul, aucune conversion, aucun taux (règle métier §05 + point ouvert §09).
- **Contexte** : cible = zone franc CFA, FCFA par défaut ; pas de source de taux prévue.
- ✅ **Recommandation** : **symbole seul pour le MVP.** Un seul montant stocké, jamais converti.
  La devise par compte (17) devient un simple libellé d'affichage. Conversion = Phase 2.
- **Impacts** : Lot 1 (l'étape devise n'existe pas dans Lot 1 → devise = réglage post-onboarding
  dans `22`, défaut FCFA), Lot 5/7, format des montants.

### D2 — Récurrences : quand le prélèvement s'exécute, et que faire d'une échéance ratée ?

- **22 écrans** : `08/09` slide 3 → « Récurrence : Une Fois / Quotidien / Mensuel ». Aucune
  mention du **moment d'exécution** ni du rattrapage.
- **Handoff** : idem — « les maquettes montrent la liste et ses états, pas le moment d'exécution »
  (points ouverts §09, ×2).
- ✅ **Tranché 2026-09-03 (Lot 5, reco retenue par Elias)** : exécution **côté serveur**,
  **cron quotidien** — `POST /api/cron/run` (Vercel Cron, `0 3 * * *`, gardé par `CRON_SECRET`).
  Le job (`lib/recurrence/service.ts`) matérialise les échéances dues des templates récurrents
  **et** prélève les frais mensuels des comptes bancaires/carte. Rattrapage borné (60 échéances
  max) : une échéance ratée est créée **à sa date**, le solde dérivé se met à jour. Aucun écran
  « récurrence en retard ». Idempotence : `transactions.recurrence_key` unique par
  `(règle, échéance)` → un double-passage du cron n'insère aucun doublon (migration `0004`).

### D2bis — « Template » et « récurrence » : deux systèmes ou un seul ?

- **22 écrans** : `14-templates` = liste de templates (tap = lance une transaction pré-remplie,
  l'utilisateur confirme). La **récurrence** est un champ dans le formulaire de transaction
  (`08/09` slide 3). Il n'y a **pas** d'écran « liste des transactions récurrentes ».
- **Handoff** : Lot 5 s'appelle « Transactions récurrentes » mais ne contient que **Templates +
  Budgets**. La `Documentation développeurs` §04 invente un écran « Récurrences » + « Nouvelle
  récurrence » qui **n'existe nulle part ailleurs**.
- ✅ **Recommandation** : **un seul système = Templates.** Le toggle « récurrence » du formulaire
  crée une règle d'auto-génération rattachée en interne (pas d'écran dédié au MVP). Ignorer
  l'écran « Récurrences » de la doc système.
- **Impacts** : Lot 5, modèle de données (`templates` + un champ `recurrence` sur la règle).

### D3 — Édition d'une transaction : recalcul des soldes

- **22 écrans** : `07` → bouton Modifier → rouvre `08/09/10` pré-rempli. OK. Mais rien sur ce
  qu'il advient des **soldes passés** / de l'historique du graphe.
- **Handoff** : règle 1 — « Solde disponible = base + revenus − dépenses − affectations projet.
  Aucun écran ne recalcule autrement. » + point ouvert « modification et historique : à décider ».
- ✅ **Recommandation** : adopter la règle 1 **telle quelle**. Le solde n'est **jamais stocké**,
  toujours dérivé. Éditer/supprimer une transaction → tout se recalcule, y compris les points
  passés du graphique. Pas de « solde figé » à une date. Simple et cohérent.
- **Impacts** : Lot 2 (courbe), Lot 3, toute la couche calcul.

### D4 — Solde négatif : autorisé ou refusé ?

- **22 écrans** : `04-dashboard` — « solde négatif autorisé : un avertissement s'affiche avant de
  confirmer une transaction/transfert qui ferait passer un compte en négatif, mais l'utilisateur
  peut confirmer ».
- **Handoff** : règle 2 — « jamais de solde négatif » — mais **uniquement** pour l'**affectation
  à un projet** (« Solde insuffisant », action refusée).
- ✅ **Recommandation** : **pas de contradiction, garder les deux.** Dépense/transfert → négatif
  permis avec avertissement (repo). Affectation projet → refusée si solde insuffisant (handoff).
  Deux opérations différentes, deux règles.
- **Impacts** : Lot 3 (dépense/transfert), Lot 6 (détail projet).

### D5 — Onboarding : capture-t-on un solde de départ ?

- **22 écrans** : Lot 1 = Landing → Code → Nom → Dashboard. Le « Compte Principal » est
  implicite. `17-gestion-comptes` : le solde initial d'un compte est saisi **à la création du
  compte**. Rien ne dit comment le Compte Principal obtient son solde de départ.
- **Handoff** : la `Documentation développeurs` avait une étape « Inscription — solde »
  (`account.base`) — **périmée**, absente du Lot 1.
- ✅ **Recommandation** : Compte Principal créé automatiquement à **0 F** ; l'utilisateur ajuste
  via `17` (ou crée d'autres comptes). Optionnel : un écran « solde de départ » léger juste après
  « Nom » si Elias le veut — **à trancher**.
- **Impacts** : Lot 1, `17`, création du compte par défaut.

### D6 — Rapport (écran 12) : périmètre MVP

- **22 écrans** : `12-rapports` = 10 sections, dont **§8 benchmarks « vs moyenne des utilisateurs
  au même stade »** et **§9 comparaison annuelle 2026 vs 2025**.
- **Handoff** : Lot 4 couvre le Score, les 4 critères, la projection, les points forts, la
  priorité, les conseils. (Pas de benchmark communautaire visible — cohérent avec un lancement.)
- **Problème** : les **benchmarks communautaires** exigent une base multi-utilisateurs qui
  n'existera pas au lancement ; la **comparaison annuelle** exige 12+ mois de données.
- ✅ **Tranché 2026-09-03 (Lot 4)** : Score + Aides + Rapport **mensuel sections 1–6 + 10**
  (vue d'ensemble, score, 4 critères, projection, points forts, priorité, conseils). **Différé**
  §8 (benchmark communauté) et §9 (comparaison annuelle) → Phase 2. Le Rapport annuel
  suit (mêmes sections, périmètre annuel) mais reste secondaire au lancement.
- **Impacts** : Lot 4, table `reports`, jobs de calcul.

---

## 4. Points déjà résolus par les `NN-*.md` (le handoff §09 les liste à tort comme ouverts)

| Point ouvert handoff | Résolution repo |
|---|---|
| « Multi-comptes et transactions » | `08/09` slide 1 : chaque transaction choisit son compte (Cash/Mobile/Banque/+Nouveau). Pas limité au compte actif. |
| « Transfert entre comptes » | Écran `10` entièrement spécifié (flux 3 slides, source ≠ destination, neutre, pas de scoring). Présent dans le Lot 3. |
| « Seuils de budget configurables » | Non configurables au MVP. Fixes : 50/91/92 %. Budgets mensuels uniquement (`15`). |
| « Suppression de compte » | `17` : soft delete (transactions conservées, compte marqué supprimé). Export/suppression RGPD = système privacy déjà livré (écrans 19–21). Suppression du compte utilisateur = Phase 2 (`22`). |
| « Modification d'une transaction » (UI) | `07` → Modifier → `08/09/10` pré-rempli. Seul le **recalcul des soldes** restait à décider → D3. |

---

## 5. Alignements confirmés (rien à faire, pour info)

- **Auth** : code d'invitation 6 chiffres → nom d'utilisateur. Lot 1 = repo `02`/`03` =
  convention `lib/auth` + Security Point 19. Pas d'OTP.
- **Score Financier** : Lot 4 rend bien les 4 critères pondérés (40/25/25/10), le /100, les
  paliers, la page Aides (définitions + exemples + « comment améliorer »), la projection
  d'indépendance. = repo `11`/`13`.
- **Dashboard** : compteur odomètre + tracé de courbe rejoués au changement de compte/période/
  retour de transaction, pas au scroll. Bandeau rotatif. = repo `04`.
- **Templates + Budgets** : une seule carte de liste (icône 48, rythme 8), varie seulement la
  donnée à droite. = repo `14`/`15`.
- **Privacy** : Lot 8 = Consentement + Politique + Réglages = repo `19`/`20`/`21` +
  système déjà codé (`app/privacy`, `components/privacy`). Réconcilier, ne pas refaire.
- **Mode privacy (œil)** : masquage global des montants `•• •••`, survit au changement d'écran
  et de thème. Cohérent avec l'icône œil du dashboard repo `04`.
- **Menu** : ~10 entrées (Dashboard, Statistiques, Comptes, Templates, Budgets, Projets,
  Alertes, Historiques, Aides, Rapport), bande visible sur le bord, item actif mis en évidence.
  = repo `05`. (La `Documentation développeurs` qui dit « 7 entrées + tiroir 300 px » est périmée.)

---

## 6. Prochaine étape

→ ✅ D1, D2, D2bis, D3, D4, D5, D6 tous tranchés (D2 → Lot 5, cron serveur quotidien ; D6 → Lot 4).
→ Je produis `BUILD-PLAN.md` (ordre des 6 lots repo, inventaire des 14 composants, tables
Supabase par lot, jobs de calcul).
→ Puis la couche design system en code (thème Tailwind 4 + 24 jetons + typo + géométrie +
motion + format des montants).
→ Puis Lot 1.
