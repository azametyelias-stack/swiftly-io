# 🖼️ SCREEN 17 — GESTION DES COMPTES
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 22 juillet 2026
**Screenshots associés** : N/A (écran à créer par Claude Design)

---

## 1. Overview

- **Nom de l'écran** : Gestion des comptes
- **Objectif** : Vue centralisée de tous les comptes et cartes de l'utilisateur, avec accès aux détails, historique et gestion
- **Arrive de** : Menu de navigation / Dashboard (bouton "+ Ajouter un compte")
- **Va vers** : Page de détails du compte (tap), Historique filtré du compte (clic "Voir les historiques"), Création/Modification de compte (formulaire modal)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré-Complexe

---

## 2. Header

- Flèche retour (←)
- Titre "Gestion des comptes"
- Icône "+" : raccourci pour créer un nouveau compte (ouvre le formulaire modal)

---

## 3. Empty state (aucun compte)

Affiché quand l'utilisateur n'a pas encore créé de comptes :
- **Titre (grand)** : "Aucun compte"
- **Sous-titre** : "Centralisez vos comptes — Cash, Mobile, Bancaire, Carte... ajoutez tous vos comptes et cartes pour suivre chaque mouvement d'argent en un seul endroit."
- **Bouton** : "+ Ajouter un compte" (grand, noir)

---

## 4. Dropdown de contrôle (avec comptes)

Quand des comptes existent :
- **Dropdown "Récent"** (tri) — détermine l'ordre d'affichage :
  - **Plus récent** (défaut) : comptes créés en dernier d'abord
  - **Par type** : Cash, Mobile, Bancaire, Carte
  - **Par solde** : du plus grand au plus petit
  - **Par favori** : comptes marqués "favori" en priorité

---

## 5. Liste des comptes (sous forme de cartes)

Chaque compte s'affiche comme une **carte complète** avec :

- **Icône** (représentative du type : Cash, Mobile, Banque, Carte)
- **Nom du compte** : texte en gras (ex. "Mon portefeuille Wave", "BIM Banque")
- **Type** : texte discret (ex. "Mobile", "Bancaire")
- **Solde** : montant en gros (ex. "50 000 FCFA")
- **Frais mensuels** : affichés sous le solde si applicable (ex. "-800 FCFA/mois" ou "0.5%/mois")
- **Bouton "Voir les historiques"** : collé au bas de la carte (pas détaché), texte bleu cliquable

---

## 6. Interactions sur une carte de compte

| Geste | Action | Détail |
|---|---|---|
| **Tap simple (n'importe où sur la carte)** | Ouvre la page de détails | Page complète affichant toutes les infos + boutons d'action |
| **Clic sur "Voir les historiques"** | Ouvre l'Historique filtré | Page Historiques standard, mais limitée à ce compte uniquement ; filtres restreints à ce compte ; retour via flèche = revient à Gestion des comptes |
| **Appui long (long-press)** | Affiche un menu d'options | Modifier / Supprimer |
| **Swipe droite** | Ouvre les détails | Même que tap simple |
| **Swipe gauche** | Supprime le compte | Confirmation avant suppression (modal : "Êtes-vous sûr de vouloir supprimer ce compte ?" avec Oui/Non) |

---

## 7. Formulaire "Créer/Modifier un compte" (modal ou full-screen)

S'ouvre quand l'utilisateur clique :
- Icône "+" (header)
- Bouton "+ Ajouter un compte" (empty state)
- Bouton "Modifier" (page de détails)
- "+ Nouveau" depuis Slide 2 du flux de transaction

**Champs du formulaire :**

**Requis :**
1. **Nom du compte** (texte) — ex. "Cash personnel", "Wave"
2. **Type de compte** (dropdown) — Cash / Mobile / Bancaire / Carte
3. **Solde initial** (numérique) — ex. "50 000 FCFA"

**Conditionnels selon le type :**
- **Si "Mobile"** : Fournisseur (dropdown) — Wave, Orange Money, Moov Money, etc.
- **Si "Bancaire"** : Numéro de compte (optionnel pour MVP)
- **Si "Carte"** : Réseau (dropdown) — Visa, Mastercard, AmEx, Autre

**Optionnel (Bancaire & Carte uniquement) :**
4. **Frais mensuels** :
   - Dropdown : "Montant fixe" OU "Pourcentage"
   - Champ numérique : la valeur (ex. "800 FCFA" ou "0.5%")
   - À chaque fin de mois : prélèvement automatique appliqué au solde courant + transaction "Frais bancaires" créée dans l'Historique (type Dépense, catégorie "Frais bancaires", statut "Effectué")

**Optionnel (tous types) :**
5. **Devise** (dropdown) — FCFA (défaut), USD, EUR, etc.
6. **Notes** (textarea) — ex. "Compte épargne familiale"

**Boutons du formulaire :**
- "Annuler" : ferme le formulaire sans créer
- "Confirmer" :
  - **Création** : crée le compte → toast "Compte créé ✓" → retour à Gestion des comptes + compte s'ajoute à la liste et s'affiche
  - **Modification** : met à jour le compte → toast "Compte modifié ✓" → retour à la page de détails

---

## 8. Page de détails du compte (page complète)

S'ouvre en tapant sur une carte. Affiche :

**En haut :**
- Flèche retour (←)
- Titre (optionnel ou nom du compte)

**Contenu principal :**
- **Carte du compte** (réplique de celle de la liste, plus contexte)
  - Icône, nom, type, solde, frais mensuels
  - Plus d'infos si applicable (ex. pour Mobile : fournisseur ; pour Banque : numéro de compte)
  - Plus d'infos si applicable (ex. pour Carte : réseau de la carte)
- **Devise** (si différente de FCFA)
- **Notes** (si renseignées)
- **Statut du compte** : Actif / Archivé (si applicable)

**Boutons en bas (horizontaux) :**
- **Modifier** : ouvre le formulaire pré-rempli avec les données actuelles
- **Supprimer** : demande confirmation avant suppression
- **Archiver** : marque le compte comme archivé (optionnel pour le MVP, peut être désactivé)
- **Définir comme favori** : marque le compte comme favori (icône cœur/épingle)

**Historique du compte (optionnel, peut être une section à la fin) :**
- Affiche les 10 dernières transactions de ce compte
- Bouton "Voir plus" → navigue vers l'Historique filtré complet

---

## 9. Historique filtré du compte

Quand l'utilisateur clique "Voir les historiques" depuis une carte :

- **Destination** : page Historiques standard (voir SCREEN-10-HISTORIQUES.md)
- **Filtre appliqué** : affiche UNIQUEMENT les transactions de ce compte
- **Dropdowns restreints** : 
  - "Tout" : filtre par type de transaction (Dépense/Revenu/Transfert)
  - "Récent" : tri (Plus récent, etc.) — pas de navigation temporelle
- **Flèche retour** : revient à Gestion des comptes (pas au Dashboard)

---

## 10. Database

- **Table `accounts`** : user_id, name, type (Cash/Mobile/Bancaire/Carte), balance, initial_balance, currency, monthly_fees (nullable), fee_type (fixed/percentage), provider (pour Mobile), is_favorite, is_archived, created_at, updated_at, notes
- **Table `account_transactions`** : relation entre accounts et transactions
- **Calcul montant dépensé** : somme des transactions du compte
- **Calcul solde courant** : balance − somme des frais mensuels appliqués

---

## 11. Cohérence visuelle et structurelle (CRITIQUE)

**⚠️ IMPORTANT POUR CLAUDE DESIGN :**
Cet écran doit suivre **EXACTEMENT** le même style visuel que tous les autres écrans de l'application montré dans les screenshots Figma d'Elias.

**Éléments à respecter scrupuleusement :**
- **Fond partagé** : voir `DESIGN-GLOBAL.md` (asset navy partagé, même traitement)
- **Palette de couleurs** : identique aux autres écrans
- **Typographie** : SF Pro (ou équivalent), même hiérarchie que Dashboard/Projets/Budgets
- **Cartes de comptes** : design unifié, cohérent avec les autres listes (Templates, Budgets, etc.)
- **Interactions** : tap, long-press, swipe — patterns identiques à travers l'app
- **Dropdowns, boutons** : design système unifié
- **Empty state** : style identique aux autres pages (Projets, Budgets, etc.)

---

## 12. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes comptes (Cash, Mobile, Bancaire, Carte) : design laissé à Claude Design

---

## 13. Points de clarification restants

- Archivage des comptes : faut-il une section "Comptes archivés" séparée, ou juste une visibilité en détails ?
- Limite de comptes : MVP peut-il en créer autant que voulu, ou y a-t-il une limite ?
- Suppression d'un compte : que fait-on des transactions associées ? (recommandé : soft delete, transactions restent avec compte marqué "supprimé")

---

## 14. Validation

- Elias : ✅
- Claude : ✅ (compilé 22 juillet 2026)
