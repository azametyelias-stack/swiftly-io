# 🖼️ SCREEN 7 — TEMPLATES (LISTE COMPLÈTE)
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0719 (Templates, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Templates
- **Objectif** : Afficher, filtrer et gérer la liste complète des templates créés, avec accès à la création de nouveaux templates
- **Arrive de** : Dashboard (lien "Voir tout") / Menu de navigation
- **Va vers** : Création de template, Nouvelle transaction (tap/swipe sur un template), Modification template (long-press), Suppression (swipe droite)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré

---

## 2. Header

- Flèche retour (←)
- Titre "Templates"
- Icône "+" : raccourci pour créer un nouveau template (identique au bouton "+ Créer Template" en bas)

---

## 3. Contenu principal

**Empty state (aucun template)** — affiche un message encourageant :
- **Titre (grand)** : "Aucun template"
- **Sous-titre** : "Gagnez du temps — Créez des templates pour vos transactions récurrentes (loyer, salaire, transport) et enregistrez-les en un clic."
- **Bouton** : "+ Créer Template"

**Avec templates** — affiche la liste des templates créés

---

## 4. Dropdowns de contrôle

- **Dropdown "Tout"** (filtre par type) — sélectionne les templates à afficher :
  - **Tout** : affiche tous les templates (défaut)
  - **Dépense** : affiche uniquement les templates de type dépense
  - **Revenu** : affiche uniquement les templates de type revenu
- **Dropdown "Récent"** (filtre de tri/ordre) — détermine l'ordre d'affichage des templates :
  - **Plus récent** (défaut) : templates créés en dernier d'abord
  - **Plus utilisé** : templates lancés le plus souvent, en premier
  - **Alphabétique** : tri A→Z du nom du template
  - **Par montant** : du plus grand montant au plus petit
  - **Favoris** : templates marqués comme favoris en priorité (si favori-flag implémenté)

---

## 5. Liste des templates

Chaque template affiche :
- **Icône représentative** : visuelle uniquement, non cliquable (reflète le nom/catégorie du template)
- **Nom du template** : texte
- **Description/note** : brève description saisi à la création (ex. "Pour me rendre au travail")
- **Montant** : le montant pré-rempli
- **Type** : badge ou texte coloré indiquant "Dépense" (rouge) ou "Revenu" (vert)

---

## 6. Interactions sur un template

| Geste | Action | Détail |
|---|---|---|
| **Tap simple** | Lance la transaction | Ouvre le flux de nouvelle transaction pré-rempli avec les données du template ; l'utilisateur n'a qu'à confirmer |
| **Appui long (long-press)** | Affiche un menu d'options | Modifier / Supprimer / Ouvrir (= tap) |
| **Swipe gauche** | Ouvre la transaction | Même que tap simple — lance le flux de transaction |
| **Swipe droite** | Supprime le template | Suppression directe, probablement avec une confirmation pour éviter l'accident |

---

## 7. Bouton "+ Créer Template"

| Élément | Détail |
|---|---|
| Action | Navigue vers l'écran de création de template |
| Visible quand | Toujours |
| Raccourci | Icône "+" du header est équivalent (même action, deux accès) |

---

## 8. Database

- **Table `templates`** : user_id, name, description, amount, type (Dépense/Revenu), created_at, usage_count, is_favorite (optionnel, pour le filtre "Favoris")
- Les templates créés à la volée depuis une transaction (option "sauvegarder comme template") apparaissent ici aussi — même système

---

## 9. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé (pas de banneau visible sur cet écran, juste le fond en arrière-plan)
- Icônes templates : design laissé à Claude Design

---

## 10. Points de clarification restants

- Confirmation de suppression (swipe droite) : afficher une confirmation avant de supprimer, ou suppression directe ? (recommandé : confirmation)
- Icône "Favoris" : implémentation complète du système (marquer/démarquer) à définir si incluse dans le MVP

---

## 11. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
