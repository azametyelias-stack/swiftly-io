# 🖼️ SCREEN 9 — PROJETS
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0717 (Projets, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Projets
- **Objectif** : Afficher et gérer la liste des projets (construction, acquisition, investissement, etc.) avec suivi optionnel du budget
- **Arrive de** : Menu de navigation
- **Va vers** : Création de projet, Détails du projet (tap), Modification/Suppression (long-press)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré

---

## 2. Header

- Flèche retour (←)
- Titre "Projets"
- Icône "+" : raccourci pour ajouter un projet (identique au bouton "+ Ajouter un projet" en bas)

---

## 3. Contenu principal

**Empty state (aucun projet)** — affiche un message encourageant pour inciter l'utilisateur à ajouter ses projets existants :
- **Titre** (grand) : "Aucun projet"
- **Message** (sous-titre) : "Suivez vos projets en cours — Maison, voiture, formation... si vous avez un projet déjà lancé, ajoutez-le ici et suivez votre budget et votre progression."
- Le bouton "+ Ajouter un projet" reste visible et cliquable

**Avec projets** — affiche la liste des projets créés

---

## 4. Dropdown de contrôle

- **Dropdown "Récent"** (filtre de tri/ordre) — détermine l'ordre d'affichage des projets (identique à Templates et Budgets) :
  - **Plus récent** (défaut) : projets créés en dernier d'abord
  - **Plus utilisé** : projets ayant le plus de transactions liées, en premier
  - **Alphabétique** : tri A→Z du nom du projet
  - **Par montant** : du projet avec le budget le plus élevé au plus faible (si budget défini)
  - **Favoris** : projets marqués comme favoris en priorité (si favori-flag implémenté)

---

## 5. Liste des projets

Chaque projet affiche :
- **Icône représentative** : visuelle uniquement, non cliquable (reflète la catégorie du projet)
- **Nom du projet** : texte
- **Barre de progression** (conditionnelle) : **visible uniquement si l'utilisateur a rempli un budget/montant cible** lors de la création
  - Pourcentage : montant total dépensé / budget cible × 100
  - Couleur : vert (0-50%), orange (51-91%), rouge (92%+)
- **Montants** (conditionnels) : "7 500 000 / 10 000 000 FCFA" — affiché seulement si budget cible rempli ; sinon, juste le montant dépensé s'affiche
- **Description** : courte description du projet (ex. "2 chambres salon pour la location à Avédjé")

---

## 6. Interactions sur un projet

| Geste | Action | Détail |
|---|---|---|
| **Tap simple** | Affiche les détails | Ouvre l'écran de détails du projet (à créer par Claude Design — voir section 8) |
| **Appui long (long-press)** | Affiche un menu d'options | Modifier / Supprimer |

---

## 7. Bouton "+ Ajouter un projet"

| Élément | Détail |
|---|---|
| Action | Navigue vers l'écran de création/ajout de projet |
| Visible quand | Toujours |
| Libellé | "+ Ajouter un projet" (et non "Créer") — pour clarifier qu'on ajoute un projet existant, pas qu'on en invente un nouveau |
| Raccourci | Icône "+" du header est équivalent (même action, deux accès) |

---

## 8. Écran d'ajout/création de projet (à créer par Claude Design)

**Champs requis :**
1. **Nom du projet** (ex. "Maison", "Voiture", "Formation") — champ texte requis
2. **Description** (ex. "2 chambres salon pour location à Avédjé") — champ texte requis
3. **Catégorie** (dropdown requis) — pour la traçabilité et la connaissance utilisateur. Options :
   - Construction / Rénovation
   - Acquisition (maison, voiture, équipement)
   - Investissement (immobilier, commerce, stocks)
   - Formation / Éducation
   - Santé / Médical
   - Voyage / Vacances
   - Mariage / Événements
   - Création d'entreprise / Projet professionnel
   - Équipement / Matériel (outils, électronique)
   - Loisirs / Divertissement
   - Épargne / Fonds d'urgence
   - **Autre** (catch-all pour les projets non classés)

**Champs optionnels :**
4. **Budget / Montant cible** — montant prévu pour le projet ; si rempli, une barre de progression s'affiche sur la fiche du projet (voir section 5) ; si vide, aucune barre, juste suivi des dépenses sans limite
5. **Date de début** — quand le projet a commencé ou est planifié
6. **Date de fin prévisionnelle** — quand le projet devrait être terminé
7. **Statut** (dropdown, défaut = "Actif") — Actif / Achevé / En attente / Suspendu — pour distinguer les projets en cours des terminés
8. **Compte associé** (dropdown) — si le projet dépense/reçoit via un compte spécifique (sinon : tous les comptes)

---

## 9. Écran de détails du projet (à créer par Claude Design)

Structure non encore définie. Suggestions :
- Afficher les informations du projet (nom, description, catégorie, dates, statut, budget, montant dépensé, progression)
- Historique des transactions liées à ce projet
- Possibilité d'éditer le projet depuis cet écran
- Bouton pour marquer le projet comme achevé/suspendu

---

## 10. Database

- **Table `projects`** : user_id, name, description, category, budget (nullable), start_date, end_date, status, account_id (nullable), created_at, is_favorite (optionnel)
- **Calcul du montant dépensé** : somme des transactions marquées "Lié à" ce projet
- **Calcul de la barre de progression** : montant dépensé / budget × 100 (si budget ≠ null)

---

## 11. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes projets (par catégorie) : design laissé à Claude Design

---

## 12. Points de clarification restants

- Écran de détails complet : structure et contenu à affiner
- Peut-on lier un projet à plusieurs comptes, ou un seul ? (MVP : un seul)
- Confirmation de suppression : afficher une confirmation avant de supprimer, ou suppression directe ?

---

## 13. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
