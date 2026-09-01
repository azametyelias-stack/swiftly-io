# 🖼️ SCREEN 8 — BUDGETS
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0718 (Budgets, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Budgets
- **Objectif** : Afficher et gérer les budgets par catégorie, avec visualisation de l'avancement et des alertes
- **Arrive de** : Menu de navigation
- **Va vers** : Création de budget, Détails du budget (tap), Modification/Suppression (long-press)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré

---

## 2. Header

- Flèche retour (←)
- Titre "Budgets"
- Icône "+" : raccourci pour créer un nouveau budget (identique au bouton "+ Créer Budget" en bas)

---

## 3. Contenu principal

**Empty state (aucun budget)** — affiche un message encourageant pour inciter l'utilisateur à créer des budgets :
- **Titre (grand)** : "Aucun budget"
- **Sous-titre** : "Maîtrisez vos dépenses — Créez des budgets par catégorie pour suivre et contrôler vos limites de dépenses, et recevez des alertes si vous dépassez."
- **Bouton** : "+ Créer Budget"

**Avec budgets** — affiche la liste des budgets créés

---

## 4. Dropdown de contrôle

- **Dropdown "Récent"** (filtre de tri/ordre) — détermine l'ordre d'affichage des budgets (identique à Templates) :
  - **Plus récent** (défaut) : budgets créés en dernier d'abord
  - **Plus utilisé** : budgets dont les catégories ont le plus de transactions, en premier
  - **Alphabétique** : tri A→Z du nom de la catégorie
  - **Par montant** : du budget le plus élevé au plus faible
  - **Favoris** : budgets marqués comme favoris en priorité (si favori-flag implémenté)

---

## 5. Liste des budgets

Chaque budget affiche :
- **Icône représentative** : visuelle uniquement, non cliquable (reflète la catégorie)
- **Nom de la catégorie** : texte
- **Barre de progression** : visualise le ratio Dépensé / Budget alloué
  - **Couleur de la barre** : 
    - Vert : 0-50% du budget utilisé
    - Orange : 51-91% du budget utilisé
    - Rouge : 92%+ du budget utilisé ou dépassé
- **Pourcentage** : affiche le ratio exact (ex. 75%)
- **Montants** : "75 000 / 100 000 FCFA" (dépensé / budget alloué)

---

## 6. Interactions sur un budget

| Geste | Action | Détail |
|---|---|---|
| **Tap simple** | Affiche les détails | Ouvre l'écran de détails du budget (à définir par Claude Design) |
| **Appui long (long-press)** | Affiche un menu d'options | Modifier / Supprimer |

---

## 7. Alertes de dépassement (92%+)

Quand un budget atteint ou dépasse **92% du montant alloué** :
- **Dashboard** : le budget apparaît dans le bandeau d'alertes (rotatif) s'il n'a pas été lu
- **Notifications** : visible dans la page notifications (bell icon)
- **Push système** : notification push envoyée à l'utilisateur

---

## 8. Bouton "+ Créer Budget"

| Élément | Détail |
|---|---|
| Action | Navigue vers l'écran de création de budget |
| Visible quand | Toujours |
| Raccourci | Icône "+" du header est équivalent (même action, deux accès) |

---

## 9. Database

- **Table `budgets`** : user_id, category_id, name, allocated_amount, created_at, is_favorite (optionnel)
- **Calcul du pourcentage** : somme des transactions de la catégorie pour la période courante (mois) / allocated_amount × 100
- Budgets sans transactions : 0% affiché

---

## 10. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes budgets : design laissé à Claude Design

---

## 11. Points de clarification restants

- Écran de détails du budget : structure à détailler (historique des dépenses par date ? comparaison avec les mois précédents ?)
- Confirmation de suppression : afficher une confirmation avant de supprimer, ou suppression directe ?
- Budgets mensuels uniquement, ou également trimestriels/annuels ? (MVP : mensuels)

---

## 12. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
