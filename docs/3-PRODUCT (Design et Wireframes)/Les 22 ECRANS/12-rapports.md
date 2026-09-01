# 🖼️ SCREEN 19 — RAPPORT (Rapport mensuel et annuel)
**Statut** : Compilé et validé — méthodologie fonctionnelle uniquement
**Date** : 22 juillet 2026
**Screenshots associés** : N/A (écran à créer par Claude Design)

---

## 1. Overview

- **Nom de l'écran** : Rapport
- **Objectif** : Afficher un rapport détaillé mensuel ou annuel sur la progression financière vers l'indépendance financière, avec analyse complète des 4 critères, comparaisons, projections, et conseils
- **Arrive de** : Bouton "Voir rapport" (Statistiques), cloche notifications (Rapport prêt), menu de navigation
- **Va vers** : Statistiques ou Dashboard via flèche retour
- **Priorité MVP** : MUST HAVE
- **Complexité** : Complexe (plusieurs sections, données dynamiques, comparaisons)

---

## 2. Header

- Flèche retour (←)
- **Titre dynamique** :
  - **Mensuel** : "Rapport du mois de juin 2026"
  - **Annuel** : "Rapport annuel 2026"
- Dropdown pour naviguer (Mois/Année uniquement — pas de semaine)
  - Affiche liste des périodes disponibles (mois/années passés, présent)
  - Sélection change le contenu du rapport

---

## 3. Contenu principal

**Empty state (rapport non encore disponible)** — affiché si c'est la première fois ou avant la fin du premier mois :
- **Titre (grand)** : "Rapport non encore disponible"
- **Sous-titre** : "Votre premier rapport sera généré à la fin du mois. En attendant, continuez à enregistrer vos transactions pour que l'application puisse analyser votre situation financière."
- **Bouton/Lien** : "← Retour aux Statistiques" ou Dashboard

**Avec rapports disponibles** — affiche le contenu détaillé ci-dessous (scroll)

---

## 4. Contenu principal (scroll) — Structure commune Mensuel & Annuel

### **Section 1 (du contenu avec rapports) : Vue d'ensemble de la période**

**Titre :** "Vue d'ensemble"

**Affichage :**
- **Revenus totaux** : montant (ex. "15 000 FCFA") + variation % vs période précédente
  - Détail : Actif vs Passif (ex. "12 000 Actif | 3 000 Passif")
- **Dépenses totales** : montant + variation %
  - Détail : Investissement vs Consommation (ex. "5 000 Investissement | 10 000 Consommation")
- **Bilan net** : (Revenus − Dépenses) + couleur (vert si positif, rouge si négatif)

**Graphique optionnel :** courbe de l'évolution du solde sur la période

---

### **Section 2 : Score Financier global**

**Titre :** "Votre Score Financier"

**Affichage :**
- **Donut/gauge chart** montrant le score /100 (ex. 72/100)
- **Label qualificatif** : "Bon" (couleur codée)
- **Évolution vs période précédente** : "↑ +5 points vs mai 2026"
- **Lien "Voir l'aide"** (texte bleu) → redirige vers page Aides

---

### **Section 3 : Les 4 critères détaillés**

**Titre :** "Analyse des critères"

Chaque critère affiche :

**Critère 1 : Liberté Financière (40%)**
- **Icône** : graphique ascendant
- **Valeur actuelle** : ex. "35%"
- **Variation** : "↓ -2% vs juin 2025" (pour comparaison annuelle) ou "↓ -0.5% vs mai 2026" (mensuelle)
- **Benchmark** : "Vous : 35% | Moyenne utilisateurs stade 'Moyen' : 32%"
- **Statut** : "Bon progrès — continuez à développer vos revenus passifs"

**Critère 2 : Taux d'Investissement (25%)**
- **Icône** : graphique/bâtiment
- **Valeur actuelle** : ex. "33%"
- **Variation** : évolution vs période précédente
- **Benchmark** : "Vous : 33% | Moyenne : 28%"
- **Statut** : texte court

**Critère 3 : Taux d'Épargne (25%)**
- **Icône** : tirelire
- **Valeur actuelle** : ex. "20%"
- **Variation** : évolution
- **Benchmark** : "Vous : 20% | Moyenne : 18%"
- **Statut** : texte court

**Critère 4 : Diversification des Revenus (10%)**
- **Icône** : arbre/réseau
- **Valeur actuelle** : ex. "2 sources"
- **Variation** : "Stable vs mois dernier"
- **Benchmark** : "Vous : 2 sources | Moyenne : 1.8 sources"
- **Statut** : texte court

---

### **Section 4 : Projection vers l'indépendance financière**

**Titre :** "Votre chemin vers l'indépendance"

**Affichage :**
- **Barre de progression linéaire** :
  - Actuellement à 45% du chemin vers 100% d'indépendance
  - Code couleur : vert pour avancée
- **Texte de projection** : "À ce rythme, vous atteindrez l'indépendance financière en 18 mois"
- **Date estimée** : "Prévision : décembre 2027"
- **Avertissement/Remarque** : "Cette projection suppose que vos tendances se maintiennent. Des changements de revenus ou dépenses peuvent modifier cette date."

---

### **Section 5 : Points forts du mois/année**

**Titre :** "Ce que vous avez bien fait"

**Affichage (texte inline) :**
- "✓ Vous avez augmenté votre taux d'épargne de 3% — continuez !"
- "✓ Vos revenus passifs ont progressé de 15% — excellente diversification."
- "✓ Vous avez réduit vos dépenses de consommation de 8% — prudence maintenue."

(2-3 points maximum, par ordre de priorité)

---

### **Section 6 : Priorité du mois/année**

**Titre :** "Votre priorité"

**Affichage (texte inline) :**
- **Problème identifié** : "Votre Diversification des revenus est faible (une seule source : salaire)."
- **Contexte** : "C'est un risque. Si vous perdez ce revenu, tout s'arrête."
- **Action recommandée** : "Développez une deuxième source de revenu — freelance, petit commerce, ou investissement passif."
- **Impact** : "Une deuxième source pourrait augmenter votre score global de 8-10 points et votre date d'indépendance de 6 mois."

(Un seul point critique, le plus impactant pour améliorer le score)

---

### **Section 7 : Répartition détaillée des finances**

**Titre :** "Où va votre argent ?"

**Affichage :**

**Revenus par type :**
- Graphique donut : Actif (70%) vs Passif (30%)
- Détail : ex. "Salaire : 12 000€ (Actif) | Loyers : 3 000€ (Passif)"

**Dépenses par catégorie :**
- Top 5 catégories affichées (ex. "Alimentation : 4 500€ | Transport : 2 500€ | Loisirs : 1 800€")
- Barre pour chaque catégorie montrant le % du total

**Dépenses par type :**
- Graphique donut : Investissement (33%) vs Consommation (67%)
- Détail : ex. "Investissement : 5 000€ | Consommation : 10 000€"

---

### **Section 8 : Comparaison vs Benchmark (communauté)**

**Titre :** "Comment vous vous situez"

**Affichage :**
- **Tableau comparatif** (texte inline) :
  - "Vous êtes au stade 'Moyen' (score 41-60)"
  - "Score moyen utilisateurs à votre stade : 52%"
  - "Vous êtes à 55% — vous surpassez la moyenne de 3 points !"
- **Benchmark pour chaque critère** (inline) :
  - "Liberté Financière : Vous (35%) vs Moyenne (32%) — vous êtes en avance"
  - "Taux d'Épargne : Vous (20%) vs Moyenne (18%) — bon travail"
  - "Diversification : Vous (2 sources) vs Moyenne (1.8) — stable"

---

### **Section 9 : Comparaisons temporelles (Annuel uniquement)**

**⚠️ CETTE SECTION APPARAÎT SEULEMENT EN MODE ANNUEL**

**Titre :** "Comparaison annuelle : 2026 vs 2025"

**Affichage :**
- **Score global** : 2025 : 48% | 2026 : 55% → "↑ +7 points — excellent progrès !"
- **Chaque critère** : comparaison année vs année
  - "Liberté Financière : 2025 (30%) vs 2026 (35%) → ↑ +5 points"
  - "Taux d'Épargne : 2025 (15%) vs 2026 (20%) → ↑ +5 points"
- **Moyennes annuelles** :
  - "Revenus moyens 2026 : 10 500€/mois (vs 9 800€ en 2025)"
  - "Dépenses moyennes 2026 : 8 200€/mois (vs 8 500€ en 2025)"
- **Tendance globale** : "Vous progressez régulièrement — continuez sur cette lancée !"

---

### **Section 10 : Conseils stratégiques personnalisés**

**Titre :** "Recommandations pour le prochain mois/année"

**Affichage (texte inline) :**
- **Conseil 1 (basé sur la priorité) :** "Développez une deuxième source de revenu — c'est votre levier majeur pour atteindre l'indépendance."
- **Conseil 2 (opportunité) :** "Votre taux d'épargne est bon. Investissez une partie de vos économies pour générer des revenus passifs."
- **Conseil 3 (maintenance) :** "Maintenez votre niveau de dépenses d'investissement — c'est ce qui bâtit votre patrimoine."

(2-3 conseils, personnalisés en fonction des données)

---

## 4. Interaction avec le Dropdown Mois/Année

**Dropdown "Mois/Année"** (en haut, sous le titre) :
- Affiche liste des périodes disponibles (ex. "Juin 2026", "Mai 2026", "Année 2025", "Année 2024")
- Sélectionner une période → recharge le rapport pour cette période
- **Mode Mensuel** : affiche Sections 1-8
- **Mode Annuel** : affiche Sections 1-10 (inclut la Section 9 de comparaison annuelle)

---

## 5. Database

- **Table `reports`** : user_id, period (month/year), period_type (monthly/annual), score_global, criteria_values (JSON), benchmarks_comparisons, projection_data, created_at
- **Calcul en temps réel** : les chiffres du rapport sont calculés depuis les transactions de la période (pas pré-générés)
- **Comparaisons** : requêtes sur les périodes précédentes + benchmark utilisateurs au même stade

---

## 6. Cohérence visuelle et structurelle (CRITIQUE)

**⚠️ IMPORTANT POUR CLAUDE DESIGN :**
Cet écran doit suivre **EXACTEMENT** le même style visuel que tous les autres écrans de l'application (Dashboard, Statistiques, Historiques, Projets, Budgets, Templates, etc.) montré dans les screenshots Figma fournis par Elias.

**Éléments à respecter scrupuleusement :**
- **Fond partagé** : voir `DESIGN-GLOBAL.md` (asset navy partagé, même traitement que les autres pages)
- **Palette de couleurs** : identique aux autres écrans (vert pour progrès/bon, rouge pour risque/faible, neutre pour stable)
- **Typographie** : SF Pro (ou équivalent), même hiérarchie que Dashboard/Statistiques
- **Spacing, padding, borders** : cohérent avec les autres pages
- **Composants** (boutons, dropdowns, cartes) : design système unifié
- **Graphiques** : donuts, barres, courbes — visuels simples, style identique aux graphiques du Dashboard
- **Interactions** : tap, swipe, scroll — patterns identiques à travers l'app

**Résumé :** Imaginez que cet écran fait partie naturellement du flux des autres écrans — pas de rupture visuelle, pas de nouvel OS.

---

## 7. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- **Icônes des 4 critères** : identiques à la page Aides
- **Graphiques** : donuts, barres, courbes, barre de progression
- Design laissé à Claude Design

---

## 8. Points de clarification

- Export du rapport en PDF ? (optionnel pour le MVP)
- Partage du rapport ? (optionnel pour le MVP)
- Rappels réguliers de consulter le rapport ? (notification programmée — déjà couverte par Alertes & Notifications)

---

## 9. Validation

- Elias : ✅
- Claude : ✅ (compilé 22 juillet 2026)
