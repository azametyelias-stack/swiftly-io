# 📱 SWIFTLY.IO — CARTE PRODUIT: 22 ÉCRANS MVP (+ 2 réservés Phase 2+)

**Statut:** Final  
**Date:** 25 août 2026 (màj 31 août 2026)  
**Purpose:** Vue d'ensemble structurelle des 22 écrans MVP (numéro, nom, flux, statut, navigation)  
**Découpage en lots:** 6 flux logiques, 2-5 écrans par flux

---

> ## 🔄 MISE À JOUR (31 août 2026) — Décompte clarifié : 22 écrans MVP
>
> **Le vrai décompte est 22 écrans MVP réels, pas 24.** Le tableau ci-dessous va de 01 à 24,
> mais les écrans **23 et 24 sont des emplacements RÉSERVÉS Phase 2+** (2FA, biométrie,
> export, backup/restore) — sans nom, sans flux, sans maquette. Ils ne sont PAS des écrans
> MVP.
>
> ```
> 24 lignes dans le tableau
> − 2 écrans réservés (23, 24 = Phase 2+, non maquettés)
> ─────────────────────────────
> = 22 écrans MVP réels et maquettés (01 à 22)
> ```
>
> **Formulation officielle partout : « 22 écrans MVP (01-22) + 23-24 réservés Phase 2+ ».**
> Les 22 maquettes sont finies. Chaque écran 01-22 a son document `SCREEN-XX.md` qui
> explique à Claude Code le rôle, la logique, les états et la navigation de l'écran.
>
> Le tableau et les décomptes ci-dessous ont été ajustés pour refléter 22 (au lieu de 24).
> Les lignes 23-24 sont conservées, clairement marquées « réservé Phase 2+ ».

---

## TABLEAU COMPLET: 22 ÉCRANS MVP (+ 23-24 réservés Phase 2+)

| # | Nom Écran | Flux | Arrive de | Va vers | Notes |
|----|-----------|------|-----------|---------|-------|
| **01** | Landing Page | Onboarding | — | 02 | Présentation Swiftly.io + "Démarrer" |
| **02** | Connexion Code | Onboarding | 01 | Dashboard (03) | Code invitation 6-digit |
| **03** | Connexion Username | Onboarding | 02 | Dashboard | Peut être skippée MVP (Optional) |
| **04** | Dashboard | Core | 02 (login success) | Menu ou statistiques | Hub central, solde + alerts + recent tx |
| **05** | Menu / Navigation | Core | Anywhere (swipe) | Chaque section | Swipe latéral, accès à tous les écrans |
| **06** | Historiques (Transactions) | Transactions | Dashboard ou Menu | 07 (tap) | Liste complète, filtres (type, tri) |
| **07** | Détails Transaction | Transactions | 06 (tap) | Historiques (close) ou 08 (modifier) | Montant, catégorie, "Lié à", notes |
| **08** | Créer/Modifier Dépense | Transactions | Dashboard (+) ou 07 (modifier) | 06 (après save) | Montant, catégorie (Inv/Cons), compte |
| **09** | Créer/Modifier Revenu | Transactions | Dashboard (+) | 06 (après save) | Montant, catégorie (Actif/Passif), "Lié à" |
| **10** | Créer/Modifier Transfert | Transactions | Dashboard (+) | 06 (après save) | Compte source/destination |
| **11** | Statistiques (Overview + Drill-down) | Statistiques | Dashboard ou Menu | Charts | Dropdown mode (Aperçu/Dépense/Revenu/Patrimoine) + période |
| **12** | Rapports (Monthly/Yearly) | Statistiques | Menu ou notification alert | Aides (link) | Auto-généré mois 1er, shows précédent rapport |
| **13** | Aides (Help Page) | Statistiques | Menu ou rapport link | Retour | Explique Financial Freedom Score + FAQ |
| **14** | Templates | Transactions Récurrentes | Dashboard ou Menu | 08/09/10 (launch template) | Liste templates, tap=launch, long-press=menu |
| **15** | Budgets | Transactions Récurrentes | Dashboard ou Menu | Détails budget | Liste budgets, tap=details+progress, alerts 92% |
| **16** | Projets (Gestion Objectifs) | Projets | Dashboard ou Menu | Détails projet | Liste, cards avec progress bar, empty state |
| **17** | Gestion des Comptes (Linked Accounts) | Paramètres | Dashboard ou Menu | Détails compte | Compte Principal + comptes liés (cartes/mobile money) |
| **18** | Alertes & Notifications (Inbox) | Paramètres | Dashboard (bell) ou Menu | Détails alerte (tap) | Deux types: Alertes + Notifications programmées, NOT transientes |
| **19** | Consentement / Privacy Banner | Privacy | 03 (première visite) | 04 (Dashboard, après accept) | Courte explication + bouton "J'accepte" |
| **20** | Privacy Page (Complète) | Privacy | Menu ou link from 19 | Retour | Explique données collectées + usage |
| **21** | Privacy Settings (Contrôles) | Privacy | Menu ou 20 | Retour | Toggles: géolocalisation, push, analytics |
| **22** | Paramètres Utilisateur (Profile) | Paramètres | Menu | Retour | Nom/email, devise, thème, langue, logout |
| **23** | *(Réservé Phase 2+)* | — | — | — | Future: 2FA, biometrics, export |
| **24** | *(Réservé Phase 2+)* | — | — | — | Future: backup/restore, data deletion |

> **Note :** les écrans 23 et 24 ne font PAS partie du MVP. Ce sont des emplacements
> réservés pour la Phase 2+, sans maquette. Le MVP compte **22 écrans réels (01-22)**.

---

## RÉSUMÉ PAR FLUX (6 lots)

### LOT 1: ONBOARDING & AUTHENTICATION (3 écrans)
| Écran | Nom |
|-------|-----|
| 01 | Landing Page |
| 02 | Connexion Code |
| 03 | Connexion Username |

**Durée estimée:** 1-2 jours  
**Dépendances:** Aucune  
**Priorité:** MUST HAVE (blocking all others)

---

### LOT 2: CORE UI & DASHBOARD (2 écrans)
| Écran | Nom |
|-------|-----|
| 04 | Dashboard |
| 05 | Menu / Navigation |

**Durée estimée:** 1 jour  
**Dépendances:** Lot 1 (auth)  
**Priorité:** MUST HAVE (hub center)

---

### LOT 3: TRANSACTIONS (5 écrans)
| Écran | Nom |
|-------|-----|
| 06 | Historiques |
| 07 | Détails Transaction |
| 08 | Créer/Modifier Dépense |
| 09 | Créer/Modifier Revenu |
| 10 | Créer/Modifier Transfert |

**Durée estimée:** 3-4 jours  
**Dépendances:** Lot 1, Lot 2  
**Priorité:** MUST HAVE (core feature)  
**Breakdown:** 3 types de transactions distincts, chacun avec logique spécifique

---

### LOT 4: STATISTIQUES & RAPPORTS (3 écrans)
| Écran | Nom |
|-------|-----|
| 11 | Statistiques (Overview + Drill-down) |
| 12 | Rapports |
| 13 | Aides |

**Durée estimée:** 2-3 jours  
**Dépendances:** Lot 3 (transactions exist)  
**Priorité:** SHOULD HAVE (core value but can defer)  
**Notes:** Rapports auto-générés, Financial Freedom Score central

---

### LOT 5: COMPTES, BUDGETS, PROJETS, TEMPLATES (4 écrans)
| Écran | Nom |
|-------|-----|
| 14 | Templates |
| 15 | Budgets |
| 16 | Projets |
| 17 | Gestion des Comptes |

**Durée estimée:** 2-3 jours  
**Dépendances:** Lot 2, Lot 3  
**Priorité:** SHOULD HAVE (productivity features)  
**Breakdown:** 4 fonctionnalités, chacune avec propre écran

---

### LOT 6: ALERTES & PARAMÈTRES (5 écrans)
| Écran | Nom |
|-------|-----|
| 18 | Alertes & Notifications |
| 19 | Consentement / Privacy Banner |
| 20 | Privacy Page |
| 21 | Privacy Settings |
| 22 | Paramètres Utilisateur |

**Durée estimée:** 2-3 jours  
**Dépendances:** Lot 1 (auth)  
**Priorité:** MUST HAVE (privacy + settings essential)  
**Breakdown:** Privacy est contractuel, settings essentiel

---

## TIMELINE RECOMMANDÉE: 30 JOURS

```
Days 0-2:   Validation + Documentation (Claude Design prep)
Days 2-5:   Claude Design (Emil + Apple phases)
Days 6-8:   Handoff prep

Days 8-10:  LOT 1 (Onboarding) — Claude Code build
Days 11-14: LOT 2 (Dashboard) + LOT 3 start (Transactions)
Days 15-18: LOT 3 finish (Transactions) + LOT 4 start (Stats)
Days 19-22: LOT 4 finish (Stats) + LOT 5 (Budgets/Projets/Templates)
Days 23-26: LOT 6 (Alerts/Settings/Privacy)
Days 27-30: Testing + fixes + deploy

Day 30:     LAUNCH 🚀 (5-10 beta users)
```

---

## ÉTATS CRITIQUES À NE PAS OUBLIER

Pour CHAQUE écran:

| État | Quand? | Exemple |
|------|--------|---------|
| **Empty** | Aucune donnée | Aucun projet, "Aucun projet. Ajoutez-en un..." |
| **Loading** | API call en cours | Skeleton loaders, spinner |
| **Error** | API fail or network down | "Erreur de chargement. Réessayer?" |
| **Success** | Action complétée | Toast "Dépense enregistrée ✓" |
| **Pending** | Async action en cours | Button disabled "Enregistrement..." |

---

## DÉPENDANCES CRITIQUES

```
Auth Flow (Lot 1) 
  ↓
Dashboard (Lot 2)
  ↓
Transactions (Lot 3) ← Core feature, blocks Lot 4, 5
  ↓
Statistics (Lot 4)
  ↓
Budgets/Projects (Lot 5)

Parallel: Settings/Privacy (Lot 6) — can happen anytime after Lot 1
```

---

## ESTIMATION FINALE

| Lot | Écrans | Jours Claude Design | Jours Claude Code | Total |
|-----|--------|------------------|------------------|-------|
| 1 | 3 | 0.5 | 1.5 | 2 |
| 2 | 2 | 0.5 | 1 | 1.5 |
| 3 | 5 | 1.5 | 3 | 4.5 |
| 4 | 3 | 1 | 2.5 | 3.5 |
| 5 | 4 | 1 | 2 | 3 |
| 6 | 5 | 1.5 | 2 | 3.5 |
| **TOTAL** | **22** | **6** | **12** | **18** |

*(22 écrans MVP réels = somme des 6 lots : 3+2+5+3+4+5. Les écrans 23-24 réservés Phase 2+ ne sont pas comptés.)*

**Plus setup/testing/deployment:** 30 jours (including buffer + QA)

---

## GO/NO-GO DECISION POINTS

Before moving to next Lot:

```
LOT 1 Complete?
  □ Auth flow works (no bugs)
  □ Dashboard loads on auth success
  → YES: Go to LOT 2

LOT 2 Complete?
  □ Menu navigation smooth
  □ Can switch between screens
  → YES: Go to LOT 3

LOT 3 Complete?
  □ Can create Dépense/Revenu/Transfert
  □ Transactions appear in Historiques
  □ Financial Freedom Score updates
  → YES: Go to LOT 4

LOT 4 Complete?
  □ Statistics calculated correctly
  □ Reports generate monthly
  → YES: Go to LOT 5

LOT 5 Complete?
  □ Budgets alert at 92%
  □ Projects track progress
  □ Templates work
  → YES: Go to LOT 6

LOT 6 Complete?
  □ Privacy settings functional
  □ Alerts working
  □ No critical bugs in Sentry
  → YES: LAUNCH
```

---

## Notes Générales

- **Nom des fichiers:** Align exactement entre PNG et docs
  - ✅ `01-landing-page.png` + `01-landing-page.md`
  - ❌ `screen-1.png` + `Landing.md`

- **Formats:** PNG plein écran (no Figma frames), Markdown docs

- **Chaque doc contient:**
  1. But de l'écran
  2. États (vide, chargement, erreur, succès)
  3. Interactions (cliquable, swipable)
  4. Sorties (vers quel écran)

- **Animations:** Décidées par Emil + Apple, pas spécifiées dans docs

---

## End of Product Map

Use this alongside **SWIFTLY-CONTEXT-GENERAL-COMPLET.md** as your project bible.

**Together:** Context + Map = complete project understanding.

---

**Créé:** 25 août 2026  
**Pour:** Elias + Claude Design + Claude Code  
**Status:** FINAL
