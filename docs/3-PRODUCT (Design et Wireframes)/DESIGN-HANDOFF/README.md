# Handoff : Swiftly.io — application de gestion financière

## Overview

Swiftly.io est une application mobile de gestion financière destinée aux indépendants et aux
très petites entreprises, en zone franc CFA. Elle regroupe cash, mobile money et comptes
bancaires derrière un solde unique, et couvre : onboarding, tableau de bord, saisie et
consultation de transactions, statistiques par catégorie, transactions récurrentes, projets
d'épargne, comptes multiples, notifications, mode de confidentialité, paramètres.

Ce dossier contient dix lots de maquettes validées, le design system, deux planches
d'arbitrage, et une documentation système qui traduit l'ensemble en jetons nommés,
composants et règles de flux.

Langue de l'interface : **français**. Devise par défaut : **franc CFA (XOF)**.

## About the Design Files

Les fichiers `.dc.html` du dossier `design/` sont des **références de design réalisées en
HTML**. Ce sont des maquettes qui montrent l'apparence et le comportement attendus — ce
n'est pas du code de production à copier.

La tâche est de **recréer ces designs dans l'environnement du dépôt cible**, avec ses
patterns et ses bibliothèques établis (React Native, SwiftUI, Flutter, Kotlin, React web…).
Si aucun environnement n'existe encore, choisir le framework le plus adapté à une
application mobile financière et y implémenter les designs.

Ne pas porter le HTML tel quel. Ne pas reprendre la mécanique interne des fichiers
(`support.js`, balises `<x-dc>`, `<sc-for>`, `<sc-if>`) : c'est l'outillage de la plateforme
de design, sans rapport avec le produit.

## Fidelity

**Haute fidélité.** Couleurs, typographie, espacements, rayons, ombres et durées
d'animation sont définitifs et documentés à la valeur près dans
`design/Swiftly - Documentation développeurs.dc.html`. L'interface doit être recréée
fidèlement, en utilisant les bibliothèques et composants existants du dépôt.

Deux fichiers du projet d'origine sont **volontairement exclus** de ce dossier, et ne
doivent pas servir de référence même s'ils vous sont transmis par ailleurs :

- **le prototype cliquable** — construit pour éprouver les règles de flux avec un rendu
  simplifié ; son onboarding et son tableau de bord ne correspondent pas aux maquettes ;
- **« Parking Projets & Comptes »** — porte une géométrie de carte antérieure
  (radius 18, padding 14, icône 44).

## Où lire quoi

| Fichier | Rôle |
| --- | --- |
| `Swiftly - Documentation développeurs.dc.html` | **À ouvrir en premier.** Jetons, composants, carte des écrans, flux, motion, états, a11y, points ouverts. |
| `Swiftly - Thème sombre.dc.html` | Table de correspondance clair/sombre. **Source des valeurs sombres**, prévaut sur le design system. |
| `Swiftly - Passe de cohérence.dc.html` | Arbitrages de valeurs : les deux verts, les gris, le rouge, la géométrie de carte. |
| `Swiftly Design System.dc.html` | Fondations et principes. **Attention** : ce fichier a dérivé sur trois valeurs — voir « Écarts connus ». |
| `Swiftly - Lot 1` à `Lot 10` | Les écrans validés. Un lot par domaine fonctionnel. |

### Écarts connus dans le design system

Le fichier du design system porte trois valeurs que les dix lots n'utilisent pas. En cas de
contradiction, **ce sont les lots qui font foi** :

| Le design system dit | Les lots utilisent | Rôle |
| --- | --- | --- |
| `#1B3BF5` | `#152BC7` | Bleu d'action |
| `#F4F4F6` | `#EBEBEF` | Fond de page de l'application |
| `#E5352B` | `#A80010` | Rouge sémantique |

De même, le bloc « Surfaces — sombre » du design system est **obsolète** : les valeurs du
thème sombre sont celles de `Swiftly - Thème sombre.dc.html`, reprises dans la table de
jetons de la documentation.

## Screens / Views

Vingt écrans, répartis en dix lots. Le détail de chaque écran — layout, composants,
couleurs, typographie, copie exacte — se lit dans le fichier de lot correspondant ; la
section « Carte des écrans » de la documentation donne pour chacun le lot, les composants
et la donnée attendue du back-end.

Base de maquettage : **iPhone 375 × 812 pt**. Marge d'écran : 16.

| Écran | Lot | Objet |
| --- | --- | --- |
| Splash et bienvenue | 1 | Entrée dans l'application |
| Inscription — nom | 1 | `user.name`, deux caractères minimum |
| Inscription — solde de départ | 1 | Point zéro du calcul de solde |
| Inscription — devise | 1 | F / € / $ |
| Vérification OTP | 1 | Cases de code, bandeau de succès |
| Tableau de bord | 2 | Solde, courbe, objectif, trois dernières transactions |
| Tiroir de navigation | 2 | Huit entrées, bascule de thème |
| Liste de transactions | 3 | Filtres Tout / Dépenses / Revenus |
| Saisie de montant | 3 | Pavé numérique, solde projeté |
| Choix de catégorie | 3 | Liste à coche, teintes fixes |
| Note et validation | 3 | Récapitulatif, note, bascule récurrence |
| Statistiques | 4 | Total du mois, barres par catégorie, seuils 75 / 100 % |
| Récurrences | 5 | Suspendre, supprimer |
| Nouvelle récurrence | 5 | Libellé, montant, fréquence |
| Projets d'épargne | 6 | Cartes à progression |
| Détail de projet | 6 | Affectation depuis le solde, suppression |
| Comptes | 7 | Sélection du compte actif |
| Notifications | 7 | Pastille de non-lu |
| Mode privacy | 8 | Masquage global des montants |
| Paramètres | 9 | Profil, devise, thème, notifications, déconnexion |
| États système | 10 | Chargement, vide, erreur, hors ligne, toasts |

## Interactions & Behavior

### Navigation

Deux niveaux, et cette distinction décide seule du bouton en haut à gauche de la barre de
navigation :

- **Niveau racine** (icône de menu) : Tableau de bord, Transactions, Statistiques, Projets,
  Récurrences, Comptes, Paramètres. Atteignables par le tiroir latéral, sans historique
  entre elles.
- **Sous-écrans** (chevron de retour) : détail de projet, formulaires, alertes, feuilles
  modales. Le retour remonte d'un cran dans le flux, jamais au tableau de bord par défaut.

**Continuité directionnelle** : ce qui entre par la droite ressort par la droite ; ce qui
monte du bas redescend par le bas. Une feuille modale n'utilise jamais de transition
latérale, un sous-écran n'apparaît jamais par le bas.

### Règles métier

Ces règles sont lisibles dans les maquettes et doivent être implémentées telles quelles.

1. **Un seul solde.**
   `solde disponible = base du compte + revenus − dépenses − montants affectés aux projets`
   Aucun écran ne recalcule autrement, aucun écran n'affiche un solde d'une autre origine.
2. **Affecter à un projet** retire le montant du solde disponible **sans créer de
   transaction**. Si le solde est inférieur au montant, l'action est refusée avec
   « Solde insuffisant » — jamais de solde négatif.
3. **Suspendre ≠ supprimer.** L'interrupteur d'une récurrence la suspend en conservant son
   historique ; la corbeille la supprime. Deux gestes distincts, pas de confirmation
   partagée.
4. **Récurrence depuis une transaction.** La bascule du troisième temps du formulaire crée
   l'entrée dans la liste des récurrences en plus de la transaction. Fréquence mensuelle par
   défaut.
5. **Mode privacy** : un seul indicateur global. Aucun masquage local, et le mode survit au
   changement d'écran comme au changement de thème.
6. **Changement de devise** : change le symbole affiché, pas la valeur stockée. Aucune
   conversion (voir « Points ouverts »).
7. **Catégorie et type** : une catégorie appartient à un type. Basculer dépense ↔ revenu
   vide la catégorie choisie plutôt que de conserver un couple invalide.
8. **Validation minimale** : nom ≥ 2 caractères ; montant > 0 ; cible de projet renseignée.
   Le bouton de continuation reste visible mais grisé, et l'appui explique ce qui manque.

### Motion

Quatre durées, deux courbes. Le retour visuel d'un appui arrive **au contact**, pas au
relâchement.

| Usage | Durée | Courbe |
| --- | --- | --- |
| Réponse au contact (touche de pavé, pilule) | 120 ms | `ease-out` |
| Bascule (interrupteur, coche) | 180 ms | `cubic-bezier(.23,1,.32,1)` |
| Pression de bouton (`scale 0.975`) | 160 ms | `cubic-bezier(.23,1,.32,1)` |
| Feuille modale (voile en fondu 200 ms) | 280 ms | `cubic-bezier(.32,.72,0,1)` |
| Tiroir latéral | 260 ms | `cubic-bezier(.32,.72,0,1)` |
| Tracé de la courbe de solde | 1 200 ms | `cubic-bezier(.32,.72,0,1)` |

Sous `prefers-reduced-motion`, translations et tracé progressif sont remplacés par un fondu
de 120 ms. Les changements d'état restent instantanés : ils portent de l'information.

### États système (lot 10)

| Situation | Traitement | Action offerte |
| --- | --- | --- |
| Chargement | Squelettes aux dimensions du contenu attendu, pulsation d'opacité 1 → 0,45. Jamais de rotateur centré. | Aucune |
| Liste vide | Titre court, une phrase expliquant ce qui la remplira. Centré, sans illustration. | Bouton de création |
| Filtre sans résultat | Distinct de la liste vide : la liste a des éléments, le filtre n'en retient aucun. | Retour à « Tout » |
| Erreur réseau | Bandeau non bloquant en haut du contenu, `semantic/out`. Le cache reste visible. | Réessayer |
| Hors ligne | Bandeau persistant. Écritures mises en file, signalées en attente. | Automatique |
| Écriture refusée | Toast en encre avec la raison. L'écran reste en place, les valeurs saisies conservées. | Corriger sur place |
| Écriture réussie | Toast de confirmation et retour à l'écran d'origine dans le même geste. | Aucune |

## State Management

État global minimal déduit des maquettes :

```
user            { name, email, currency }           // currency ∈ { 'F', '€', '$' }
settings        { theme, privacy, notif }           // theme ∈ { 'light', 'dark' }
                { notif: { push, budget, recap } }
accounts        [ { id, name, type, base } ]
activeAccountId  id
transactions    [ { id, label, category, kind, amount, createdAt } ]
                                                    // kind ∈ { 'in', 'out' }
categories      [ { id, name, kind, color } ]       // couleur fixe, cf. jetons
projects        [ { id, name, target, saved } ]
recurring       [ { id, name, amount, freq, active } ]
                                                    // freq ∈ { hebdo, mensuel, trimestriel }
alerts          [ { id, title, body, createdAt, unread } ]
```

Valeurs dérivées, à calculer et non à stocker : `balance` (règle 1), totaux de revenus et de
dépenses, agrégats par catégorie, pourcentage de progression des projets et des budgets.

Brouillons d'écriture : `draft.transaction { amount, kind, category, note, makeRecurring }`
avec un pas courant (1 → 3), `draft.project`, `draft.recurring`.

## Design Tokens

Un seul jeu de noms, deux jeux de valeurs, résolus par le thème actif. **Aucune valeur
hexadécimale en dur dans un composant.**

### Couleur

| Jeton | Clair | Sombre | Emploi |
| --- | --- | --- | --- |
| `surface/page` | `#EBEBEF` | `#121318` | Fond de l'application — jamais de noir pur |
| `surface/card` | `#FFFFFF` | `#1C1D23` | Cartes de liste, blocs de contenu |
| `surface/elev` | `#FFFFFF` | `#25262E` | Feuilles modales, tiroir |
| `surface/field` | `#ECECEF` | `#1C1D23` | Champs de saisie, pavé numérique |
| `surface/divider` | `#E3E4E8` | `#2C2E36` | Bordures de carte, séparateurs |
| `surface/hairline` | `#EDEDF1` | `#2C2E36` | Filets intérieurs, badge neutre |
| `surface/rail` | `#E2E2E7` | `#383A44` | Rails de progression, bordure de champ |
| `surface/control-off` | `#D2D3D9` | `#383A44` | Interrupteur éteint, bouton secondaire |
| `text/primary` | `#0A0A0C` | `#F2F2F5` | Montants, titres, libellés |
| `text/secondary` | `#5A5C63` | `#A6A8B4` | Descriptions, libellés de champ |
| `text/tertiary` | `#8A8C93` | `#7E808C` | Horodatages, mentions |
| `text/quaternary` | `#C4C5CC` | `#5E606C` | Chevrons, traits discontinus |
| `action/primary` | `#0A0A0C` | `#F2F2F5` | Bouton principal — inversion complète |
| `action/on-primary` | `#FFFFFF` | `#0A0A0C` | Texte du bouton principal |
| `brand/deep` | `#0A1466` | `#0A1466` | Base du dégradé nuit — invariant |
| `brand/accent` | `#152BC7` | `#7C8CFF` | Liens, interrupteurs, information |
| `semantic/in` | `#006B3C` | `#1DCF02` | Revenus, objectifs atteints |
| `semantic/in-bg` | `#E6F4EC` | `#1C1D23` | Fond de badge « revenu » |
| `semantic/out` | `#A80010` | `#FF6166` | Dépenses, alertes, destructif |
| `semantic/out-bg` | `#FBEAEA` | `#1C1D23` | Fond de badge « dépense » |
| `semantic/warn` | `#F5A524` | `#F5A524` | Barres de budget, seuil dépassé |
| `semantic/warn-text` | `#8A5A00` | `#F5A524` | Pourcentage en alerte |
| `ink/surface` | `#0A0A0C` | `#0A0A0C` | Zone d'identité, toast — invariant |
| `ink/on-surface` | `#FFFFFF` | `#FFFFFF` | Texte sur encre — invariant |

**La règle des deux verts** ne dépend pas du sens mais du fond. Sur clair ou blanc :
`#006B3C`. Sur encre ou bleu nuit : `#1DCF02`. Aucune autre valeur de vert n'existe.

**Retirés, à ne pas réintroduire** : `#12B76A`, `#0A5C2E` (verts surnuméraires), `#E5352B`
(rouge du design system), `#1B3BF5` (bleu du design system), `#EDEDF1` comme rail
(reste un filet), `#F4F4F6` (fond des planches de documentation, pas un jeton produit).

**Règle propre au thème sombre** : la zone d'identité — en-tête du tableau de bord, écrans
d'onboarding, cartes bancaires — conserve le dégradé nuit dans les deux thèmes. C'est un
plan fixe ; seul le corps de l'application bascule. Les montants posés dessus utilisent donc
toujours le vert d'encre.

### Catégories — teintes fixes

La couleur est attachée à la catégorie, pas à sa position dans une liste. C'est ce qui rend
les graphiques lisibles sans légende. Une nouvelle catégorie prend la teinte suivante et la
garde.

`Loisirs #152BC7` · `Alimentation #29ABE2` · `Transport #A3121A` · `Salaire #006B3C` ·
`Loyer #F5A524`

### Typographie

Pile système Apple, avec repli Helvetica Neue sur Android et Web :

```
-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui,
"Helvetica Neue", Helvetica, sans-serif
```

Le sérif du logotype (Georgia) est **strictement réservé au logotype** : aucun titre, aucun
montant, aucun libellé.

| Rôle | Spécification | Emploi |
| --- | --- | --- |
| Solde | 34 / 1.02 · 700 · −0.03em | Tableau de bord |
| Montant saisi | 44 / 1.05 · 700 · −0.035em | Pavé numérique |
| Titre d'écran | 19 / 1.2 · 700 · −0.02em | Barre de navigation |
| Titre de section | 17 / 1.3 · 700 · −0.012em | Carte de liste |
| Corps | 15 / 1.45 · 400–600 | Descriptions, rangées |
| Secondaire | 13 / 1.45 · 400–600 | Sous-titres, montants annexes |
| Étiquette | 11 / 1.2 · 700 · 0.04em · capitales | Badges, en-têtes |

**Tout montant porte `font-variant-numeric: tabular-nums`**, sans exception. C'est ce qui
empêche les colonnes de chiffres de danser à la mise à jour.

### Format des montants

| Cas | Rendu | Règle |
| --- | --- | --- |
| Séparateur de milliers | `250 000 F` | Espace fine insécable **U+2009**. Jamais de virgule ni de point. |
| Entrant | `+67 000 F` | Signe plus explicite, `semantic/in`. |
| Sortant | `−32 200 F` | Signe moins typographique **U+2212**, `semantic/out`. |
| Solde neutre | `343 100 F` | Sans signe. Le moins n'apparaît que si le solde est négatif. |
| Masqué (privacy) | `•• •••` | Deux puces, espace, trois puces. Longueur fixe quel que soit le montant. |
| Devise | `F` · `€` · `$` | Suffixe séparé par une espace normale, jamais collé au chiffre. |

### Géométrie

| Élément | Valeur |
| --- | --- |
| Carte de liste | radius 20 · padding 16 |
| Bloc de contenu | radius 18 |
| Feuille modale | radius haut 24 |
| Zone de contenu | radius haut 28 |
| Icône de carte | 48 · radius 14 |
| Icône ↔ texte | 16 |
| Entre cartes | 12 |
| Marge d'écran | 16 |
| Trait SVG | 1,7 px |
| Rail de progression | 8 · radius 999 |
| Sélecteur · bouton de liste | 48 · 52 |
| Bouton principal | 56 · radius 999 |
| Rangée de paramètre | 56 |
| Interrupteur | 50 × 30 · pastille 24 · course 3 → 23 |
| Cible tactile minimale | 44 |

### Ombres

Le produit n'utilise pas d'ombres portées décoratives. Deux emplois seulement :

- **Bouton principal sur fond nuit** — traitement « verre poli » : dégradé blanc à cinq
  arrêts, plus
  `inset 0 2px 1px rgba(255,255,255,1)`, `inset 0 0 0 1px rgba(255,255,255,.9)`,
  `0 3px 8px rgba(4,6,30,.22)`, `0 16px 34px -6px rgba(4,6,30,.44)`.
- **Toast** — `0 12px 34px rgba(4,6,30,.34)`.

En thème sombre, l'élévation se dit en clarté de surface (`surface/elev`), pas en ombre.

## Composants

Quatorze composants couvrent l'intégralité des dix lots. Un écran qui semble demander un
quinzième composant demande en réalité une variante d'un existant. Anatomie, états et
valeurs opposables : section 03 de la documentation.

Barre de navigation · Carte de solde · Courbe de solde · Carte de liste · Badge de type ·
Bouton principal · Pilule de filtre · Pavé numérique · Interrupteur · Rangée de paramètre ·
Barre de progression · Feuille modale · Tiroir latéral · Toast

## Accessibilité

- **Contraste** : toutes les paires texte-fond des deux thèmes passent AA. Les deux verts
  existent précisément pour tenir ce seuil sur leur fond respectif.
- **Cibles tactiles** : 44 px minimum dans toutes les directions. Les boutons de 40 de la
  barre de navigation portent une zone d'appui étendue.
- **Dynamic Type** : l'échelle suit la taille système jusqu'à 200 %. Les cartes de liste
  passent en deux lignes plutôt que de tronquer le libellé.
- **Focus clavier** : anneau de 2 px en `brand/accent` avec 2 px de retrait.
- **Lecteur d'écran** : les montants sont annoncés en entier avec leur devise et leur sens
  — « plus 67 000 francs CFA, revenu ». Les puces du mode privacy sont annoncées
  « montant masqué ».
- **La couleur ne porte jamais seule** : un montant entrant est vert *et* précédé d'un plus ;
  une catégorie a sa teinte *et* son libellé ; une récurrence suspendue a son interrupteur
  éteint *et* la mention « suspendue ». Retirer toute la couleur d'un écran ne doit rien lui
  faire perdre d'essentiel.

## Points ouverts — à décider avant implémentation

Ces points ne figurent dans aucun lot validé. Ils demandent une décision produit, pas une
interprétation au moment du développement. **Demander plutôt que trancher seul.**

1. **Conversion de devise** — le changement de devise modifie le symbole sans convertir.
   Aucun taux, aucune source de taux, aucun arrondi décrit.
2. **Prélèvement des récurrences** — les maquettes montrent la liste et ses états, pas le
   moment d'exécution : à l'ouverture de l'application, à date fixe, ou côté serveur.
3. **Récurrence en retard** — aucun écran ne montre une échéance passée sans prélèvement.
4. **Multi-comptes et transactions** — le sélecteur de compte existe, mais aucun lot ne
   montre le rattachement d'une transaction à un compte autre que l'actif.
5. **Transfert entre comptes** — ni écran ni geste. Ce n'est ni une dépense ni un revenu,
   donc hors du modèle actuel.
6. **Modification et historique** — les lots couvrent la création et la suppression.
   Modifier une transaction existante, et ce qu'il advient des soldes passés, reste à
   décider.
7. **Seuils de budget** — 75 % et 100 % sont lus dans le lot 4. Leur configurabilité par
   l'utilisateur n'est pas décrite.
8. **Suppression de compte** — la déconnexion est maquettée ; la suppression définitive et
   l'export des données ne le sont pas.

## Assets

Deux images, dans `design/assets/` :

- `nuit.jpg` — dégradé bleu nuit signature. Fond des écrans d'onboarding, de l'en-tête du
  tableau de bord et de la pastille de logo. À intégrer comme asset du bundle.
- `objectif-spheres.jpg` — fond du bandeau d'objectif du tableau de bord, sous un dégradé
  bleu superposé.

Toutes les icônes sont des SVG inline dans les maquettes, tracés à 1,7 px. Les remplacer par
la bibliothèque d'icônes du dépôt cible en conservant cette épaisseur de trait apparente.

## Files

Tout est dans `design/`. Les fichiers s'ouvrent directement dans un navigateur.

```
design/
  Swiftly - Documentation développeurs.dc.html   ← commencer ici
  Swiftly - Thème sombre.dc.html
  Swiftly - Passe de cohérence.dc.html
  Swiftly Design System.dc.html
  Swiftly - Lot 1 Onboarding.dc.html
  Swiftly - Lot 2 Core UI.dc.html
  Swiftly - Lot 3 Transactions.dc.html
  Swiftly - Lot 4 Statistiques.dc.html
  Swiftly - Lot 5 Transactions récurrentes.dc.html
  Swiftly - Lot 6 Projets.dc.html
  Swiftly - Lot 7 Comptes & Notifications.dc.html
  Swiftly - Lot 8 Privacy.dc.html
  Swiftly - Lot 9 Paramètres utilisateur.dc.html
  Swiftly - Lot 10 États système.dc.html
  support.js        ← outillage de la plateforme de design, à ignorer
  assets/
    nuit.jpg
    objectif-spheres.jpg
```
