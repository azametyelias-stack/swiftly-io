# 🖼️ SCREEN 10 — CRÉER/MODIFIER TRANSFERT (Flux Multi-Étape)

**Statut:** À valider  
**Date:** 25 août 2026  
**Screenshots associés:** À fournir (structure plus simple, 3 slides)

---

## 1. Overview

- **Nom de l'écran:** Créer/Modifier Transfert
- **Objectif:** Enregistrer un mouvement d'argent neutre entre deux comptes (pas de scoring)
- **Arrive de:** Bouton "+ Nouvelle transaction" (Dashboard)
- **Va vers:** Écran de succès (Slide 3) puis retour à Historiques
- **Priorité MVP:** MUST HAVE
- **Complexité:** Moyen (3 slides, logique plus simple que Dépense/Revenu)

---

## 2. Architecture du flux

**Flux linéaire (plus court):** Slide 1 → 2 → 3

**Différence clé vs Dépense/Revenu:**
- Aucune catégorie (Transfert est neutre)
- Aucune logique de scoring
- Compte source ≠ Compte destination (validation côté client)

---

## 3. SLIDE 1 — Date, Montant, Compte Source

**Champs:**
1. **Date** (requis)
   - Dropdown: "Aujourd'hui" (défaut) / "Hier" / "Mettre une date"

2. **Montant** (requis)
   - Champ texte vide
   - Clavier numérique
   - Validation: montant > 0

3. **Compte source** (requis)
   - Buttons: Cash, Mobile, Banque, "+ Nouveau"
   - Un seul compte
   - État sélectionné: bleu foncé

---

## 4. SLIDE 2 — Compte Destination

**Champs:**
1. **Compte destination** (requis)
   - Dropdown affichant **tous les autres comptes** (exclure compte source)
   - Sélection unique
   - Validation: compte destination ≠ compte source

**Validation:**
- Si utilisateur tente de sélectionner le même compte: tooltip "Sélectionnez un compte différent"
- Boutton "Suivant" désactivé jusqu'à sélection valide

---

## 5. SLIDE 3 — Notes & Succès

**Champs:**
1. **Notes** (optionnel)
   - Textarea: "Ajouter une note"
   - Max 500 caractères

**Affichage après save:**
- Message: "Votre transfert est enregistré avec succès ✓"
- Résumé: montant + compte source → compte destination + date
- Bouton "Terminer" → retour à Historiques

---

## 6. Logique métier

- **Aucune catégorie:** Transfert est neutre (pas de Investissement/Consommation, pas d'Actif/Passif)
- **Aucun "Lié à":** Transfert est mouvement interne
- **Validation compte:** source ≠ destination
- **Pas de scoring:** Financial Freedom Score n'est PAS affecté par les transferts
- Exemple: move 10K de Cash vers Épargne = neutre pour le score

---

## 7. États

- **Chargement:** skeleton loaders
- **Erreur validation:** highlight rouge si comptes identiques
- **Succès:** toast "Transfert enregistré ✓"

---

## 8. Interactions

| Élément | Action | Destination |
|---------|--------|-------------|
| "+ Nouveau" compte | Modal création | Retour auto à Slide 1 |
| "Suivant >" (Slide 1) | Valide Slide 1 | Slide 2 |
| "Suivant >" (Slide 2) | Valide comptes différents | Slide 3 |
| "< Retour" | Slide précédente | Slide précédente |
| "Terminer" | Enregistre | Historiques (06) |

---

## 9. Base de données

Crée/modifie:
- transactions.type = "TRANSFERT"
- transactions.amount
- transactions.source_account (requis)
- transactions.destination_account (requis)
- transactions.date
- transactions.notes (optionnel)
- **IMPORTANT:** transactions.category = NULL (pas de scoring)
- **IMPORTANT:** transactions.active_vs_passive = NULL
- **IMPORTANT:** transactions.investment_vs_consumption = NULL

---

## 10. Différences clés vs Dépense/Revenu

1. **Slides:** 3 (au lieu de 4) — pas de catégorie
2. **Scoring:** AUCUN — Transfert n'affecte pas le Financial Freedom Score
3. **Catégories:** N/A — pas applicable pour Transfert
4. **"Lié à":** N/A — mouvement interne
5. **Comptes:** Deux comptes DIFFÉRENTS (validation critique)

---

## 11. Cas limites

- Utilisateur tente transfer vers même compte: "Impossible. Sélectionnez un compte différent."
- Montant négatif: validation "Montant doit être > 0"
- Compte source a balance insuffisante: **ACCEPTER (on ignore balance côté client, backend vérifie)**
- Transfert récurrent: possible? (Pas mentionné, probablement "Une Fois" seulement)

---

## 12. Points de clarification

- Transfert = synchrone ou asynchrone? (Probablement synchrone)
- Affiche-t-on une commission/frais? (Actuellement: non)
- Peut-on transférer vers un compte d'un autre utilisateur? (Non, interne seulement)

---
