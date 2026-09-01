# 🖼️ SCREEN 5 — MENU / NAVIGATION (panneau global)
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0721 (Menu, jointe séparément)

---

## 1. Overview

- **Nom** : Menu de navigation
- **Objectif** : Naviguer entre les grandes sections de l'application
- **Arrive de** : **N'importe quel écran de l'application** — accessible globalement, pas propre au Dashboard
- **Va vers** : Dashboard, Statistiques, Compte & Cartes (= Gestion des comptes), Templates, Budgets, Projet, Alertes & Notifications, Historiques, Aides, Rapport
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré (geste global + réutilisation sur tout l'écran)

---

## 2. Contenu affiché (texte exact)

- Titre : "Menu"
- Icône profil (haut droite) : accès à la page Profil (pas encore designée, à créer par Claude Design)
- Liste des sections avec icône chacune : Dashboard, Statistiques, Compte & Cartes, Templates, Budgets, Projet, Alertes & Notifications, Historiques, **Aides**, **Rapport** (ces deux derniers ajoutés le 21 juillet 2026 — pas encore designés, à créer par Claude Design)
- L'item correspondant à l'écran actuellement affiché est mis en évidence visuellement dans la liste

---

## 3. Interaction (critique — geste global)

### Ouverture
- Le menu n'est **pas limité à un bouton sur le Dashboard** : il est accessible **depuis n'importe quel écran de l'application**, via un **swipe de gauche à droite**
- Inspiré du comportement de l'app mobile Claude : le menu est "caché" en dessous de l'écran courant. Le swipe pousse/décale l'écran courant vers la droite, révélant le menu en dessous
- L'écran courant n'est pas totalement recouvert : une bande reste visible sur le bord droit

### Fermeture
- Swipe de droite à gauche referme le menu, ramenant l'écran précédent à sa position d'origine
- Pas de bouton de fermeture explicite dans le panneau

---

## 4. États & comportements

- **Libellé trop long** (ex. "Alertes & Notifications") : au lieu d'une troncature statique avec "...", le texte **défile (effet marquee)** pour afficher l'intégralité du libellé

---

## 5. Database

- Aucune donnée dynamique propre à cet écran — liste de navigation statique
- Point ouvert : faut-il un badge (nombre) sur "Alertes & Notifications" s'il y a des notifications non lues ? (voir section 8)

---

## 6. Intégrations

- Navigation interne uniquement, aucun appel API

---

## 7. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes de chaque item de menu : design laissé à Claude Design

---

## 8. Points de clarification

- Badge de notifications non lues sur "Alertes & Notifications" ? à clarifier plus tard
- "Projet" et "Alertes & Notifications" : nouveaux écrans autonomes à détailler plus tard dans le processus
- "Aides" et "Rapport" : nouveaux écrans ajoutés le 21 juillet 2026 (voir SCREEN-06-STATISTIQUES.md pour leur contexte — page d'aide sur le Score Financier, et page de rapport mensuel/annuel) — pas encore designés, à créer par Claude Design
- "Compte & Cartes" correspond au "Gestion des comptes" déjà identifié comme manquant lors de la revue du Dashboard

---

## 9. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
