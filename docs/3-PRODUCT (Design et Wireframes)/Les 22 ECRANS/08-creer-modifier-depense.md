# 🖼️ SCREEN 8 — CRÉER/MODIFIER DÉPENSE (Flux Multi-Étape)

**Statut:** À valider  
**Date:** 25 août 2026  
**Screenshots associés:** 08-creer-modifier-depense_Slide_1.png à Slide_4.png  

---

## 1. Overview

- **Nom de l'écran:** Créer/Modifier Dépense
- **Objectif:** Guider l'utilisateur à travers un formulaire multi-étape pour enregistrer une nouvelle dépense ou modifier une existante
- **Arrive de:** Bouton "+ Nouvelle transaction" (Dashboard), tap sur transaction existante (modification), ou lancement depuis template
- **Va vers:** Écran de succès (Slide 4) puis retour à Historiques
- **Priorité MVP:** MUST HAVE — critique
- **Complexité:** Complexe (4 slides, validation progressive)

---

## 2. Architecture du flux

**Flux linéaire:** Slide 1 → 2 → 3 → 4

**Navigation:**
- "< Retour": revient à slide précédente
- "Suivant >": valide et va à slide suivante
- Slide 4 remplace "Suivant" par "Terminer"

**Progression visuelle:** Points indicateurs au bas montrent position (— • — — pour slide 2)

---

## 3. SLIDE 1 — Date, Montant, Compte Source

**Champs:**
1. **Date** (requis)
   - Dropdown: "Aujourd'hui" (défaut) / "Hier" / "Mettre une date"
   - Sélection date via calendar picker

2. **Montant** (requis)
   - Champ texte vide au départ
   - Clavier numérique
   - Validation: montant > 0

3. **Compte source** (requis)
   - Buttons multi-sélection: Cash, Mobile, Banque, "+ Nouveau"
   - Un seul compte à la fois (sélection unique)
   - État sélectionné: bleu foncé
   - "+ Nouveau" ouvre modal création compte

---

## 4. SLIDE 2 — Catégorie & "Lié à"

**Champs:**
1. **Catégorie** (requis)
   - Dropdown: Alimentation, Transport, Loisirs, Logement, Santé, Éducation, etc.
   - Affiche les options principales + "Autre"

2. **"Lié à"** (optionnel)
   - Deux toggles: Personnes ⊙ / Projet ○
   - Sélection: dropdown des Personnes OU dropdown des Projets selon toggle
   - "Lié à: Moi" par défaut (pas lié)

---

## 5. SLIDE 3 — Notes & Récurrence

**Champs:**
1. **Notes** (optionnel)
   - Textarea: "Ajouter une note"
   - Max 500 caractères

2. **Récurrence** (optionnel)
   - Buttons: "Une Fois" (défaut) / "Quotidien" / "Mensuel"
   - Visible seulement si modification d'une transaction existante

3. **Statut** (optionnel, visible en modification)
   - Buttons: "Effectué" (défaut) / "Planifié" / "Remboursé"

---

## 6. SLIDE 4 — Confirmation & Succès

**Affichage:**
- Message: "Votre dépense est enregistrée avec succès ✓"
- Résumé: montant + catégorie + date
- Deux options:
  - "Terminer" → retour à Historiques
  - "Enregistrer comme Template" → ouvre confirmation

---

## 7. Logique métier

- Validation progressive (chaque slide vérifie ses champs requis avant "Suivant")
- Modifications d'une transaction existante: les champs pré-remplis
- Création depuis template: montant + catégorie pré-remplis, reste vide
- Toast "Dépense enregistrée ✓" apparaît après "Terminer"
- Scorification automatique en Investissement/Consommation (règles backend)

---

## 8. États

- **Chargement:** skeleton loaders, boutons désactivés
- **Erreur validation:** highlight rouge sur champ invalide
- **Succès:** toast de confirmation

---

## 9. Interactions

| Élément | Action | Destination |
|---------|--------|-------------|
| "+ Nouveau" compte | Modal création | Retour auto à Slide 1 |
| "Suivant >" | Valide slide actuelle | Slide suivante |
| "< Retour" | Revient à slide précédente | Slide précédente |
| "Terminer" (Slide 4) | Enregistre + ferme | Historiques (06) |
| "Enregistrer comme Template" | Sauvegarde comme template | Dashboard (04) |

---

## 10. Base de données

Crée/modifie:
- transactions.type = "DÉPENSE"
- transactions.amount
- transactions.category
- transactions.investment_vs_consumption (auto-calculé)
- transactions.linked_to (Personne OU Projet)
- transactions.source_account
- transactions.date
- transactions.notes
- transactions.recurrence (optionnel)
- transactions.status (optionnel)

---

## 11. Points de clarification

- Clavier numérique avec locale française (séparateur décimal = virgule?)
- Emoji categorie avant label ou après?
- Animation entre slides: slide-out/slide-in (Apple spring)?

---
