# MIGRATION MULTI-ESPACES
## Prérequis bloquant avant la page « Applications » — Swiftly.io

**Destinataire :** Claude Code
**Nature :** refonte de fondation sur des données EN PRODUCTION
**Bloque :** FEATURE-APPS-PAGE (la page Applications ne peut pas être construite avant)
**Document lié :** MIGRATION-CONTROLES-VALIDATION.md (contrôles Go / No-Go)

---

## 1. POURQUOI CETTE MIGRATION

Le MVP en production ne connaît qu'un seul propriétaire de données : l'utilisateur.
Toutes les données financières sont rattachées à `user_id`.

Or toute l'architecture de la page Applications repose sur la notion d'**espace** :
les apps s'installent par espace, les permissions sont scopées par espace, l'isolation
des données se fait par espace.

Construire la page Applications avant cette migration signifierait bâtir tout le
système d'installation autour de `user_id`, puis tout réécrire. On construit une seule
fois, correctement.

**Bonne nouvelle :** les données actuellement en production sont **exclusivement
personnelles**. La migration est donc mécanique — un espace personnel par utilisateur,
tout y est rattaché. Aucun tri, aucune décision au cas par cas.

---

## 2. LE MODÈLE — VOCABULAIRE ET STOCKAGE

### ⚠️ Règle de vocabulaire — non négociable

> Le mot **« activité » est réservé au business.** Il ne désigne JAMAIS le Personnel,
> nulle part dans l'interface utilisateur.

### La séparation des deux couches

```
COUCHE TECHNIQUE (invisible)          COUCHE INTERFACE (visible)
─────────────────────────────         ──────────────────────────
ESPACE
├── type = personal            →      affiché « Personnel »
└── type = business            →      affiché « Activité »
```

Un seul mode de rangement en base : **tout se rattache à `space_id`**.
Une seule règle RLS, une seule logique d'isolation, une seule logique pour les apps.

Le terme `space` / `espace` est **technique uniquement**. Il n'apparaît jamais à
l'écran.

### Propriétés de l'espace personnel

- Créé automatiquement à l'inscription
- **Unique** par utilisateur — ni zéro, ni deux
- **Non supprimable**
- **Gratuit à vie** — aucun abonnement ne peut s'y rattacher
- La page Applications n'y est **jamais visible**

### Propriétés des espaces business

- Nombre **illimité**, création **gratuite**
- Seules les **applications installées** sont facturées
- Garde-fou : limite souple d'une dizaine d'espaces, **relevable sur simple demande**,
  plus un plafond de créations par jour (protection contre les scripts)
- La page Applications n'est visible **que** dans un espace de type `business`

---

## 3. PORTÉE — LES ESPACES APPARTIENNENT À L'ÉCOSYSTÈME

**Décision actée : la table des espaces se crée au niveau de l'écosystème, PAS à
l'intérieur de SwiftlyTrack.**

SwiftlyTrack est simplement le premier domaine à s'en servir, et le seul à afficher un
sélecteur pour l'instant. SwiftlyPay, SwiftlyMarket, SwiftlyBank et SwiftlyInvest s'y
brancheront quand leur tour viendra.

**Deux raisons :**

La vue consolidée du patrimoine doit rassembler ce qui vient de **tous** les domaines.
Si chaque domaine avait sa propre notion de séparation, cette vue serait impossible à
construire proprement.

Et le contraire coûterait très cher : il faudrait refaire le même travail — et une
nouvelle migration de production — dans chaque domaine.

### Cas concret déjà identifié — SwiftlyPay

SwiftlyPay aura **deux volets** :

| Volet | Rattachement | Usage |
|---|---|---|
| **Compte personnel** | espace `personal` | Envoyer et recevoir de l'argent |
| **Compte marchand** | espace `business` | Encaisser les paiements clients (QR code en boutique/restaurant) |

L'argent encaissé en boutique arrive **sur l'espace de la boutique**, jamais sur
l'espace personnel. L'utilisateur décide ensuite s'il vire cet argent vers son
compte personnel ou s'il le laisse dans l'entreprise.

⚠️ **Deux points à traiter au moment de SwiftlyPay, pas maintenant :**

1. Le virement marchand → personnel n'est **pas un transfert ordinaire**. C'est de
   l'argent qui sort de l'entreprise pour entrer dans le patrimoine personnel — un
   **prélèvement**. Traitement comptable distinct.
2. C'est le **premier cas concret** où le verrouillage de transactions construit au
   Day 11 sort de sa dormance : un client qui paie par QR pendant que le propriétaire
   fait un virement = deux écritures simultanées sur le même compte.

---

## 4. LA CONSOLIDATION — UN DROIT DU PROPRIÉTAIRE

Point d'architecture important, à ne pas confondre.

> **La consolidation appartient à l'utilisateur, pas à l'espace personnel.**

L'utilisateur possède tous ses espaces. Il a donc le droit natif de voir une vue
consolidée de tout ce qu'il possède. L'écran Personnel est simplement **l'endroit où
on lui affiche** cette vue.

```
❌ NE PAS FAIRE                        ✅ FAIRE

Donner à l'espace personnel le         La consolidation est un droit du
droit de lire les autres espaces       PROPRIÉTAIRE, au niveau utilisateur
                                        
→ crée une EXCEPTION dans le           → aucune exception dans le modèle
  modèle de permissions                   de permissions
→ une porte que quelqu'un              → les espaces business ne se voient
  finira par pousser                      JAMAIS entre eux
                                        → les apps restent enfermées dans
                                          leur espace
```

---

## 5. CE QUI DESCEND DANS L'ESPACE

### Règle : tout descend, sans exception

**Données financières** — évidence : comptes, transactions, budgets, projets, rapports,
alertes. Si l'argent de la boutique se mélangeait à l'argent personnel, toute la
promesse de clarté s'effondre.

**Données de référence** — catégories personnalisées, templates, **Personnes** :
elles descendent aussi.

**Pourquoi les Personnes descendent, alors que c'est tentant de les mutualiser :**

> Si les contacts étaient communs à tout le compte, une application installée dans la
> boutique pourrait lire les contacts personnels de l'utilisateur.

C'est exactement le trou fermé dans ARCHITECTURE-ISOLATION-PERMISSIONS.md. Une seule
exception au modèle et la porte est ouverte.

### La ressaisie se règle autrement

À la création d'un nouvel espace, proposer :

> « Voulez-vous reprendre vos catégories et vos templates depuis un autre espace ? »

Ce sont des **copies**, pas des liens. Chaque espace reste totalement indépendant
ensuite.

### Ce qui reste global

Uniquement ce que Swiftly.io fournit lui-même : les **catégories système** livrées avec
l'application, identiques pour tous les utilisateurs.

### Tables concernées

D'après le template RLS du Point 4, les tables aujourd'hui scopées à `user_id` :

```
accounts · transactions · budgets · projects
templates · people · alerts · reports
```

Plus `categories` (avec son `user_id` nullable pour les catégories système —
attention : les catégories système restent globales, seules les catégories
personnalisées descendent).

---

## 6. STRATÉGIE DE MIGRATION — 4 TEMPS

### Principe directeur

> **On ne remplace jamais une colonne, on en AJOUTE une.**

Tant que la nouvelle colonne n'est pas remplie et vérifiée, l'ancienne continue de
tout faire tourner. À aucun moment l'application ne se retrouve dans un état où elle
ne sait plus où chercher.

### Temps 1 — Ajout (aucun impact)

- Créer la table `spaces` au niveau écosystème
- Ajouter la colonne `space_id` sur toutes les tables concernées, **nullable, vide**
- L'application **ne la regarde pas encore**, elle continue exactement comme avant

**Impact utilisateur : zéro.**

### Temps 2 — Remplissage et vérification

- Créer un espace de type `personal` pour **chaque** utilisateur existant
- Remplir `space_id` sur toutes les lignes
- ▶️ **Exécuter les contrôles de MIGRATION-CONTROLES-VALIDATION.md**

C'est ici qu'on vérifie : aucune ligne oubliée, aucun compte rattaché au mauvais
propriétaire, totaux identiques avant et après.

### Temps 3 — Bascule

- L'application lit désormais `space_id`
- Réécrire les politiques RLS sur `space_id`
- Surveillance rapprochée (Sentry, logs)

**Retour arrière possible à tout moment** — l'ancienne colonne existe encore.

### Temps 4 — Nettoyage (différé)

- Passer `space_id` en NOT NULL
- Supprimer l'ancienne colonne `user_id` des tables concernées

⚠️ **Pas le lendemain.** Après **plusieurs semaines** de stabilité confirmée. Tant que
l'ancienne colonne existe, le retour arrière est immédiat. C'est ce qui rend
l'opération sûre.

---

## 7. ENVIRONNEMENT DE TEST — ACTION REQUISE

⚠️ **À vérifier par Elias avant de commencer.**

Repère : dans le tableau de bord Supabase, s'il n'y a qu'un seul projet dans
l'organisation, il n'y a qu'une seule base.

**S'il n'y a pas d'environnement de test séparé, en créer un avant toute chose.**
Supabase permet de dupliquer un projet. On répète la migration dessus jusqu'à ce
qu'elle passe sans erreur, puis on la joue en production.

C'est une demi-journée de mise en place qui protège d'un incident **irréversible** sur
les données réelles des utilisateurs.

---

## 8. EXPÉRIENCE UTILISATEUR LE JOUR DE LA BASCULE

### Décision : bascule silencieuse + annonce non bloquante

**L'interface ne change pas.**

- Pas de nouveau sélecteur d'espace tant qu'il n'y a qu'un seul espace
- Pas d'écran d'accueil, pas de tutoriel, rien qui bloque
- L'utilisateur qui ouvre son application pour noter une dépense ne remarque rien

**Mais on prévient quand même.**

Une notification dans la cloche, ou un message court : l'application peut désormais
gérer des activités séparées. L'utilisateur lit s'il veut, ferme, et retrouve son
application exactement comme il l'avait laissée.

### ⚠️ Ne PAS faire à ce moment-là

**Ne pas inviter à créer une activité pendant la migration.**

L'invitation viendra plus tard, séparément, **quand la page Applications sera prête**
et qu'il y aura vraiment quelque chose à proposer.

Mélanger les deux, c'est prendre le risque que l'utilisateur crée un espace vide, ne
comprenne pas à quoi il sert, et se fasse une mauvaise première impression de la
fonctionnalité qui doit devenir la source de revenus.

---

## 9. CYCLE DE VIE DES ESPACES

### Aucune suppression automatique

Un espace vide ne coûte rien et ne gêne personne. Supprimer automatiquement quelque
chose qu'un utilisateur a créé est le meilleur moyen de détruire la confiance —
surtout dans une application financière, surtout le jour où l'automatisme se trompe.

### Mais archivage et suppression manuels prévus dès la construction

| Situation | Comportement |
|---|---|
| **Espace vide** | Suppression directe, sans discussion |
| **Espace contenant des transactions** | Jamais supprimable d'un clic. Soit **archivage** (sort du sélecteur, données conservées, réactivable), soit suppression avec **confirmation forte + export préalable** |
| **Espace avec apps payantes** | ⚠️ L'**abonnement s'arrête au même moment**. Ne jamais facturer un espace que l'utilisateur croit avoir supprimé. |

---

## 10. RÉCAPITULATIF DES DÉCISIONS

1. Un seul mode de rangement en base : **`space_id` partout**
2. Vocabulaire UI : **« Personnel » et « Activité »** — « activité » ne désigne jamais le Personnel
3. Espace personnel : **auto-créé, unique, non supprimable, gratuit à vie**
4. Espaces business : **illimités et gratuits** ; seules les apps sont facturées
5. Garde-fou : limite souple ~10 espaces, relevable ; plafond de créations par jour
6. La page Applications n'est visible **que** dans un espace `business`
7. Les espaces sont définis **au niveau écosystème**, pas dans SwiftlyTrack
8. La **consolidation est un droit du propriétaire**, pas un privilège de l'espace personnel
9. **Tout descend dans l'espace** — y compris Personnes et templates ; copie proposée à la création
10. Seules les **catégories système** restent globales
11. Migration **additive en 4 temps**, retour arrière possible jusqu'au Temps 4
12. Bascule **silencieuse**, annonce **non bloquante**, aucune invitation à créer une activité
13. **Aucune suppression automatique** ; archivage et suppression manuels dès la construction
14. L'abonnement **s'arrête** avec l'espace

---

## 11. POINTS OUVERTS — À TRAITER PLUS TARD

- Traitement comptable du prélèvement marchand → personnel (au moment de SwiftlyPay)
- Design du sélecteur d'espace (n'apparaît qu'à partir du 2ᵉ espace)
- Modalités exactes de la demande de relèvement de la limite d'espaces
- Format d'export des données avant suppression d'un espace

---

*Prérequis bloquant — Feature « Applications » — Swiftly.io*
