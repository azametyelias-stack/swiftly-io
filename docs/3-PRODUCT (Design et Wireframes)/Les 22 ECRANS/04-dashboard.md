# 🖼️ SCREEN 4 — DASHBOARD (ACCUEIL)
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0722 + annotations (Dashboard, jointes séparément)

---

## 1. Overview

- **Nom de l'écran** : Dashboard (Accueil)
- **Objectif** : Vue d'ensemble du solde, de son évolution, des alertes/objectifs, accès rapide aux templates, aux comptes et à l'historique récent
- **Arrive de** : Connexion (Écran 3) après authentification / accessible depuis la navigation principale
- **Va vers** : Nouvelle transaction, Templates (liste complète), Gestion des comptes (nouvel écran à créer), Historique complet, Notifications, Menu de navigation principal
- **Priorité MVP** : MUST HAVE
- **Complexité** : Complexe

---

## 2. Header

- **Menu hamburger (☰)** : ouvre la navigation principale de l'app (pas de barre de navigation en bas — structure façon app mobile Claude, détaillée à l'écran suivant)
- **Logo "Swiftly.io"** : centré
- **Icône cloche (🔔)** : navigue vers la page notifications (écran à venir)
- **Salutation "Bonjour ! [Username]"** : dynamique, selon l'utilisateur connecté

---

## 3. Solde & période

- **Sélecteur de compte** (dropdown, ex. "Compte Principal") : bascule entre le Compte Principal et les comptes externes ajoutés par l'utilisateur ; n'apparaît que s'il existe au moins un compte externe ajouté
- **Solde total** : solde du compte sélectionné ; icône œil (👁) juste à côté bascule masquer/afficher le montant (confidentialité)
- **Sélecteur de période** (dropdown, ex. "Aujourd'hui") : Jour / Semaine / Mois / Année — recalcule le graphique et le résumé selon la période choisie
- **Variation** (ex. "+17 800 F (9,29%) vs Hier") : comparaison dynamique avec la période précédente équivalente

Le sélecteur de compte et le sélecteur de période pilotent **ensemble** toutes les données affichées plus bas (graphique, résumé, historique filtré).

### Animation du solde (importante)
- Quand l'utilisateur revient sur le Dashboard après avoir enregistré une transaction, le solde affiché **s'anime pendant la première seconde** : les chiffres défilent de l'ancienne valeur vers la nouvelle (effet compteur/odomètre), plutôt qu'un changement instantané

---

## 4. Graphique

- Affiche l'évolution du solde sur la période sélectionnée
- **Interaction tap/drag** : affiche un point + une bulle avec le montant exact à cet instant ; la bulle **disparaît après 3 secondes**, mais le point/marqueur reste visible sur le graphique

### Animation de chargement (importante)
- Au chargement de la page, la courbe **se dessine progressivement** du début jusqu'au point actuel (effet de tracé animé), puis s'arrête — vitesse modérée, ni trop lente ni instantanée
- Cette animation se redéclenche à **chaque changement de données affichées** (changement de compte, changement de période, ou retour sur le Dashboard après une nouvelle transaction)

---

## 5. Bloc résumé (Solde début / Revenus / Dépenses / Solde actuel)

- **Solde début** : solde au tout début de la période sélectionnée (00h si "Jour", début du mois si "Mois", etc.)
- **Revenus** / **Dépenses** : totaux sur la période sélectionnée
- **Solde actuel** : mis à jour en continu (temps réel)

---

## 6. Bouton "+ Nouvelle transaction"

| Élément | Détail |
|---|---|
| Action | Navigue vers le flux d'ajout de transaction |
| Visible quand | Toujours — voir comportement de scroll ci-dessous |

### Comportement de scroll (important)

Il y a **deux scrolls indépendants** sur cet écran :

1. **Scroll général de la page** : au chargement, c'est celui-ci qui est actif. Le header, la salutation, le solde, le graphique, le bloc résumé et le bouton "+ Nouvelle transaction" défilent tous ensemble normalement vers le haut
2. **Scroll interne du panneau blanc** (bandeau Objectif du mois → Templates → Comptes et Cartes → Historique) : indépendant du scroll général

Le passage de l'un à l'autre :
- Le scroll général s'arrête dès que le bouton "+ Nouvelle transaction" atteint le haut de l'écran — à partir de là, le bouton reste à cette position (fixe)
- Une fois cette limite atteinte, continuer à pousser vers le bas déclenche le **scroll interne du panneau blanc**, qui défile alors sous le bouton désormais fixe
- Le panneau blanc ne peut jamais remonter au-delà du bouton (il ne le dépasse pas vers le haut)
- Le fond bleu (image/vidéo globale, voir `DESIGN-GLOBAL.md`) reste fixe derrière tout du début à la fin

**Objectif fonctionnel** : permettre à l'utilisateur de créer une nouvelle transaction à tout moment, peu importe où il se trouve dans le scroll, sans avoir à remonter en haut de la page

---

## 7. Bandeau (Objectif du mois / alertes)

- Zone d'affichage prioritaire pour informations importantes : alertes, projets, score financier, conseils
- Plusieurs items **défilent automatiquement toutes les 30 secondes**
- **Swipe manuel** possible en plus de l'auto-rotation
- **Indicateurs de position** (petits points) affichent où on se trouve dans la rotation
- **Pause automatique** de la rotation si l'utilisateur interagit avec le bandeau (swipe, tap)
- **Priorisation** : les alertes urgentes (ex. solde bas) passent en premier dans la rotation et restent affichées plus longtemps que les simples conseils/objectifs
- **Rapport prêt** : quand un nouveau rapport mensuel/annuel est prêt et non lu, sa notice passe **en premier** dans le bandeau (avant tout le reste) et **clignote** pour attirer l'attention, jusqu'à ce que l'utilisateur l'ait consultée

---

## 8. Templates

- Premier élément de la liste : bouton neutre "+ Créer un template"
- Templates déjà créés : **bordure rouge** = template de dépense, **bordure verte** = template de revenu (détection rapide)
- Infos affichées par template : nom, note/description, montant
- **Options** (icône 3 points en haut à droite OU appui long sur le template) : modifier / supprimer / ouvrir
- **Appui simple (tap)** sur un template : lance le processus de transaction pré-remplie à partir du template — l'utilisateur n'a qu'à confirmer
- Défilement horizontal pour voir plus de templates ; lien **"Voir tout"** navigue vers la page Templates complète (écran séparé, à venir)
- Les templates créés à la volée depuis une transaction (option "sauvegarder comme template") apparaissent ici aussi — même système, pas de distinction avec les templates créés directement

---

## 9. Comptes et Cartes

- Vue d'ensemble du solde de chaque compte
- **Comptes fictifs pour le MVP** : non liés à un vrai compte bancaire (la liaison bancaire réelle est prévue pour une future mise à jour, hors scope MVP)
- **Solde initial** d'un compte : saisi manuellement à la création
- **Solde négatif autorisé** : un avertissement s'affiche avant de confirmer une transaction/transfert qui ferait passer un compte en négatif, mais l'utilisateur peut confirmer et continuer malgré l'avertissement
- Seul le type de transaction **"Transfert"** fait bouger l'argent entre comptes (mouvement enregistré manuellement par l'utilisateur, pas de synchronisation bancaire réelle pour le MVP)
- **Appui long sur un compte** : options ouvrir / supprimer / modifier — **sauf sur "Compte Principal"**, où l'appui long ne déclenche **aucune action**
- Bouton **"+ Ajouter un compte"** : crée un nouveau compte fictif
- ⚠️ **Nouvel écran requis** (pas encore designé) : "Gestion des comptes", pour la gestion détaillée des comptes — à ajouter à la liste des écrans MVP et à demander à Claude Design

---

## 10. Historique récent

- Affiche par défaut les **3 transactions les plus récentes**
- Chaque ligne affiche : icône directionnelle (flèche bas-gauche = dépense, flèche haut-droite = revenu), catégorie, date/heure, note, "lié à", montant, type
- **Code couleur** : flèche/montant en **rouge** pour une dépense, en **vert** pour un revenu
- **"Lié à"** : affiché à côté de la note, préfixé par "pour" (ex. note "Spaghettis rouge" + lié à "mon enfant" → "pour [note], lié à [personne/projet]"). Même logique pour les revenus (lié à la source)
- **Troncature** : si note + "lié à" dépassent l'espace disponible, la **note est tronquée en premier** (avec indication visuelle que le texte continue), le "lié à" reste toujours visible. Pas de limite de caractères fixe — troncature responsive selon la taille d'écran et le layout
- **Appui long** sur une transaction : options voir détails / modifier / supprimer
- **Icône filtre** (entonnoir, en haut à droite) : options de tri (plus récent, par nom, par montant croissant/décroissant, etc.) — liste exacte laissée à l'appréciation de Claude Design
- Lien **"Voir plus"** : affiche le reste de l'historique au-delà des 3 récents

---

## 11. Database (haut niveau — à affiner avec Claude Code)

- **Comptes** : utilisateur, nom, solde, type, fictif = true pour le MVP
- **Transactions** : liées à un compte, une catégorie, éventuellement un "lié à" (personne/projet/source), un type (dépense/revenu/transfert), un statut, une récurrence
- **Templates** : liés à un type (dépense/revenu), réutilisables pour préremplir une transaction

---

## 12. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé (bandeau dégradé en haut de cet écran)
- Icônes (hamburger, cloche, œil, filtre, flèches directionnelles) : design laissé à Claude Design

---

## 13. Points de clarification restants

- Liste exacte des options de filtre de l'historique : laissée à Claude Design
- Conditions exactes de déclenchement d'une alerte dans le bandeau : à définir plus tard

---

## 14. Validation

- Elias : ✅
- Claude : ✅ (compilé 21 juillet 2026)
