# 🖼️ SCREEN 10 — HISTORIQUES (LISTE COMPLÈTE)
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0716 (Historiques, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Historiques
- **Objectif** : Afficher l'historique complet de toutes les transactions, groupées par période (jour, semaine, mois, année), avec filtrage et tri
- **Arrive de** : Dashboard (lien "Voir plus") / Menu de navigation
- **Va vers** : Détails de la transaction (tap), Modification (tap + bouton "Modifier"), Nouvelle transaction (icône "+" header), Suppression (swipe gauche + confirmation)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré

---

## 2. Header

- Flèche retour (←)
- Titre "Historiques"
- Icône "+" : raccourci pour créer une nouvelle transaction

---

## 3. Contenu principal

**Empty state (aucune transaction)** — affiche un message encourageant :
- **Titre (grand)** : "Aucune transaction"
- **Sous-titre** : "Commencez à tracker — Enregistrez vos dépenses, revenus, et transferts pour visualiser où va votre argent et progresser vers l'indépendance financière."
- Bouton "+ Nouvelle transaction" visible pour enregistrer la première

**Avec transactions** — affiche l'historique complet groupé par période (voir section 4 ci-dessous)

---

## 4. Dropdowns de contrôle

- **Dropdown "Tout"** (filtre par type) — sélectionne le type de transactions à afficher :
  - **Tout** (défaut) : affiche toutes les transactions (dépenses, revenus, transferts)
  - **Dépense** : affiche uniquement les dépenses
  - **Revenu** : affiche uniquement les revenus
  - **Transfert** : affiche uniquement les transferts

- **Dropdown "Récent"** (tri + navigation temporelle) — combine le tri et la navigation dans le temps :
  - **Plus récent** (défaut) : affiche les transactions les plus récentes d'abord (période actuelle)
  - **Plus utilisé** : transactions par catégorie/type les plus fréquentes
  - **Alphabétique** : tri A→Z par catégorie/nom
  - **Par montant** : du plus grand montant au plus petit
  - **Sélecteur de période** : permet de naviguer dans le temps pour voir les transactions d'autres périodes (mois/années antérieures)

---

## 5. Groupement par période

Les transactions sont **groupées par jour/période** :
- **"Aujourd'hui"** : transactions du jour courant
- **"Hier"** : transactions de la veille
- **"Cette semaine"** / **"Semaine dernière"** : selon le contexte
- **"Ce mois"** / **"Mois dernier"** : selon le contexte
- **Années antérieures** : si l'utilisateur navigue via le dropdown de période

---

## 6. Liste des transactions

Chaque transaction affiche :
- **Icône directionnelle** : flèche bas-gauche (dépense) ou haut-droite (revenu), ou symbole neutre pour transfert
- **Catégorie** : texte
- **Date et heure** : "Aujourd'hui, 9h 37min"
- **Note/Description** : brève description saisie à la création (ex. "Spaghetti rouge")
- **"Lié à"** (si applicable) : affiche la personne/projet/source associée (voir SCREEN-04-DASHBOARD.md section "Historique récent" pour la logique de troncature)
- **Montant** : aligné à droite
- **Type** : badge coloré indiquant "Dépense" (rouge), "Revenu" (vert), ou "Transfert" (neutre)

---

## 7. Interactions sur une transaction

| Geste | Action | Détail |
|---|---|---|
| **Tap simple** | Affiche les détails | Ouvre une page de détails complète avec un bouton "Modifier" |
| **Appui long (long-press)** | Affiche un menu d'options | Modifier / Supprimer (même que les autres écrans) |
| **Swipe droite** | Ouvre la transaction | Affiche la page de détails (même que tap) |
| **Swipe gauche** | Supprime la transaction | Suppression avec confirmation avant d'appliquer (modal ou toast demandant "Êtes-vous sûr de vouloir supprimer cette transaction ?" avec boutons Oui/Non) |

---

## 7. Écran de détails de la transaction (à créer par Claude Design)

**À afficher :**
- Toutes les informations de la transaction (catégorie, date/heure, compte, montant, type, statut, récurrence, "Lié à", note, etc.)
- **Bouton "Modifier"** : permet de modifier la transaction ; probablement redirige vers un formulaire pré-rempli identique à celui de création

**Interactions :**
- Bouton Modifier
- Option Supprimer (probablement via long-press ou menu 3 points)

---

## 8. Database

- **Table `transactions`** : utilisateur, compte, catégorie, type (Dépense/Revenu/Transfert), montant, description, date, heure, statut, récurrence, "lié à" (personne/projet/source), créée le, modifiée le
- **Regroupement par période** : grouper par date du jour/semaine/mois selon le contexte
- **Tri** : appliquer selon le choix du dropdown

---

## 9. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes directionnelles (flèches) : design laissé à Claude Design

---

## 10. Points de clarification restants

- Pagination ou scroll infini pour l'historique très long ? (recommandé : scroll infini avec lazy loading)
- Historique supprimé : récupérable ou suppression définitive ? (MVP : suppression définitive)

---

## 11. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
