# 🖼️ SCREEN 6 — STATISTIQUES
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0720 + annotations (Statistiques, jointes séparément)

---

## 1. Overview

- **Nom de l'écran** : Statistiques
- **Objectif** : Vue analytique des finances (dépenses, revenus, score financier) avec plusieurs modes de visualisation
- **Arrive de** : Menu de navigation / Dashboard
- **Va vers** : mode Dépense (à créer), mode Revenu (à créer), mode Patrimoine (à créer), Nouvelle transaction, Historique (clic sur un poste), Aides, Rapport
- **Priorité MVP** : MUST HAVE
- **Complexité** : Complexe

---

## 2. Header

- Flèche retour (←)
- Titre "Statistiques"
- Icône "+" : raccourci pour enregistrer une nouvelle transaction (identique au Dashboard)

---

## 3. Dropdowns de contrôle (pilotent toute la page)

- **Dropdown "Aperçu" (mode)** — le plus important, sélectionne le MODE affiché sur toute la page :
  - **Aperçu** (mode par défaut, seul mode designé — 4 sections détaillées ci-dessous)
  - **Dépense** (page dédiée uniquement aux dépenses — pas encore designée, à créer par Claude Design)
  - **Revenu** (page dédiée uniquement aux revenus — pas encore designée, à créer par Claude Design)
  - **Patrimoine** (vue d'ensemble : projets réalisés + tous les comptes combinés, avec une estimation chiffrée du patrimoine total — pas encore designée, à créer par Claude Design)
- **Dropdown période** (ex. "Aujourd'hui") : unité de temps (Jour/Semaine/Mois/Année) appliquée au mode sélectionné — ne change pas le mode, filtre seulement ses données
- **Dropdown compte** (ex. "Compte Principal") : identique au Dashboard, bascule entre les comptes

---

## 4. Section "Vue d'ensemble de vos finances"

Réutilise exactement la logique déjà établie sur le Dashboard :
- Graphique d'évolution du solde (interaction tap/drag → bulle avec montant, disparaît après 3s, point reste ; animation de tracé au chargement — voir section 8)
- Solde début / Solde actuel
- Revenus / Dépenses (totaux sur la période)
- **Bénéfice net** = Revenus − Dépenses, avec variation (%) vs la période précédente équivalente (même style que "vs Hier" du Dashboard)

---

## 5. Section "Répartition des dépenses"

- **Dropdown de répartition** (pilote le donut + la liste) : Catégorie / Compte Source (compte sur lequel le plus de dépenses ont été faites) / Personnes / Projets
- **Icône filtres (3 points)** :
  - Trier par (montant croissant/décroissant, alphabétique, nombre de transactions)
  - Regrouper les petits postes sous "Autres"
  - Comparer à la période précédente (évolution % par poste)
  - Nombre d'éléments visibles par défaut (Top 5 / Top 10 / tout afficher)
  - Export (CSV/PDF)
- **Graphique circulaire (donut)** : varie selon l'option choisie dans le dropdown de répartition ; montant total + variation (%) vs période précédente
- **Liste des postes** : triée par défaut du plus gros au plus petit montant ; chaque poste est cliquable → navigue vers l'Historique filtré sur cet élément précis
- **"Voir plus"** : affiche le reste de la liste

---

## 6. Section "Répartition des revenus"

Structure strictement identique à la section 5, mais avec les données de revenus :
- Dropdown : Catégorie / Compte Source (compte qui a le plus rapporté) / Personnes / Projets
- Mêmes filtres, même logique de tri et de navigation vers l'Historique

---

## 7. Section "Score financier"

- Affiche un score /100 basé sur 4 critères combinés :
  1. **Liberté Financière (40%)** : Revenus Passifs / Dépenses Totales × 100
  2. **Taux d'Investissement (25%)** : part des dépenses catégorisées Investissement vs Consommation
  3. **Taux d'Épargne (25%)** : (Revenus − Dépenses) / Revenus sur la période
  4. **Diversification des Revenus (10%)** : nombre de sources de revenus actives distinctes
- Paliers qualitatifs : 0-40 Faible · 41-60 Moyen · 61-80 Bon · 81-100 Excellent
- **Bouton vers la page "Aides"** (nouveau bouton + nouvel écran, à créer par Claude Design) — voir le contenu validé en section 9
- **Bouton "Voir rapport"** — voir la logique complète en section 10

---

## 8. Animation de chargement (graphique)

- Identique au Dashboard : la courbe se dessine progressivement du début jusqu'au point actuel au chargement de la page (vitesse modérée, ni trop lente ni instantanée), puis s'arrête
- Se redéclenche à chaque changement de données affichées (compte, période, ou mode)

---

## 9. Contenu de la page "Aides" (validé, texte à intégrer tel quel)

**Comment fonctionne votre Score Financier ?**

Votre score sur 100 reflète la santé globale de vos finances, calculé à partir de 4 indicateurs :

**1. Liberté Financière (40%)** — Le rapport entre vos revenus passifs et vos dépenses totales. Plus il est élevé, plus vous êtes proche de l'indépendance financière.
💡 Pour l'améliorer : développez des revenus passifs (loyers, dividendes, investissements) ou réduisez les dépenses non essentielles.

**2. Taux d'Investissement (25%)** — La part de vos dépenses qui construit votre patrimoine plutôt que d'être simplement consommée.
💡 Pour l'améliorer : privilégiez les dépenses qui gardent de la valeur (formation, outils, projets) plutôt que la consommation pure.

**3. Taux d'Épargne (25%)** — La part de vos revenus mise de côté chaque mois.
💡 Pour l'améliorer : fixez-vous un objectif d'épargne mensuel, même petit.

**4. Diversification des Revenus (10%)** — Le nombre de sources de revenus actives et distinctes.
💡 Pour l'améliorer : développez une deuxième source de revenu plutôt que de dépendre d'une seule.

**Paliers** : 0-40 Faible · 41-60 Moyen · 61-80 Bon · 81-100 Excellent

*Contrainte de format* : texte court, pas de longs paragraphes.

---

## 10. Logique des rapports (bouton "Voir rapport")

- Rapports **mensuel et annuel uniquement** (pas de rapport journalier/hebdomadaire à la demande — pas assez de données pour être utile)
- Génération automatique à la fin de chaque mois/année
- Le rapport affiché est toujours celui de la **période la plus récemment terminée** (ex. en juin, l'utilisateur voit le rapport de mai) jusqu'à ce que le suivant soit prêt ; contenu identique sur les visites répétées dans cette fenêtre
- Écran Rapport : flèche latérale pour naviguer entre les rapports précédents + dropdown restreint à Mois/Année (pas de semaine)
- **Structure du rapport** :
  1. Résumé de la période (Revenus/Dépenses/Balance, comparaison période précédente)
  2. Score global + évolution depuis le dernier rapport
  3. Détail des 4 critères du Score Financier (valeur, statut, diagnostic en une phrase chacun)
  4. Répartitions (Actif/Passif, Investissement/Consommation, top catégories, dépenses par personne)
  5. Priorité du mois (LE conseil le plus important, basé sur le critère le plus faible)
  6. Prédictions pour la période suivante si rien ne change
- **Notification de rapport prêt** : bandeau du Dashboard (en premier, clignotant si non lu — voir SCREEN-04-DASHBOARD.md section 7), page notifications (cloche), et nouvel item "Rapport" dans le menu de navigation (voir SCREEN-05-MENU-NAVIGATION.md)
- **Continuité narrative** : chaque rapport référence le précédent pour montrer l'évolution (amélioration/dégradation), afin de fidéliser l'utilisateur et créer de l'anticipation pour le rapport suivant
- **Framing important** : le score numérique n'est PAS mis en avant comme accroche principale (mentionné mais discret) — le message central de tous les rapports est l'**indépendance financière**, objectif final de la fonctionnalité

---

## 11. Database (haut niveau — à affiner avec Claude Code)

- Réutilise les tables Transactions / Comptes / Catégories déjà définies
- Score financier : calculé à partir des agrégations déjà existantes, aucune nouvelle donnée à collecter auprès de l'utilisateur
- Rapports : table dédiée (période, contenu généré, statut lu/non lu, date de génération)

---

## 12. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé (bandeau en haut de l'écran)

---

## 13. Points de clarification restants

- Structure exacte des modes "Dépense", "Revenu", "Patrimoine" : laissée à Claude Design
- Contenu détaillé complet du rapport (au-delà de la structure proposée en section 10) : à affiner au fur et à mesure

---

## 14. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
