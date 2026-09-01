# 🖼️ SCREEN 7 — DÉTAILS TRANSACTION

**Statut:** À valider  
**Date:** 25 août 2026  
**Screenshot associé:** À fournir par Elias  

---

## 1. Overview

- **Nom de l'écran:** Détails Transaction
- **Objectif:** Afficher les détails complets d'une transaction (Dépense, Revenu ou Transfert) et permettre la modification
- **Arrive de:** Tap sur une transaction dans Historiques (06)
- **Va vers:** Retour à Historiques (06) après fermeture ou modification
- **Priorité MVP:** MUST HAVE
- **Complexité:** Moyen

---

## 2. Contenu affiché

**Informations générales:**
- Montant (gros, centré)
- Type transaction (Dépense/Revenu/Transfert)
- Catégorie (Investissement/Consommation pour Dépense; Actif/Passif pour Revenu; N/A pour Transfert)
- "Lié à" (Personne ou Projet si applicable)
- Compte source/destination
- Date & heure exacte
- Notes (si existantes)

---

## 3. Logique métier

- Lecture seule par défaut (affichage uniquement)
- Bouton "Modifier" permet d'éditer la transaction
- Bouton "Supprimer" avec confirmation modale
- Affichage du montant en vert (revenu) ou rouge (dépense) selon le type

---

## 4. Interactions

**Boutons/Actions:**
| Élément | Action | Cible |
|---------|--------|-------|
| "Modifier" | Ouvre le formulaire multi-étape (08, 09, ou 10) | 08/09/10 |
| "Supprimer" | Affiche confirmation modale | Modal "Êtes-vous sûr?" |
| "< Retour" | Ferme et revient à liste | 06 |

**États:**
- Chargement: skeleton loaders
- Erreur: "Impossible de charger la transaction"
- Succès: détails affichés

---

## 5. Base de données

Récupère:
- transactions.id
- transactions.type
- transactions.amount
- transactions.category
- transactions.linked_to (Personne/Projet)
- transactions.source_account
- transactions.destination_account (si Transfert)
- transactions.date
- transactions.notes
- transactions.created_at

---

## 6. Points de clarification

- Design: couleurs par type, typographie claire
- Animations: transition douce au swipe (Apple)
- État édition: qui gère la validation côté client?

---
