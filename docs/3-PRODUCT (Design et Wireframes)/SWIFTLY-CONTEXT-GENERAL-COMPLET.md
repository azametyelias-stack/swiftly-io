# 📖 SWIFTLY.IO — CONTEXTE GÉNÉRAL COMPLET

**Document créé:** 25 août 2026 (màj 31 août 2026)  
**Version:** 1.1  
**Destinataire:** Claude Design + Claude Code + Team Swiftly  
**Purpose:** Vue d'ensemble du projet, architecture des 22 écrans MVP (+ 2 réservés Phase 2+), et stratégie de travail avec Emil + Apple

---

> ## 🔄 MISE À JOUR (31 août 2026) — Décompte clarifié : 22 écrans MVP
>
> Ce document parle de « 24 écrans » à plusieurs endroits. Le décompte correct est
> **22 écrans MVP réels (01-22)** + **2 emplacements réservés Phase 2+ (23-24** : 2FA,
> biométrie, export, backup — non maquettés). Le « 24 » comptait les 2 réservés.
>
> **Formulation officielle : « 22 écrans MVP (01-22) + 23-24 réservés Phase 2+ ».**
> Les 22 maquettes sont finies ; chaque écran 01-22 a son `SCREEN-XX.md`. Voir la carte
> produit (`SWIFTLY-CARTE-PRODUIT-22-ECRANS.md`) pour le détail écran par écran.
>
> Les décomptes principaux ci-dessous ont été ajustés à 22. Le contenu (flux, vision,
> Emil/Apple) est conservé tel quel.

---

## TABLE DES MATIÈRES

```
I.   VUE D'ENSEMBLE DU PROJET
II.  ARCHITECTURE DU PRODUIT (5 BRANCHES)
III. LES 24 ÉCRANS MVP — STRUCTURE & FLUX
IV.  RÔLE D'EMIL DESIGN ENGINEERING
V.   RÔLE D'APPLE DESIGN
VI.  QUAND UTILISER EMIL VS APPLE
VII. STACK TECHNIQUE
VIII.WORKFLOW DE TRAVAIL
IX.  CONTRAINTES & PRINCIPES
X.   GLOSSAIRE
```

---

# I. VUE D'ENSEMBLE DU PROJET

## Vision & Mission

**Swiftly.io** est un **écosystème fintech personnel** construit pour les utilisateurs francophones d'Afrique (unserved market majeur).

**Mission:** Transformer la relation des gens avec l'argent — du chaos à la clarté, de l'absence de contrôle à l'indépendance financière.

**Produit fondamental:** Un écosystème à **5 branches interconnectées**, chacune résolvant un besoin financier spécifique, mais toutes partageant:
- Une **identité visuelle unique**
- Un **système de navigation unifié** (bottom bar + menu swipe)
- Une **base de données unifiée** (Supabase)
- Une **authentification centralisée** (via code d'invitation MVP)

---

## Valeur Clé: Financial Independence Score

Chaque utilisateur a un **Financial Freedom Score** (ou Financial Independence Score):

```
Financial Freedom Score = (Passive Income / Total Expenses) × 100

Interprétation:
- 0-25   = Beginner (dépendance totale des revenus actifs)
- 25-50  = Growing (quelques revenus passifs)
- 50-100 = Strong (revenus passifs importants)
- 100+   = Financial Freedom (les revenus passifs couvrent les dépenses)
```

Ce score:
- Se **calcule automatiquement** chaque mois
- Apparaît dans les **rapports mensuels**
- Détermine la **répartition Dépenses** (Investissement vs. Consommation)
- Détermine la **répartition Revenus** (Actif vs. Passif)
- Est le **moteur d'engagement** de Swiftly.io

---

## Position Marché & Utilisateurs

**Segment:** Jeunes professionnels (18-45 ans) en Afrique Francophone (Togo, Côte d'Ivoire, Sénégal, Cameroun, Congo)

**Besoin:** Manque total d'outils financiers localisés + confiance envers les grandes banques + mobile-first mentality

**Opportunité:** 
- 60%+ unbanked ou underbanked en Afrique Francophone
- 80%+ utilisent mobile pour les transactions
- 0% d'outils "financial independence" natives localisés

**Swiftly.io = first mover advantage** dans cette région pour cette use case.

---

## Timeline MVP

- **Phase 1 (MVP Web):** 30 jours (août 2026)
  - Solo dev (Elias) + Claude + 1 part-time backend
  - 22 écrans MVP (01-22) + 2 réservés Phase 2+ (23-24)
  - Supabase + Next.js + Vercel
  - 5-10 utilisateurs beta via code d'invitation

- **Phase 2 (Traction):** 3-9 mois (sept 2026 - mai 2027)
  - 1K - 10K users
  - Stabiliser architecture
  - Intégrer SwiftlyPay (payments)

- **Phase 3 (Growth):** 9-18 mois (mai 2027 - déc 2027)
  - 10K - 100K users
  - Ajouter SwiftlyBank (savings/digital banking)
  - Équipe complète (10-15 personnes)

- **Phase 4 (React Native):** 12-18 mois après MVP web
  - App Store launch avec glassmorphism native
  - 100K+ users

---

# II. ARCHITECTURE DU PRODUIT: 5 BRANCHES

Swiftly.io n'est **pas une app single**, c'est un **écosystème de 5 services interconnectés**.

```
┌─ SWIFTLY.IO ─────────────────────────────────────┐
│                                                   │
│  (Shared: Auth + Bottom Navigation + Design)     │
│                                                   │
│  ├─ SwiftlyTrack (Personal Finance Tracking)     │
│  ├─ SwiftlyPay (Digital Wallet & Payments)       │
│  ├─ SwiftlyMarket (Marketplace)                  │
│  ├─ SwiftlyBank (Digital Banking & Savings)      │
│  └─ SwiftlyInvest (Investments: Stocks + Crypto) │
│                                                   │
└───────────────────────────────────────────────────┘
```

### SwiftlyTrack (Personal Finance Tracking)

**Objectif:** Répondre à la question: "Où va mon argent?"

**Features principales:**
- Dashboard central (vue d'ensemble des dépenses/revenus/comptes)
- Tracking des transactions (dépenses / revenus / transferts)
- Catégorisation automatique (Investissement vs. Consommation pour dépenses; Actif vs. Passif pour revenus)
- Templates & Budgets (automatiser les transactions récurrentes + alertes dépassement)
- Projets (suivi des buts: maison, voiture, formation)
- Rapports mensuels/annuels (analyse complète + Financial Freedom Score)
- Comptes liés (cash + cartes + mobile money)
- Alertes & Notifications (budget atteint 92%, nouveau rapport prêt, etc.)

**MVP Screens:** 18 écrans (onboarding à part)

**Scope:** MVP couvre SWIFTLYTRACK SEULEMENT. Les autres branches (Pay, Bank, Invest, Market) sont "Coming Soon" mais intégrées en tant que menu items vides (futur).

---

### SwiftlyPay (Digital Wallet & Payments)

**Objectif:** "J'envoie de l'argent en 2 taps"

**Features principales:**
- Agrégation de réseaux de paiement existants (Wave, Orange Money, MTN, etc.)
- Portefeuille numérique centralisé
- Envoi d'argent (à contacts, via code, lien)
- Requête d'argent
- Historique de paiements

**Status MVP:** NON INCLUS (Q4 2026)

---

### SwiftlyMarket (Marketplace)

**Objectif:** "Acheter/vendre localement en sécurité"

**Features principales:**
- Listing d'items (locaux, vérifiés)
- Système de notation
- Intégration paiements (SwiftlyPay)
- Chat + Escrow

**Status MVP:** NON INCLUS (Q1 2027)

---

### SwiftlyBank (Digital Banking & Savings)

**Objectif:** "Épargner et accumuler des intérêts"

**Features principales:**
- Comptes d'épargne avec taux d'intérêt
- Liquidité optimale (accès rapide vs. rendement)
- Historique d'intérêts générés
- Microcrédit (futur)

**Status MVP:** NON INCLUS (Q4 2026)

---

### SwiftlyInvest (Investments)

**Objectif:** "Investir en bourse (local + international) & crypto"

**Features principales:**
- Accès BRVM (bourse ouest-africaine)
- Stocks internationaux
- ETFs
- Obligations
- Crypto (Bitcoin, Ethereum, locales)
- Portefeuille agrégé
- Alertes prix

**Status MVP:** NON INCLUS (Q1 2027)

---

## Navigation Unifiée (2 Niveaux)

### Niveau 1: Bottom Bar (5 icônes)

```
┌──────────────────────────────────────────┐
│                                          │
│              CONTENU DE L'APP             │
│                                          │
├──────────────────────────────────────────┤
│ Track  │  Pay  │  Market  │  Bank │ Invest│
└──────────────────────────────────────────┘
```

**Purpose:** Permet de switcher ENTRE branches (cross-engagement)

**Stratégie:** Si quelqu'un est dans Track, la navigation bottom bar le pousse à explorer Pay/Bank/Invest. C'est un **moteur de virality**.

---

### Niveau 2: Swipe Menu (Branche-spécifique)

```
SWIPE RIGHT (doigt glisse du bord gauche vers droite)
          ↓
┌─────────────────────────────────────┐
│ MENU TRACK                          │  ÉCRAN ACTUEL
│ ├─ Dashboard                        │  (offset à droite,
│ ├─ Historiques                      │   visible en background)
│ ├─ Budgets                          │
│ ├─ Projets                          │
│ ├─ Templates                        │
│ ├─ Rapports                         │
│ ├─ Gestion des Comptes              │
│ ├─ Alertes & Notifications          │
│ ├─ Aides                            │
│ └─ Paramètres                       │
│                                     │
└─────────────────────────────────────┘
```

**Purpose:** Navigation INTRA-branche (toutes les sections de SwiftTrack)

**Détail:** Menu accessible de n'importe où via swipe gauche-droite (inspiré Claude mobile app)

---

# III. LES 24 ÉCRANS MVP — STRUCTURE & FLUX

## Vue Globale des 22 Écrans MVP (+ 23-24 réservés Phase 2+)

```
TOTAL: 22 écrans MVP (01-22)  [+ 23-24 réservés Phase 2+, non maquettés]
├─ Onboarding & Auth: 3 écrans
├─ SwiftTrack Core: 15 écrans
├─ Core UI (Menu + Navigation): 1 écran
├─ Settings & Privacy: 5 écrans (dont Privacy/Consentement)
└─ Réservés Phase 2+ (23-24): 2FA, biometrics, export, backup — non comptés dans le MVP
```

---

## Détail des 22 Écrans MVP (+ 23-24 réservés Phase 2+)

Voir le **fichier "CARTE PRODUIT"** ci-dessous pour le tableau complet.

Mais voici les FLUX CLÉS:

---

## FLUX 1: ONBOARDING & AUTHENTIFICATION (3 écrans)

```
01. LANDING PAGE
    └─ Présenter Swiftly.io
    └─ "Démarrer" → CONNEXION CODE

02. CONNEXION CODE
    └─ Code d'invitation 6-digit
    └─ Vérifier code → DASHBOARD
    └─ Si erreur: re-demander code

03. CONNEXION USERNAME (Optional, future)
    └─ Créer username
    └─ (Peut être skippée MVP, ajoutée phase 2)
```

**Status:** 2 écrans MVP (Landing + Connexion Code). L'écran 03 est dans le design mais peut être skippé en production alpha.

---

## FLUX 2: DASHBOARD & VUE D'ENSEMBLE (2 écrans)

```
04. DASHBOARD (Hub central)
    └─ Vue d'ensemble: solde total, dépenses/revenus du mois
    └─ Alertes actives (budget atteint 92%, nouveau rapport)
    └─ Recent transactions (5 dernières)
    └─ Quick actions: +Dépense, +Revenu, +Transfert
    └─ Peut accéder: Historiques, Statistiques, Paramètres
    └─ Navigation: Menu swipe (gauche) + Bottom bar

05. MENU / NAVIGATION (Swipe latéral)
    └─ Liste de liens vers toutes les sections
    └─ Les items ouvrent les écrans correspondants
```

---

## FLUX 3: TRANSACTIONS (5 écrans)

```
06. HISTORIQUES (Transaction list)
    └─ Toutes les transactions (Dépenses + Revenus + Transferts)
    └─ Filtres: Tout/Dépense/Revenu/Transfert, Récent/Ancien
    └─ Tap → détails; Long-press → menu (modify/delete)
    └─ Swipe left: Delete; Swipe right: Détails

07. DÉTAILS TRANSACTION (après tap sur historique)
    └─ Montant + devise
    └─ Catégorie (Investissement/Consommation pour Dépenses)
    └─ "Lié à" (Personne ou Projet)
    └─ Compte source/destination
    └─ Date & heure
    └─ Notes
    └─ Bouton "Modifier"

08. CRÉER DÉPENSE (Action rapide + via +button)
    └─ Montant (required)
    └─ Catégorie (Investissement/Consommation, required)
    └─ "Lié à" (Personne/Projet, optionnel)
    └─ Compte source (required, default = Compte Principal)
    └─ Notes (optionnel)
    └─ Date (default = aujourd'hui)
    └─ Save → Toast "Dépense enregistrée ✓"

09. CRÉER REVENU (Action rapide + via +button)
    └─ Montant (required)
    └─ Catégorie (Actif/Passif, required)
    └─ "Lié à" (Personne/Projet, required)
    └─ Compte destination (required, default = Compte Principal)
    └─ Notes (optionnel)
    └─ Date (default = aujourd'hui)
    └─ Save → Toast "Revenu enregistré ✓"

10. CRÉER TRANSFERT (Action rapide + via +button)
    └─ Montant (required)
    └─ Compte source (required)
    └─ Compte destination (required)
    └─ Notes (optionnel)
    └─ Date (default = aujourd'hui)
    └─ Save → Toast "Transfert effectué ✓"
```

**Détail pédagogique:**
- Les 3 types de transactions (Dépense/Revenu/Transfert) sont distincts INTENTIONNELLEMENT
- Les dépenses & revenus contribuent au Financial Freedom Score
- Les transferts sont des mouvements neutres (pas de scoring)
- La catégorisation (Inv/Cons, Actif/Passif) détermine le "fitness" financier affiché dans les rapports

---

## FLUX 4: STATISTIQUES & RAPPORTS (3 écrans)

```
11. STATISTIQUES (Overview + drill-down)
    └─ Dropdown 1: "Aperçu" (mode)
       ├─ Aperçu = 4 sections (Vue d'ensemble, Répartition Dépenses, Répartition Revenus, Score Financier)
       ├─ Dépense = dedicated expense-only page
       ├─ Revenu = dedicated income-only page
       └─ Patrimoine = net worth aggregation (future, non designed)
    └─ Dropdown 2: "Aujourd'hui" (période: Jour/Semaine/Mois/Année)
    └─ "+" button = shortcut to add transaction
    └─ Chaque section: graphiques + nombres

12. RAPPORTS (Monthly/Yearly)
    └─ Auto-généré le 1er de chaque mois (mois précédent) et le 1er janvier (année précédente)
    └─ Affiche le rapport le plus récent complété
    └─ Contenu: résumé, comparaison période précédente, score, conseils
    └─ Narrative: "Votre indépendance financière a augmenté de 5% ce mois-ci"
    └─ Arrow/dropdown: parcourir les rapports précédents
    └─ Swipe left arrow: voir rapport antérieur

13. AIDES (Help page)
    └─ Explique le Financial Freedom Score
    └─ FAQ sur Investissement vs. Consommation
    └─ Conseils d'utilisation
```

---

## FLUX 5: TEMPLATES & BUDGETS (2 écrans)

```
14. TEMPLATES (Modèles de transactions récurrentes)
    └─ Liste de templates (salaire, loyer, abonnement, etc.)
    └─ Tap = lancer le template (crée une transaction)
    └─ Long-press = menu (modify/delete)
    └─ Swipe left = delete; Swipe right = open
    └─ Dropdowns: "Récent" (tri), "Favoris" (filtre)
    └─ Buttons: "+" (create), "+ Créer Template" (same action)

15. BUDGETS (Budgets mensuels par catégorie)
    └─ Liste de budgets (Alimentation, Transport, Loisirs, etc.)
    └─ Tap = affiche détails + progress bar
    └─ Long-press = menu (modify/delete)
    └─ Alert: si budget atteint 92% → dashboard notice + notification
    └─ Dropdowns: "Récent" (tri)
    └─ Buttons: "+" (create), "+ Créer Budget" (same action)
```

---

## FLUX 6: PROJETS (1 écran)

```
16. PROJETS (Gestion des objectifs d'épargne)
    └─ Liste de projets (maison, voiture, formation, etc.)
    └─ Chaque carte: nom, description, montant cible, progress bar, date fin
    └─ Tap = détails; Long-press = menu; Swipe left = delete; Swipe right = open
    └─ Empty state: "Aucun projet" + "Suivez vos projets en cours..."
    └─ Button: "+ Ajouter un projet"
    └─ Field "Catégorie" (required): dropdown avec options + "Autre"
    └─ Field "Montant cible" (optional): si fourni, progress bar
```

---

## FLUX 7: GESTION DES COMPTES (1 écran)

```
17. GESTION DES COMPTES (Linked accounts)
    └─ Compte Principal (cash on hand, non-modifiable)
    └─ Comptes liés (cartes, comptes bancaires, mobile money)
    └─ Chaque compte: type icône, nom, solde actuel, type de lien
    └─ Tap = détails & transactions; Long-press = options
    └─ Button: "+ Ajouter un compte"
    └─ Types: Cash, Visa/Mastercard, Compte bancaire, Wave, Orange Money, etc.
    └─ Chaque type a des champs de liaison spécifiques
```

---

## FLUX 8: ALERTES & NOTIFICATIONS (1 écran)

```
18. ALERTES & NOTIFICATIONS (Inbox)
    └─ Deux types affichés:
       ├─ ALERTES (réactives, sauvegardées: "Budget Alimentation atteint 92%")
       └─ NOTIFICATIONS (programmées, sauvegardées: "Votre score financier a augmenté")
    └─ Toast transientes (validation "Transaction saved") ne s'affichent pas ici
    └─ Dropdowns: "Tout" (type), "Récent" (tri)
    └─ Tap = affiche détails; Swipe left = effacer
```

---

## FLUX 9: SETTINGS & PRIVACY (5 écrans)

```
19. CONNEXION / CONSENTEMENT (Première visite)
    └─ Banner "Nous protégeons vos données"
    └─ Courte explication du traitement des données
    └─ Bouton "J'accepte"

20. PRIVACY PAGE (Explique la politique complète)
    └─ Données collectées
    └─ Comment elles sont utilisées
    └─ Garanties de sécurité

21. PRIVACY SETTINGS (Contrôles utilisateur)
    └─ Toggle: "Partager données de géolocalisation"
    └─ Toggle: "Autoriser push notifications"
    └─ Toggle: "Analytics (comprendre les patterns)"

22. PARAMÈTRES UTILISATEUR (Profile + settings généraux)
    └─ Nom & email
    └─ Devise par défaut (default = devise locale)
    └─ Thème (light/dark, default = light)
    └─ Langue (default = FR)
    └─ Aide & support
    └─ Politique de confidentialité
    └─ Conditions générales
    └─ Déconnexion

23-24. (Réservés pour améliorations futures)
    └─ Possible: 2FA, biometrics, backup/restore, export data, etc.
```

---

## ÉCRANS HORS-SCOPE MVP (Documentés mais pas dans les 22)

```
OFFLINE / ERROR:
- Écran "Pas d'internet" (affiché si Supabase inaccessible)
- Message user-friendly + retry button

ADMIN DASHBOARD:
- Dashboard admin Elias (voir tous les users, transactions, statistiques d'utilisation)
- Pas fourni aux utilisateurs beta

CMS SCREENS:
- Gestion des catégories (admin)
- Gestion des templates (admin)
```

---

# IV. RÔLE D'EMIL DESIGN ENGINEERING

## Qui est Emil Kowalski?

Emil Kowalski est un design engineer renommé (Sonner — 13M+ weekly downloads, Linear, Vercel).

Sa philosophie: **"Good taste is trained, not innate."**

---

## Qu'apporte Emil à Swiftly.io?

**Emil specializes in:**
1. ✨ **UI Polish** — détails invisibles qui font la différence
2. 🎬 **Animation Design** — easing curves, timing, motion feeling
3. 🎨 **Component Architecture** — DX, good defaults, edge cases invisibly handled
4. 📱 **Interaction Feedback** — button press, hover states, state transitions
5. 🔍 **Detail-oriented Craft** — spacing, alignment, typography rhythm

**Son approche:** Detail-obsessive. Unseen details compound into something stunning.

---

## Quand Utiliser Emil (MOMENTS CLÉ)

### 1️⃣ **Composants Interactifs**

Chaque fois que tu crées/reviews:
- Buttons (colors, press states, hover states)
- Forms (input focus, error states, success states)
- Cards (tap feedback, transform on hover)
- Modals & Drawers (smooth open/close, interruptible)
- Lists (item swipe states, delete confirm)

**Emil says:** "Buttons must feel responsive. Add `transform: scale(0.97)` on `:active`."

**Tu fais:** "Review this button component with Emil's eye — is the press feedback instant? Does it feel alive?"

---

### 2️⃣ **Animations & Micro-interactions**

Chaque mouvement dans l'app:
- Transaction toast appearing/disappearing
- Budget alert banner sliding in
- Form field focus transition
- Loading skeleton animation
- Swipe gesture feedback

**Emil says:** "Never animate from scale(0). Start from scale(0.95) + opacity: 0."

**Tu fais:** "@emil-design-eng Review the transaction save animation — does it feel natural?"

---

### 3️⃣ **Easing Curves & Timing**

Quand tu dois choisir comment bouger un élément:
- Dropdown opening: ease-out (responsive) vs ease-in (sluggish)?
- Modal entering: 200ms or 400ms?
- Button feedback: 100ms or 200ms?

**Emil says:** "Ease-out at 200ms feels faster than ease-in at 200ms, even same duration. Animation speed ≠ actual speed."

**Tu fais:** "Revise all animations with Emil — optimize for responsiveness."

---

### 4️⃣ **Component DX (Developer Experience)**

La qualité du code des composants:
- No hooks, no context bloat
- Good defaults out-of-the-box
- Edge cases handled invisibly (pause timer when tab hidden, etc.)
- Transitions not keyframes (for interruptible UI)

**Emil says:** "Developer experience is key. Less friction = more adoption."

**Tu fais:** "Review component structure — is it simple to use? Good defaults?"

---

### 5️⃣ **Accessible Interactivity**

- Touch targets (minimum 44px)
- Keyboard navigation (Tab through interactive elements)
- Color contrast (4.5:1 for body text)
- Reduced motion support (@media prefers-reduced-motion)

**Emil says:** "Accessibility is a feature, not an afterthought."

**Tu fais:** "@emil-design-eng Check reduced-motion implementation — is it graceful?"

---

## Emil's Workflow in Your Project

### For Every Component / Screen

```
1. BEFORE Claude Design codes:
   Describe the component behavior to Emil.
   
   Example: "Button on press should scale 0.97 and give instant feedback.
   Long press (2s) triggers delete confirmation."

2. DURING Claude Design work:
   "@emil-design-eng Review this button component"
   → Emil analyzes easing, timing, state transitions
   → Gives concrete CSS/animation improvements

3. AFTER Claude Design completes:
   Validate the component with Emil's criteria:
   □ Is press feedback instant (< 100ms)?
   □ Are hover states visible and consistent?
   □ Does the animation feel intentional?
   □ Are edge cases handled?
   □ Is it accessible (keyboard + reduced motion)?

4. DURING QA:
   "@emil-design-eng Review the full app in slow motion"
   → Catch timing issues invisible at full speed
   → Spot jarring transitions
   → Validate rhythm across all components
```

---

## Emil in Your MVP Timeline

- **Days 2-3 (Claude Design — Emil Phase):**
  Architecture of all 22 MVP screens.
  Which parts are button-like? Cards? Forms? Modals?
  Emil ensures each component category has bulletproof interaction model.

- **Days 4-5 (Claude Design — Apple Phase):**
  Polish & refinement (see Apple section below).

- **Days 8-30 (Claude Code):**
  Implement with Emil's feedback baked in.
  "@emil-design-eng Review component X" as you build.

---

# V. RÔLE D'APPLE DESIGN

## Qui est Apple?

Apple's design philosophy from WWDC talks (esp. *Designing Fluid Interfaces* 2018).

Translated for web: CSS, Pointer Events, springs (Motion / Framer Motion).

---

## Qu'apporte Apple à Swiftly.io?

**Apple specializes in:**
1. 🌊 **Fluid Motion** — interfaces that feel alive, respond like the physical world
2. 🎯 **Direct Manipulation** — 1:1 tracking, velocity inheritance, momentum
3. ⚡ **Interruptibility** — animations that can be grabbed mid-flight and reversed
4. 🌀 **Springs** — damping + response instead of fixed-duration tweens
5. 🎨 **Translucent Materials** — hierarchy via `backdrop-filter`, not solid blocks
6. 📐 **Spatial Consistency** — things appear where you expect, disappear the way they came
7. ✍️ **Typography** — optical sizing, tracking curves, leading that adapts

---

## Quand Utiliser Apple (MOMENTS CLÉ)

### 1️⃣ **Gesture-Driven Interactions**

Anything the user can touch/drag:
- Swipe to delete (left swipe closes transaction)
- Drawer open/close (swipe from left edge opens menu)
- Scroll momentum (list scrolls + stops naturally)
- Drag to reorder (budgets, projects)

**Apple says:** "Motion starts from current value, inherits velocity, can be grabbed and reversed instantly."

**Tu fais:** "Implement swipe-to-delete using spring with velocity handoff."

---

### 2️⃣ **Spring Animations**

For anything interactive (NOT static animations):
- Modal entering: use spring, not fixed keyframe
- Drawer sliding: spring that can be interrupted
- Button press: spring from pressed → released
- Loading indicator: smooth spring decay

**Apple says:** "Damping 1.0 (no bounce) for most UI. Reserve bounce only for momentum-driven gestures."

**Concrete values:**
```
Default UI (move, reposition):  damping 1.0, response 0.4
Drawer/sheet:                   damping 0.8, response 0.3
```

**Tu fais:** "@apple-design Implement the menu swipe with spring damping 0.8."

---

### 3️⃣ **Direct Manipulation Feedback**

When users drag something:
- It must stay glued to their finger (1:1 tracking)
- Respect where they grabbed it (not snap to center)
- Feedback continuous during drag (not only at end)
- Velocity preserved at release (seamless transition to animation)

**Apple says:** "Touch and content should move together."

**Tu fais:** "Implement transaction swipe-to-delete with proper grab offset + velocity."

---

### 4️⃣ **Translucent Materials & Depth**

Visual hierarchy via transparency + blur:
- Toolbar using `backdrop-filter: blur(20px)` + semi-transparent background
- Content scrolls underneath (not above)
- Material weight encodes hierarchy (darker = structural, lighter = interactive)
- Modals use scrim (dim + dim background)

**Apple says:** "Translucent materials bring structure without stealing focus."

**Tu fais:** "Make the toolbar (Dashboard top) translucent with content scrolling underneath."

---

### 5️⃣ **Typography & Optical Sizing**

Text that adapts by size:
- Tracking (letter-spacing) size-specific:
  - Large display: negative tracking (tighten)
  - Small body: positive tracking (open)
- Leading (line-height) size-inverse:
  - Tight on headings
  - Loose on body
- Weight for hierarchy (not size alone)

**Apple says:** "Tracking is size-specific — never one value for all sizes."

**Tu fais:** "Dashboard heading should use negative tracking, body normal."

---

### 6️⃣ **Reduced Motion Support**

For accessibility (& vestibular safety):
- `@media (prefers-reduced-motion: reduce)` → replace springs with fades
- Drop elastic/overshoot
- Keep opacity/color changes (aid comprehension)

**Apple says:** "Reduced motion doesn't mean no feedback — means gentler."

**Tu fais:** "@apple-design Implement prefers-reduced-motion — replace swipe animations with cross-fades."

---

### 7️⃣ **Rubber-banding at Boundaries**

When user drags past edge:
- Don't stop hard (feels frozen)
- Resist progressively (feels responsive but bounded)
- Damping increases further past boundary

**Apple says:** "Real things slow before they stop."

**Tu fais:** "Implement rubber-band effect for drawer over-swipe."

---

## Apple's Workflow in Your Project

### For Every Gesture / Motion / Material

```
1. BEFORE Claude Design codes:
   Describe the gesture/motion behavior.
   
   Example: "Swipe left on transaction card = delete.
   User should feel momentum handoff.
   If they swipe fast, the card should 'throw' off-screen."

2. DURING Claude Design work:
   "@apple-design Review the swipe-to-delete interaction"
   → Apple analyzes momentum projection, velocity handoff
   → Gives spring parameters + gesture thresholds

3. AFTER Claude Design completes:
   Validate with Apple's criteria:
   □ Is momentum preserved at gesture end?
   □ Can user grab mid-animation and reverse?
   □ Is there rubber-banding at boundaries?
   □ Does translucent material hierarchy work?
   □ Is typography tracking size-specific?

4. DURING QA:
   "@apple-design Test this on slow 3G connection"
   → Verify animations still feel fluid (springs vs. network latency)
   → Check prefers-reduced-motion rendering
```

---

## Apple in Your MVP Timeline

- **Days 4-5 (Claude Design — Apple Phase):**
  Takes the architectural work from Emil (days 2-3).
  Adds: gesture interactions, spring parameters, material design, typography.
  This is the "polish" phase.

- **Days 8-30 (Claude Code):**
  Implement with Apple's spring library (Motion or Framer Motion).
  "@apple-design Review the drawer swipe implementation" as you build.

---

# VI. QUAND UTILISER EMIL VS APPLE: DÉCISION MATRIX

## Quick Reference: Qui Faire Intervenir?

| Situation | Emil | Apple | Both? |
|-----------|------|-------|-------|
| Button press feedback | ✅ | ⬜ | Emil leads |
| Swipe gesture | ⬜ | ✅ | Apple leads |
| Modal animation | ✅ | ✅ | **BOTH** — Emil for component, Apple for spring |
| Form field focus | ✅ | ⬜ | Emil leads |
| Drawer open (swipe from edge) | ⬜ | ✅ | Apple leads (gesture + spring) |
| Translucent toolbar | ⬜ | ✅ | Apple leads |
| Dashboard typography | ⬜ | ✅ | Apple leads |
| Transaction list interactions | ✅ | ✅ | **BOTH** — Emil for card states, Apple for swipe |
| Loading skeleton animation | ✅ | ⬜ | Emil leads |
| Reduced motion support | ✅ | ✅ | **BOTH** — implement together |

---

## Decision Tree

**"I need to build/review [interaction]. Which skill do I use?"**

```
START
  ↓
Is it a gesture (touch/drag/swipe)?
├─ YES → Apple (gesture, momentum, spring)
└─ NO → Continue
    ↓
    Is it a component state (button press, form focus, card hover)?
    ├─ YES → Emil (interaction feedback, easing, polish)
    └─ NO → Continue
        ↓
        Is it visual material (translucent, blur, depth)?
        ├─ YES → Apple (materials, backdrop-filter, hierarchy)
        └─ NO → Continue
            ↓
            Is it typography or text styling?
            ├─ YES → Apple (tracking curves, leading, sizing)
            └─ NO → Neither (static content)
```

---

## Recommended Workflow: Each Component

For EVERY component/interaction in the 22 MVP screens:

```
Phase 1: ARCHITECTURE (Days 2-3)
└─ Emil's eye: "How should this component be built for great DX?"
   └─ Output: Component structure, interaction model

Phase 2: POLISH & MOTION (Days 4-5)
└─ Apple's eye: "How should this component FEEL?"
   └─ Output: Spring parameters, gesture handling, material decisions

Phase 3: IMPLEMENTATION (Days 8-30)
└─ Claude Code: Build with both baked in
   └─ "@emil-design-eng Review component X"
   └─ "@apple-design Test gesture Y"
```

---

# VII. STACK TECHNIQUE

## Frontend (MVP Web)

```
Framework:  Next.js 14+ (TypeScript)
Styling:    Tailwind CSS (utility-first)
UI Library: Radix UI or shadcn/ui (for accessible components)
Animations: Motion (formerly Framer Motion v6+)
  → For spring-based gestures + interruptible animations (Apple's requirement)
State:      React hooks + Context (small app, no Redux needed yet)
HTTP:       Axios or built-in fetch
```

---

## Backend (MVP)

```
Database:    Supabase (PostgreSQL)
Auth:        Supabase Auth (6-digit code MVP, not full OAuth)
API:         Node.js serverless functions (Vercel)
            OR Supabase Edge Functions
Real-time:   Supabase subscriptions (WebSocket) for live balance updates
Files:       Supabase Storage (profile pics, export PDFs)
```

---

## Deployment & Infrastructure

```
Hosting:     Vercel (Next.js native)
DNS:         Vercel (or custom domain)
Monitoring:  Sentry (error tracking)
Logging:     Vercel logs + custom Supabase audit
Performance: Vercel Analytics + Web Vitals
Testing:     Jest (unit) + Playwright (E2E)
```

---

## Design Tooling

```
Design:      Figma (22 screens designed there first)
Design QA:   Claude Design (Figma → React components)
```

---

# VIII. WORKFLOW DE TRAVAIL: 30 JOURS

## Overview

```
Days 0-2:   Setup + Design QA
Days 2-5:   Claude Design (Emil + Apple phases)
Days 6-8:   Handoff to Claude Code
Days 8-30:  Claude Code build + testing
Day 30:     LAUNCH (5-10 beta users)
```

---

## Day-by-Day Details

### Days 0-2: SETUP & DESIGN VALIDATION

**Elias:**
- Create Figma file with 22 screens (already partially done)
- Share screenshots of each screen with Claude

**Claude:**
- Fresh-eyes UX review of each screen
- Identify missing states (error, loading, empty)
- Validate business logic (before design polish)
- Document each screen with business logic + navigation

**Output:**
- Screen documentation (1 doc per screen)
- Identified gaps/improvements
- Design ready for Claude Design

---

### Days 2-5: CLAUDE DESIGN (Emil + Apple)

**Day 2-3: Emil Phase (Architecture)**
- Component structure
- Interaction models
- DX decisions

**Day 4-5: Apple Phase (Polish)**
- Gesture handling
- Spring parameters
- Material design
- Typography curves

**Output:**
- React component library (Tailwind + Motion)
- All 22 screens built as components
- Ready for Claude Code

---

### Days 6-8: HANDOFF PREP

- Bundle all components into Git repo
- Add storybook or Figma links
- Document component props
- Ready for Claude Code

---

### Days 8-30: CLAUDE CODE BUILD

**Claude Code:**
- Integrate components into Next.js app
- Connect to Supabase (auth, DB, real-time)
- Implement business logic
- Testing (unit + E2E)
- Deploy to Vercel staging

**Progress:**
- Day 8-10: Auth flow (Landing + Connexion Code)
- Day 11-15: Dashboard + Transaction flows
- Day 16-20: Stats + Reports + Budgets
- Day 21-25: Settings + Privacy + Edge cases
- Day 26-30: Testing + fixes + launch prep

---

### Day 30: LAUNCH

- Deploy to Vercel production
- Send invites to 5-10 beta users
- Monitor Sentry for errors
- Gather feedback

---

# IX. CONTRAINTES & PRINCIPES

## MVP Scope (STRICT)

What's IN:
- ✅ SwiftlyTrack only (other 4 branches menu-only)
- ✅ 22 screens web-first
- ✅ 6-digit code auth (NO full signup flow)
- ✅ Supabase free tier + Vercel free tier
- ✅ Basic design (no glassmorphism yet)
- ✅ Responsive (mobile-first)

What's OUT:
- ❌ React Native (phase 2)
- ❌ Glassmorphism (phase 2 post-launch)
- ❌ SwiftlyPay/Bank/Invest (phase 2+)
- ❌ OAuth/social login (future)
- ❌ Offline mode (MVP)
- ❌ Export to PDF (future)

---

## Design Principles

1. **Mobile-First:** Design for 375px width, scale up
2. **Clarity:** No confusion. Every screen should answer: Where am I? What can I do? How do I leave?
3. **Feedback:** Every action has feedback (toast, animation, state change)
4. **Consistency:** Same patterns everywhere (swipe = same gesture, buttons = same feel)
5. **Accessibility:** WCAG AA minimum (4.5:1 contrast, keyboard nav, reduced motion)
6. **Financial Trust:** No cute animations on critical actions (delete, transfer). Clear confirmations.

---

## Data Privacy (Critical)

- All transactions encrypted in Supabase
- No third-party tracking (analytics only anonymized)
- User consent banner (screens 19-20)
- Privacy settings (screen 21)
- Users can export their data (future)
- No selling data. Ever.

---

# X. GLOSSAIRE

| Term | Definition |
|------|-----------|
| **MVP** | Minimum Viable Product (22 screens MVP, SwiftTrack only, web MVP) |
| **SwiftTrack** | Personal finance tracking branch (dépenses/revenus/projets/rapports) |
| **Financial Freedom Score** | (Passive Income / Total Expenses) × 100 — the core metric |
| **Compte Principal** | Default account (cash on hand), created automatically for each user |
| **"Lié à"** | "Linked to" — link a transaction to a Personne or Projet |
| **Dépense** | Expense (spending, scored Investissement vs. Consommation) |
| **Revenu** | Revenue (income, scored Actif vs. Passif) |
| **Transfert** | Transfer (neutral cash move between accounts, no scoring) |
| **Template** | Recurring transaction pattern (salaire, loyer, abonnement) |
| **Budget** | Monthly spending limit by category (alerts if 92%+ exceeded) |
| **Projet** | Savings goal (maison, voiture, formation) |
| **Rapport** | Monthly/yearly financial report auto-generated |
| **Claude Design** | AI tool that converts Figma → React components (Emil + Apple skills) |
| **Claude Code** | AI tool that implements full app logic + testing |
| **Emil** | Design engineer skill (UI polish, interaction feedback, component DX) |
| **Apple** | Design philosophy skill (fluid motion, gestures, springs, materials) |
| **Spring** | Physics-based animation (damping + response, interruptible) |
| **Gesture** | User interaction via touch (swipe, drag, tap, long-press) |
| **Supabase** | Backend-as-a-service (PostgreSQL + Auth + Real-time) |

---

## End of Context Document

This document is your **single source of truth** for Swiftly.io MVP design & development.

Keep it open. Reference it every day.

**Next step:** See the **CARTE PRODUIT** (separate document) for the simple 24-screen table.

---

**Document created:** 25 août 2026  
**For:** Elias + Claude Design + Claude Code  
**Status:** FINAL
