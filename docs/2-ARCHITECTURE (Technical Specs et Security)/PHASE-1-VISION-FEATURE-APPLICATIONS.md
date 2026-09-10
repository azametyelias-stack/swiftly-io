# PHASE 1 — VISION & CONTEXTE
## Feature « Applications » — Swiftly.io

**Code interne :** FEATURE-APPS-PAGE
**Statut :** Phase 1 du FEATURE-ADDITION-FRAMEWORK — TERMINÉE
**Destinataire :** Claude Code
**Contexte :** Phase 2 du projet (post-MVP). Le MVP est en production depuis Day 30.

---

## ⚠️ À LIRE EN PREMIER — PRÉREQUIS BLOQUANT

**La page Applications ne peut pas être construite avant la migration multi-activités.**

Le MVP actuellement en production n'a ni la distinction Personnel / Business, ni la
possibilité d'avoir plusieurs activités séparées dans un même compte.

Or toute l'architecture de la page Applications repose sur l'entité **activité** :
les apps s'installent par activité, les permissions sont scopées par activité,
l'isolation des données se fait par activité.

```
ORDRE D'EXÉCUTION OBLIGATOIRE :

ÉTAPE A — Migration multi-activités
├─ Créer l'entité activité/entreprise
├─ Relation : 1 utilisateur → N activités
├─ Sélecteur d'activité dans l'interface
├─ Rattacher les données existantes (comptes, transactions, budgets) à une activité
└─ ⚠️ Migration sur données EN PRODUCTION → plan de rollback obligatoire

ÉTAPE B — Page Applications
└─ S'appuie entièrement sur A
```

**Note :** l'étape A touche à l'existant en production, pas à du neuf. Elle mérite
son propre passage dans le FEATURE-ADDITION-FRAMEWORK, séparément de ce document.

**Pourquoi c'est une bonne nouvelle de l'avoir découvert maintenant :** si la page
Applications avait été construite d'abord, tout le système d'installation aurait été
bâti autour de `user_id`, puis il aurait fallu tout réécrire pour passer à
`activity_id`. On construit une seule fois, correctement.

---

## Q1 — NOM & DESCRIPTION

| | |
|---|---|
| **Nom de la feature** | Applications |
| **Nature** | Une **page** dans SwiftlyTrack, au même niveau que Dashboard, Comptes, Transactions, Budget, Templates |
| **Ce que ce n'est PAS** | Ce n'est **pas** une nouvelle branche comme SwiftlyPay, SwiftlyBank ou SwiftlyMarket |
| **Code interne** | FEATURE-APPS-PAGE |
| **Description** | Page permettant à l'utilisateur d'activer des fonctions modulaires pour adapter Swiftly.io à son activité réelle |

### Vocabulaire dans l'interface — décision actée

**Ne jamais écrire « installer une application » dans l'UI destinée à l'utilisateur.**

Le concept « installer une app dans une app » n'est pas évident pour quelqu'un qui n'a
jamais utilisé d'ERP. Formulation retenue :

> « Activer une fonction pour mon activité »

Le vocabulaire technique (`install`, `app`, `module`) reste dans le code, la base de
données et la documentation développeur. Il ne remonte jamais à l'écran utilisateur.

---

## Q2 — POURQUOI CETTE FEATURE

### Philosophie fondatrice de Swiftly.io

> « Du chaos à la clarté financière. »

Permettre à n'importe qui d'avoir une vision globale de sa vie financière, en
centralisant vie personnelle (SwiftTrack Personnel) et activité professionnelle
(SwiftTrack Business) au même endroit, sur une même base de données.

### Le problème identifié sur le terrain

L'approche initiale était de créer **une section par domaine d'activité**.
Observation faite sur le marché réel (Lomé) : les types d'activité sont innombrables
et tous différents.

```
Boutiquiers · Restaurants · Coiffeurs · Tailleurs · Prestataires de service
E-commerce · Pharmacies · Quincailleries · Ateliers · … + 100 autres
```

Créer une section dédiée pour chacun = liste infinie, impossible à maintenir.
C'est un mur de scalabilité, pas un problème de rigueur.

### La solution : l'écosystème modulaire

```
Base de données unique et centralisée
        │
        ├── SwiftTrack Personnel   (vie personnelle)
        ├── SwiftTrack Business    (activité professionnelle)
        └── Page Applications      ← chacun active ce dont il a besoin
                                     = sa version personnalisée de Swiftly.io
```

### Inspiration assumée : Odoo

Odoo = ERP cœur + modules installables. Le client compose sa solution.

Swiftly.io reprend le modèle et l'adapte **aux réalités africaines** : connectivité
instable, devises locales, WhatsApp comme canal commercial dominant, tickets moyens
faibles. Ce n'est pas un copier-coller d'une solution européenne.

### Ce que ça apporte

| Axe | Bénéfice |
|---|---|
| **Scalabilité** | Plus d'explosion de sections à maintenir |
| **Flexibilité** | Chacun compose selon son activité réelle |
| **Centralisation** | Tout au même endroit, une seule base |
| **Rétention** | Le client n'a plus besoin d'aller chercher un outil ailleurs |
| **Monétisation** | Les apps deviennent des produits |
| **Différenciation** | Adapté au terrain africain, là où les solutions étrangères échouent |

### Timing

Le MVP est testé et en production, l'architecture de sécurité est solide
(20 points de sécurité livrés), les fondations Payment / Input / Transactions
existent. La plateforme est prête à devenir extensible.

---

## Q3 — BRANCHES IMPACTÉES

La page **vit dans SwiftlyTrack**, mais les apps qu'on y active peuvent impacter
n'importe quelle branche. C'est un système **transversal**.

| Branche | Niveau | Nature de l'impact |
|---|---|---|
| **SwiftlyTrack** | CRITIQUE | Héberge la page. Doit être modifié dans tous les cas. |
| **SwiftlyMarket** | ÉLEVÉ | Apps e-commerce / site web / boutique en ligne |
| **SwiftlyPay** | MOYEN | Apps de paiement avancé, nouveaux moyens de paiement |
| **SwiftlyBank** | MOYEN | Apps de comptabilité, rapprochement, audit |
| **SwiftlyInvest** | FAIBLE | Selon les apps d'investissement qui existeront |

**Exemples concrets :**

```
App « Site web / Boutique en ligne »
└─ Activée depuis : SwiftTrack → Applications
└─ Impacte      : SwiftlyMarket + SwiftlyPay

App « Comptabilité »
└─ Activée depuis : SwiftTrack → Applications
└─ Impacte      : SwiftlyBank + SwiftlyTrack

App « Suivi de dépenses enrichi »
└─ Activée depuis : SwiftTrack → Applications
└─ Impacte      : SwiftlyTrack uniquement
```

**Rétrocompatibilité :** totale. Les apps sont optionnelles ; un utilisateur qui
n'en active aucune garde exactement le comportement actuel.

---

## Q4 — PÉRIMÈTRE

### Principe directeur

> **Construire toute la fondation dès le départ, même si certaines parties restent
> dormantes.**

C'est la même logique que celle appliquée aux 20 points de sécurité : structure prête,
activation plus tard, zéro réécriture. Ce qui est un choix d'architecture ne peut pas
être ajouté après coup sans tout casser.

### Fonctionnalités de la page — toutes prévues dans la fondation

**Cœur**
- Liste des apps disponibles
- Bouton d'activation par app
- Page détail d'une app (description, spécifications, captures)
- Gestion des apps activées (voir, désactiver, désinstaller)
- Statut : disponible / activée
- Recherche et filtres
- Système de mise à jour des apps

**Confiance**
- Notes et avis
- Réponse du développeur aux avis

**Monétisation**
- Tarification et paiement des apps payantes
- Marketplace (les développeurs publient et vendent) — dormant au lancement

**Contrôle**
- Système d'autorisations — **actif dès le départ**, pas dormant (voir doc dédié)

**Avancé**
- Automatisations IA adaptées aux réalités locales
- Intégrations réseaux sociaux (WhatsApp prioritaire, TikTok à explorer)

### Les 12 exigences complémentaires — classement

**🔴 NON NÉGOCIABLES — à construire en dur maintenant**

Ce sont des choix d'architecture. Les ajouter après = tout réécrire.

| # | Exigence | Sans elle |
|---|---|---|
| 1 | **Isolation des données & permissions** | Risque n°1 de la plateforme. Une app mal codée ou malveillante lit et fuite les données financières de tous les utilisateurs. Pour une fintech = fin de partie. **→ Document dédié** |
| 2 | **Rollback (désactiver / revenir en arrière)** | Un boutiquier perd sa journée de vente parce qu'une app a bloqué sa caisse, sans bouton de retour. Intervention manuelle en base, multipliée par le nombre d'utilisateurs. |
| 3 | **Versions & dépendances** | Une mise à jour casse les données de centaines d'activités d'un coup. Ou une app plante parce que sa dépendance n'est pas là. |
| 4 | **Fonctionnement hors ligne** | C'est **l'avantage africain**. Une boutique à Lomé ou Kara n'a pas internet stable. Si la caisse s'arrête quand la connexion coupe, l'app est inutilisable — et c'est exactement là que les solutions étrangères échouent. |

**🟡 STRUCTURE PRÊTE — activation plus tard**

| # | Exigence | Pourquoi la prévoir maintenant |
|---|---|---|
| 5 | **Modèles de tarification flexibles** | Gratuit, achat unique, abonnement, freemium, à l'usage. Ajouter l'abonnement six mois après = réécriture complète de la facturation. |
| 6 | **Dashboard développeur** | Sans lui, Elias est le goulot d'étranglement permanent. C'est le problème des sections qui revient par la porte de derrière. |
| 7 | **Notes & avis** | Crée la confiance sans tout garantir soi-même. Filtre naturel de qualité à l'ouverture externe. |
| 8 | **Multi-langue & devises** | XOF, NGN, GHS, GNF. Sans ça, chaque nouveau pays devient un projet de développement au lieu d'un paramètre. |

**🟢 PEUVENT VENIR APRÈS — sans casser la fondation**

| # | Exigence | Impact de l'absence |
|---|---|---|
| 9 | **Analytics & tracking** | Développement à l'aveugle : 3 semaines sur une app que personne n'utilise pendant que 80 % réclament autre chose. |
| 10 | **Support & communication** | Les utilisateurs partent en silence, sans qu'on sache pourquoi. Coûteux là où la confiance se construit au bouche-à-oreille. |
| 11 | **Moteur de recommandations** | Les gens regardent 15 apps, ne comprennent pas, n'activent rien. L'adoption s'effondre. |
| 12 | **Sauvegarde & restauration** | Pour une app de gestion financière, la perte de données est la faute la plus impardonnable. |

---

## Q5 — MODÈLE DE DONNÉES

### Nouvelles entités

| Entité | Rôle |
|---|---|
| **Registre des applications** | Fiche de chaque app : nom, description, icône, catégorie, développeur, version, prix, statut de publication |
| **Installations** | Qui a activé quoi, quand, en quelle version, actif ou désactivé — **clé = `activity_id`** |
| **Permissions accordées** | Quelle app accède à quoi, pour quelle activité, avec trace du consentement |
| **Dépendances** | Quelle app requiert quelle autre, en quelle version minimum |
| **Avis** | Notes, commentaires, réponses développeur |
| **Transactions d'achat** | Facturation des apps payantes |

### Entités modifiées

- **Utilisateur / Activité** : doit connaître les apps actives pour cette activité
- **Schéma core (Day 9)** : doit prévoir la place des espaces de données par app

### Règle d'isolation

```
Clé d'isolation partout : (activity_id, app_id)
```

---

## Q6 — PERSONAS

**Décision : une app s'installe par ACTIVITÉ, pas par utilisateur.**

Un compte avec une boutique et un restaurant active l'app POS séparément pour chacune.
Sinon le stock de tissu et les ventes de plats se mélangent dans la même base, et le
chiffre d'affaires global ne veut plus rien dire.

| Persona | Statut au lancement | Droits |
|---|---|---|
| **Propriétaire d'activité** | ✅ ACTIF | Tous les droits sur son activité : activer, désactiver, payer, accorder les permissions |
| **Employé** | 🟡 DORMANT | Accès limité à certaines apps. Ni activation, ni paiement. |
| **Développeur d'application** | 🟡 DORMANT | Publie et met à jour des apps. C'est Elias seul au début. |
| **Administrateur plateforme** | 🟡 DORMANT | Valide, retire, arbitre. C'est Elias aussi au début. |

**Le champ `role` existe dès la première migration**, même si un seul rôle est livré.

⚠️ **Règle à graver dès maintenant :** développeur et administrateur doivent rester
deux rôles distincts en base, même si c'est la même personne aujourd'hui. Le jour de
l'ouverture externe, **un développeur ne doit jamais pouvoir approuver sa propre app.**

---

## Q7 — MÉTRIQUES DE SUCCÈS

### Adoption — cible 75 %

75 % des utilisateurs ayant une activité activent au moins une app.

Cible volontairement haute et assumée : la page Applications **est le moteur**.
Quelqu'un qui veut gérer son activité y passe forcément. Ce n'est pas une option
décorative, c'est le point d'entrée.

### 🎯 Métrique reine — rétention à 30 jours, cible 60 %

C'est la métrique qui décide. Installer est facile, utiliser tous les jours est autre
chose. **Sous 60 %, c'est un échec et il faut changer d'approche.**

### Définition de « actif » — validée, non négociable

> Une app est **active** si elle a enregistré **au moins une action métier dans les
> 7 derniers jours.**

Une action métier = une vente enregistrée dans POS, un produit ajouté dans
l'Inventaire. **Pas** la simple ouverture de l'écran, **pas** la simple présence de
l'app installée.

**Pourquoi c'est capital :** avec « installée et pas désinstallée », le chiffre affiche
90 % et donne l'illusion que tout va bien. Avec la vraie définition, il affiche
peut-être 35 % — et c'est le seul chiffre qui dit la vérité.

**⚙️ Conséquence directe sur la construction :**

```
CHAQUE app doit remonter un événement « action métier effectuée » à la plateforme.

→ 2 lignes de code par app si prévu dès la conception
→ Chantier pénible et rétroactif si ajouté après
→ À intégrer dans le SDK / template d'app dès le premier jour
```

---

## Q8 — TIMELINE

**Aucune date imposée. Priorité absolue à la qualité de la fondation.**

Décision d'Elias : faire les choses correctement, voir tous les points probables,
construire la fondation solide. Les quatre fondations non négociables sont
précisément ce qu'on bâcle sous pression et qu'on regrette pendant deux ans.

**Contrainte réelle :** ce n'est pas le temps, c'est la disponibilité d'Elias entre
Swiftly.io, PrintManager et le freelance Canva.

**Approche retenue :** progression **par jalons livrables**, pas par dates
calendaires. Chaque jalon terminé et testé avant de passer au suivant.
Le découpage détaillé se fera en Phase 8.

**Repères d'ordre de grandeur (pas des engagements) :**

```
Migration multi-activités (données en prod)   ~1-2 semaines
Page Applications + fondation complète        ~3-4 semaines
Chaque app individuelle                       ~1-2 semaines
```

La fondation est plus lourde que la page visible. C'est normal.

---

## Q9 — BUDGET & RESSOURCES

**Développement :** Elias seul avec Claude Code. Pas de recrutement à ce stade.

**Infrastructure :** montée en gamme progressive. On commence au plus petit palier et
on monte selon le besoin réel.

**⚙️ Contrainte d'architecture qui en découle :**

> L'architecture doit supporter le passage d'un palier à l'autre **sans réécriture.**
> Ne jamais dépendre d'une fonctionnalité qui n'existe qu'en Pro pour faire tourner la base.

Le Point 20 (sauvegardes) est le modèle : les scripts existent déjà, ils s'activent au
passage en Pro, rien à recoder.

**Pour l'IA :** faire passer les automatisations par une **couche d'abstraction** dès
le départ, pour pouvoir changer de modèle ou de fournisseur quand les coûts montent,
sans toucher au reste du code.

---

## Q10 — DÉPENDANCES EXTERNES

| Dépendance | Criticité | Remarque |
|---|---|---|
| **Migration multi-activités** | 🔴 BLOQUANTE | Interne. Rien ne commence avant. |
| **Supabase** | Critique | Base, isolation, RLS |
| **Paystack** | Important | Paiement des apps |
| **Fournisseur IA** | Important | Automatisations — passer par une abstraction |
| **WhatsApp Business API** | Moyen | Prioritaire pour le marché |
| **TikTok API** | Faible | À explorer, disponibilité incertaine |

### WhatsApp — priorité n°1

Canal commercial dominant en Afrique de l'Ouest, bien devant Facebook et Instagram.

⚠️ **Chantier administratif à lancer très en avance :** l'accès demande une
vérification d'entreprise auprès de Meta (documents légaux, numéro dédié, validation
des modèles de messages). Cela peut prendre des semaines. Coût par conversation.

### TikTok — à explorer, pas à tenir pour acquis

Les API commerciales sont moins matures et leur disponibilité varie fortement selon
les pays. **Vérifier ce qui est réellement accessible depuis le Togo avant de
concevoir quoi que ce soit autour.**

### 🔴 Règle absolue

> **Aucune app ne doit dépendre entièrement d'un réseau social pour fonctionner.**

L'intégration **enrichit**, elle ne **porte** pas. Une app de gestion de commandes doit
marcher même si WhatsApp est coupé. C'est une dépendance **optionnelle** au sens
défini dans le document d'architecture, et c'est cohérent avec le fonctionnement
hors ligne.

---

## Q11 — RISQUES & PARADES

### Risque 1 — Complexité perçue

**Le risque :** le concept « installer une application dans une application » n'est pas
évident pour quelqu'un qui n'a jamais utilisé d'ERP. Les gens regardent, ne comprennent
pas, n'activent rien. L'adoption visée de 75 % tombe à 10 %.

Ce risque ne se règle **pas** en codant mieux. Il se règle en présentant autrement.

**Parades actées :**
- Vocabulaire UI : « activer une fonction pour mon activité », jamais « installer une app »
- Pré-activer d'office les 2-3 apps essentielles à la création d'une activité boutique,
  pour que la personne découvre le concept **après** avoir vu que ça marche déjà

### Risque 2 — Goulot d'étranglement

**Le risque :** tant qu'Elias est seul à coder les apps, chaque segment de marché
attend son tour. C'est exactement le problème des sections qui revient déguisé.
50 activités × 5 apps = 250 apps impossibles à coder seul.

**Parade actée — déclencheur précis :**

```
À 1 000 utilisateurs → ouverture du studio + recrutement d'un développeur
```

**⚙️ Conséquence sur la construction :** le dashboard développeur doit être **structuré
maintenant**, même dormant. Le jour du recrutement, on active — on ne recode pas.

### Risque 3 — Démotivation face au travail invisible

**Le risque :** isolation, permissions, versions, hors ligne — des semaines de travail
sans que rien de visible n'apparaisse à l'écran.

**Position d'Elias :** « je construis la fondation, même si ça prend du temps. »
Décision assumée et respectée.

**Recommandation maintenue (à trancher en Phase 8) :** découper en jalons visibles,
non pas pour raccourcir la fondation, mais pour pouvoir mesurer la progression pendant
qu'on la construit. Exemple : « jalon 1 — j'active une app factice et elle apparaît
dans ma liste » donne un résultat visible en quelques jours, même si l'app ne fait rien.

---

## Q12 — CRITÈRES GO / NO-GO

À vérifier **avant** l'ouverture aux utilisateurs. Différent des métriques de succès,
qui mesurent **après**.

### ✅ Conditions techniques

- [ ] Migration multi-activités terminée et **vérifiée sur les comptes existants**
- [ ] Isolation des données testée : une app **ne peut pas** lire les données d'une autre activité
- [ ] Rollback fonctionnel : désactiver une app ne casse rien
- [ ] Au moins **une app réelle et complète** disponible — pas une coquille vide

### ✅ Conditions produit

- [ ] Écran de consentement compréhensible par une personne non technique
- [ ] Parcours d'activation testé avec **au moins un vrai boutiquier** avant l'ouverture générale

### ✅ Conditions opérationnelles

- [ ] Moyen de contacter le support en cas de problème
- [ ] Procédure définie si une app casse quelque chose en production

### 🛑 Déclencheurs de NO-GO

| Condition | Décision |
|---|---|
| **L'isolation fuit** | Rédhibitoire. **On ne lance pas.** |
| **La migration a fait perdre des données** à des utilisateurs existants | On ne lance pas. On répare d'abord. |
| **Personne ne comprend le concept** lors du test avec de vrais utilisateurs | On ne lance pas. On revoit la présentation. |

---

## RÉCAPITULATIF DES DÉCISIONS ACTÉES EN PHASE 1

1. « Applications » est une **page** dans SwiftlyTrack, pas une branche
2. Vocabulaire UI : **« activer une fonction »**, jamais « installer une app »
3. Installation **par activité**, jamais par utilisateur
4. Facturation **par activité**, avec **tarif dégressif dès la 2ᵉ installation**
5. **4 fondations non négociables** : isolation, rollback, versions, hors ligne
6. **4 personas** en base, **1 seul actif** au lancement
7. Développeur ≠ administrateur, **toujours séparés en base**
8. « Actif » = **au moins une action métier sur 7 jours**, remontée par chaque app
9. Métrique reine : **rétention 30 jours ≥ 60 %**
10. **Pas de date imposée** — progression par jalons livrables
11. **Aucune app ne dépend entièrement d'un réseau social**
12. Migration multi-activités = **prérequis bloquant**, à traiter séparément

---

## PROCHAINES ÉTAPES

- ➡️ Lire le document **ARCHITECTURE-ISOLATION-PERMISSIONS.md** (fondation n°1)
- ➡️ Traiter la **migration multi-activités** dans son propre passage du framework
- ➡️ Phase 2 du framework : Impact Produit Existant (18 questions)

---

*Phase 1 du SWIFTLY-IO-FEATURE-ADDITION-FRAMEWORK — terminée*
