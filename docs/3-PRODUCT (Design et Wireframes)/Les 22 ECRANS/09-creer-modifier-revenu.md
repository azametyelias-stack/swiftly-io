# 🖼️ SCREEN 9 — CRÉER/MODIFIER REVENU (Flux Multi-Étape)

**Statut:** À valider  
**Date:** 25 août 2026  
**Screenshots associés:** À fournir (structure identique à Dépense, catégories différentes)

---

## 1. Overview

- **Nom de l'écran:** Créer/Modifier Revenu
- **Objectif:** Enregistrer un nouveau revenu ou modifier un existant
- **Arrive de:** Bouton "+ Nouvelle transaction" (Dashboard), tap sur transaction existante, ou template
- **Va vers:** Écran de succès (Slide 4) puis retour à Historiques
- **Priorité MVP:** MUST HAVE
- **Complexité:** Complexe (4 slides, similaire à Dépense)

---

## 2. Architecture du flux

**Identique à Dépense:** Slide 1 → 2 → 3 → 4

Navigation, progression visuelle, boutons: IDENTIQUES à écran 08

---

## 3. SLIDE 1 — Date, Montant, Compte Destination

**Champs:**
1. **Date** (requis)
   - Dropdown: "Aujourd'hui" (défaut) / "Hier" / "Mettre une date"

2. **Montant** (requis)
   - Champ texte vide
   - Clavier numérique
   - Validation: montant > 0

3. **Compte destination** (requis)
   - Buttons: Cash, Mobile, Banque, "+ Nouveau"
   - Un seul compte
   - État sélectionné: bleu foncé

---

## 4. SLIDE 2 — Catégorie & "Lié à" (REQUIS)

**Champs:**
1. **Catégorie** (requis)
   - Dropdown: Salaire, Freelance, Investissement, Intérêts, Bonus, Cadeau, Autre
   - **IMPORTANT:** Pour Revenu, catégorie REQUIS (contrairement Dépense optionnel)

2. **"Lié à"** (REQUIS pour Revenu)
   - Deux toggles: Personnes ⊙ / Projet ○
   - Dropdown des Personnes OU des Projets selon toggle
   - **IMPORTANT:** Champ OBLIGATOIRE (source du revenu)
   - Exemples: "Salaire Entreprise A", "Client Freelance B", "Projet Maison"

---

## 5. SLIDE 3 — Notes & Récurrence

**Champs:**
1. **Notes** (optionnel)
   - Textarea: "Ajouter une note"
   - Max 500 caractères

2. **Récurrence** (optionnel)
   - Buttons: "Une Fois" (défaut) / "Quotidien" / "Mensuel"

3. **Statut** (optionnel)
   - Buttons: "Effectué" (défaut) / "Planifié" / "Reçu"

---

## 6. SLIDE 4 — Confirmation & Succès

**Affichage:**
- Message: "Votre revenu est enregistré avec succès ✓"
- Résumé: montant + catégorie + "Lié à" + date
- "Terminer" → retour à Historiques
- "Enregistrer comme Template" → confirmation

---

## 7. Logique métier

- Validation progressive (tous les champs requis avant "Suivant")
- Modifications: champs pré-remplis
- Création depuis template: montant + catégorie + "Lié à" pré-remplis
- Scorification automatique en Actif/Passif (règles backend)
- **CRITIQUE:** "Lié à" détermine le Financial Freedom Score (revenu passif = de Projet d'investissement, revenu actif = de Personne/salaire)

---

## 8. États

- **Chargement:** skeleton loaders
- **Erreur validation:** highlight rouge sur champ manquant
- **Succès:** toast "Revenu enregistré ✓"

---

## 9. Interactions

| Élément | Action | Destination |
|---------|--------|-------------|
| "+ Nouveau" compte | Modal création | Retour auto à Slide 1 |
| "Suivant >" | Valide slide | Slide suivante |
| "< Retour" | Précédent | Slide précédente |
| "Terminer" (Slide 4) | Enregistre | Historiques (06) |
| "Enregistrer comme Template" | Sauvegarde template | Dashboard (04) |

---

## 10. Base de données

Crée/modifie:
- transactions.type = "REVENU"
- transactions.amount
- transactions.category (requis)
- transactions.active_vs_passive (auto-calculé depuis "Lié à")
- transactions.linked_to (Personne OU Projet, requis)
- transactions.destination_account (requis)
- transactions.date
- transactions.notes
- transactions.recurrence
- transactions.status

---

## 11. Différences clés vs Dépense

1. **Catégories:** Revenu a ses propres catégories (Salaire, Freelance, etc.)
2. **"Lié à":** REQUIS pour Revenu (optionnel pour Dépense)
3. **Compte:** destination (où arrive l'argent) vs source (d'où sort l'argent)
4. **Scorification:** Actif/Passif vs Investissement/Consommation
5. **Montant:** affiché EN VERT (positif)

---

## 12. Points de clarification

- Quelle logique détermine Actif vs Passif? (URL du backend?)
- Peut-on avoir revenu sans "Lié à"? (Actuellement: NON, requis)
- Template de revenu: peut-on relancer avec même montant? (Oui, probablement)

---
