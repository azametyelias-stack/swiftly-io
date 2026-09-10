# DÉCISIONS — MIGRATION MULTI-ESPACES

**Tranchées par :** Elias, le 10 septembre 2026
**Documents parents :** [`MIGRATION-MULTI-ESPACES.md`](./MIGRATION-MULTI-ESPACES.md) · [`MIGRATION-CONTROLES-VALIDATION.md`](./MIGRATION-CONTROLES-VALIDATION.md)
**Nature :** neuf arbitrages d'architecture, pris avant la première ligne de code

---

## POURQUOI CE DOCUMENT EXISTE

Les deux documents parents décrivent le modèle d'espaces et les contrôles Go /
No-Go. Ils ne disaient rien de neuf points que la relecture du schéma existant a
fait remonter — des trous qui ne se voient pas depuis le modèle, seulement depuis
le code déjà écrit : des contraintes d'unicité cadrées sur l'utilisateur, deux
fonctions SQL qui traversent `user_id` à l'intérieur, une colonne générée qui
disparaîtrait avec la colonne dont elle dérive.

Chaque section ci-dessous suit la même forme : **le problème**, **la décision**,
**ce qui casse si on la change**. La dernière ligne est la plus utile le jour où
quelqu'un — dans six mois, peut-être Elias lui-même — se demandera pourquoi ça a
été fait comme ça.

> Une décision d'architecture non écrite est une décision qui sera reprise par
> accident.

---

# A — L'ESPACE ACTIF VIENT D'UN EN-TÊTE `X-Space-Id`

## Le problème

Aujourd'hui, `authenticate()` rend un `user.id` et c'est le seul cadrage qui
existe. `assertOwnership()` (`lib/auth/guard.ts`) compare `resource.user_id ===
user.id`.

Remplacer la colonne par `space_id` sans rien d'autre rend le **test B du
contrôle 4 mathématiquement impossible à passer** : les deux espaces de Koffi lui
appartiennent tous les deux, donc toute vérification cadrée sur l'utilisateur les
laisse passer l'un et l'autre. Une app installée dans la boutique lirait le
restaurant, et la fondation n°1 de la page Applications ne tiendrait plus.

Autrement dit : la propriété ne suffit pas à isoler. Il faut savoir **dans quel
espace la requête se place**, et cette information ne peut venir que de la
requête elle-même.

## La décision

L'espace actif est porté par un en-tête HTTP **`X-Space-Id`**, vérifié côté
serveur au goulot — les neuf `lib/*/service.ts` plus les quatre routes qui
cadrent encore en direct. Le serveur vérifie que l'espace demandé appartient bien
à l'appelant ; il ne fait jamais confiance à l'en-tête sur parole.

Il y a **deux modes de lecture**, jamais un seul :

| mode | portée | quand |
|---|---|---|
| espace courant | `space_id = <en-tête>` | défaut, partout |
| **consolidé** | tous les espaces du propriétaire | **explicite**, jamais par défaut |

Le mode consolidé est le droit du propriétaire (décision 8 du document parent).
Qu'il soit explicite est ce qui l'empêche de devenir une fuite par distraction.

## Ce qui casse si on la change

Mettre l'espace dans l'URL à la place marcherait aussi, mais réécrit les 26
routes et toutes les URL clientes. Le mettre dans une claim de session interdit
d'avoir deux onglets sur deux espaces différents.

Le faire **par défaut consolidé** est le seul choix vraiment dangereux : chaque
oubli de cadrage devient silencieusement une fuite inter-espaces, au lieu d'une
erreur visible. C'est la porte que le document parent décrit comme « celle que
quelqu'un finira par pousser ».

**Cohérence :** c'est le même principe que la couche d'accès unique du §7.2 de
[`ARCHITECTURE-ISOLATION-PERMISSIONS.md`](./ARCHITECTURE-ISOLATION-PERMISSIONS.md)
— un seul point de passage, impossible à contourner, sur le modèle de
`lib/env/server.ts`.

---

# B — LES TROIS CONTRAINTES D'UNICITÉ PASSENT « PAR ESPACE »

## Le problème

Trois contraintes du schéma actuel sont cadrées sur l'utilisateur. Elles sont
correctes tant qu'un utilisateur n'a qu'un espace, et fausses à la seconde près
où il en a deux :

| contrainte | aujourd'hui | au 2ᵉ espace |
|---|---|---|
| `accounts_one_primary_per_user` (`0002:101`) | un compte principal par **utilisateur** | la boutique ne peut pas avoir de compte principal |
| `budgets unique (user_id, category_id)` (`0002:360`) | un budget par catégorie et par utilisateur | impossible de budgéter « Transport » dans deux espaces |
| `reports unique (user_id, period_type, period_start)` (`0002:422`) | un rapport mensuel par utilisateur | le rapport du restaurant écrase celui de la boutique |

Le piège est le calendrier : elles **échouent bruyamment**, ce qui est le bon
comportement, mais elles échouent *après* que la migration a été déclarée
réussie. Au moment des contrôles, personne n'a deux espaces.

## La décision

Les trois passent de « par utilisateur » à « par espace ». À vérifier avec un
utilisateur qui a **deux espaces réels dans le semis** — pas en théorie.

## Ce qui casse si on la change

Les laisser telles quelles rend la création du deuxième espace impossible pour
`accounts`, et silencieusement destructrice pour `reports` : le cron écrase le
rapport d'un espace avec celui d'un autre, chaque mois, sans erreur.

`alerts_dedup_key_uq` et `transactions_recurrence_key_uq` ne sont **pas**
concernées : leurs clés dérivent d'ids de budget et de template, déjà uniques par
espace. Les toucher serait du travail inutile.

---

# C — CHAQUE ESPACE A SON PROPRE COMPTE PRINCIPAL

## Le problème

Deux fonctions SQL portent la logique `user_id` **à l'intérieur** :

- `public.account_balance()` (réécrite en `0004:74`) nette les allocations de
  projet contre les dépenses liées à un projet, en passant par le compte
  principal de l'utilisateur.
- `public.allocate_to_project()` (`0004:137`) résout le compte à débiter de la
  même façon.

Sous multi-espaces, la première nette **à travers tous les espaces du
propriétaire**, et la seconde peut déplacer de l'argent vers le compte principal
du mauvais espace. L'application marche, les écrans s'affichent, et les chiffres
sont faux.

C'est exactement le scénario que le contrôle 2 décrit comme le pire possible —
et c'est un scénario que le contrôle 2, joué le jour de la bascule, ne peut pas
attraper : à ce moment-là chaque utilisateur n'a qu'un espace, donc le résultat
est le même dans les deux modèles.

## La décision

Confirmé : **chaque espace a son propre compte principal.** Les deux fonctions
sont réécrites en conséquence.

Test exigé, littéralement : *un projet en boutique ne puise jamais dans le compte
personnel.*

## Ce qui casse si on la change

Un compte principal unique par utilisateur signifie que l'argent d'un projet de
la boutique sort du compte personnel. Dans une application dont la promesse est
« l'argent de la boutique ne se mélange pas à l'argent personnel », c'est la
promesse elle-même qui tombe — et elle tombe sans message d'erreur.

**Comment on le prouve :** `scripts/db/check-espaces.ts` mesure
`account_balance()` compte par compte **avant** et **après** la migration. Un
solde qui bouge d'un seul XOF fait échouer le contrôle 2.

---

# E — `is_system` DEVIENT UNE VRAIE COLONNE

## Le problème

`categories.is_system` est aujourd'hui une colonne **générée** :

```sql
is_system boolean generated always as (user_id is null) stored   -- 0002:133
```

Au Temps 4, supprimer `user_id` emporte cette colonne avec elle, et la politique
RLS `user_id is null or auth.uid() = user_id` avec. Une colonne dérivée d'une
colonne qu'on supprime est une bombe à retardement calée sur le calendrier de
nettoyage — c'est-à-dire sur le moment où plus personne ne pense à la migration.

Second effet, distinct : la « copie proposée à la création » d'un espace duplique
les catégories personnalisées. Deux espaces auront donc deux lignes « Transport »
avec des **ids différents**.

## La décision

**`is_system` devient une vraie colonne booléenne**, écrite une fois pour toutes
au moment de l'insertion, jamais recalculée.

Et la vue patrimoine consolidée **regroupe les catégories par nom, pas par id**.

## Ce qui casse si on la change

Garder la colonne générée revient à programmer une panne au Temps 4, plusieurs
semaines après la bascule, quand le lien de cause à effet ne sera plus évident
pour personne.

Regrouper la vue consolidée par id afficherait deux catégories « Transport » côte
à côte dans le patrimoine — un défaut visible, mineur, mais qui décrédibilise
précisément l'écran censé donner la vue d'ensemble.

---

# F — LES INDEX SONT CRÉÉS AU TEMPS 1

## Le problème

Chaque politique RLS est aujourd'hui `auth.uid() = user_id` sur une colonne
indexée. Une fois `user_id` supprimée, le chemin vers l'utilisateur passe par
`core.spaces.owner_id`, donc chaque politique devient une sous-requête :

```sql
space_id in (select id from core.spaces where owner_id = auth.uid())
```

Sans index sur `space_id`, cette sous-requête s'exécute sur chaque ligne de
chaque table, à chaque requête. Les index concernés doublent des index existants
qui portent aujourd'hui `user_id` : `transactions_user_date_idx`,
`alerts_user_unread_idx`, `reports_user_idx`, et les `*_user_id_idx`.

## La décision

Les index `space_id` sont créés **au Temps 1**, en même temps que l'ajout de
colonne — pas au Temps 4. Transactions, alertes, rapports en priorité.

## Ce qui casse si on la change

Créer un index sur une table déjà chargée, en production, est une opération
coûteuse et bruyante. La faire au Temps 1 la rend gratuite : la colonne est vide,
l'index se construit instantanément, et personne ne la lit encore.

Repousser au Temps 4, c'est choisir de payer l'opération au pire moment — après
la bascule, sur des tables pleines, pendant que les utilisateurs lisent.

---

# G — UN SCHÉMA POSTGRES SÉPARÉ : `core`

## Le problème

Le document parent acte que les espaces appartiennent à l'écosystème, pas à
SwiftlyTrack : la vue patrimoine consolidée doit rassembler ce qui vient de tous
les domaines, et refaire une migration de production par domaine coûterait
beaucoup plus cher.

Mais concrètement, il n'y a aujourd'hui qu'une base — le projet Supabase de
SwiftlyTrack. Créer `spaces` dans `public`, à côté de `transactions` et
`budgets`, ne rend la frontière visible nulle part. Elle n'existerait que dans la
tête de celui qui a lu le document.

## La décision

Un schéma Postgres séparé : **`core`**. `core.spaces` aujourd'hui, et les futures
tables d'écosystème ensuite.

## Ce qui casse si on la change

Rien, tout de suite. Beaucoup, quand SwiftlyPay arrive : une table d'écosystème
noyée dans les 12 tables applicatives de SwiftlyTrack devient une table
SwiftlyTrack par habitude, et le jour où un deuxième domaine la lit, plus
personne ne sait qui a le droit de la modifier.

C'est un coût payé maintenant contre un bénéfice encaissé plus tard — assumé
comme tel : *« ça nous coûte maintenant, ça nous rapportera quand SwiftlyPay
arrive. »*

**Note :** `core.spaces.owner_id` référence `auth.users`, donc la table reste
attachée à l'auth de ce projet Supabase. C'est ce que « écosystème » veut dire en
pratique tant qu'il n'y a qu'une base.

---

# H — L'ESPACE PERSONNEL EST CRÉÉ PAR TRIGGER, JAMAIS EN BEST EFFORT

## Le problème

Le contrôle 3 exige que la création automatique fonctionne aussi pour les
**nouveaux** inscrits, après la migration.

Or il existe déjà un précédent dans le code, et il est mauvais. Le compte
principal est créé dans `app/api/auth/profile/route.ts` en *best effort* : le
handler avale un `23505` et se contente de journaliser en cas d'échec.

Si l'espace personnel suit ce motif, un insert raté laisse un utilisateur à
**zéro espace** — le pire cas du contrôle 3, arrivant après que la migration a
été validée, sur un utilisateur inscrit la semaine suivante.

Ce n'est pas hypothétique : `check-espaces.ts` signale déjà, sur la base
courante, les comptes `auth.users` sans ligne `public.users`. C'est le même
défaut, une couche plus bas.

## La décision

L'espace personnel est créé **par un trigger sur `auth.users`**, ou dans la
**même transaction** que l'upsert du profil. Jamais en best effort.

## Ce qui casse si on la change

Un utilisateur sans espace ouvre l'application et **ne voit rien**. Ses données
existent, mais ne sont rattachées à aucun conteneur affichable. Le document de
contrôles classe ce cas en retour arrière immédiat — sauf qu'ici il n'y a rien à
annuler : la migration était bonne, c'est l'inscription qui a échoué.

Un défaut best effort ne se détecte pas au moment où il se produit. Il se
détecte quand l'utilisateur écrit au support.

---

# I — LA MIGRATION DE RETOUR EST ÉCRITE AVEC CELLE DE L'ALLER

## Le problème

Les deux documents parents répètent que le retour arrière est immédiat tant que
l'ancienne colonne existe. **C'est vrai pour les données. Ça ne l'est pas pour le
reste.**

Revenir du Temps 3 veut dire redéployer l'application *et* réécrire les
politiques RLS en sens inverse. Or le dépôt n'a aucune notion de *down* :
`schema_migrations` ne connaît que l'avant, et `migrate.ts` ne joue que vers
l'avant.

Le jour où il faut revenir, on est par définition dans le pire moment pour écrire
du SQL : quelque chose vient de casser en production, et l'horloge tourne.

## La décision

La migration de retour du Temps 3 est **écrite et testée en même temps que celle
de l'aller**. Numérotée, jouée sur la dev, gardée prête. Jamais appliquée en
routine.

## Ce qui casse si on la change

Sans elle, « retour arrière immédiat » est une formule, pas une procédure. Le
document de contrôles fait reposer toute sa sécurité sur cette possibilité — si
elle n'existe que sur le papier, les quatre contrôles perdent leur sanction et
deviennent des observations.

---

# J — GRAPHIFY EST LE CHEMIN OFFICIEL DE LA DOCUMENTATION

## Le problème

Les quatre documents de la feature Applications vivaient à la racine du dépôt, à
côté du code. Deux d'entre eux référençaient les deux autres par leur nom sans
que ceux-ci soient présents — les liens pointaient dans le vide.

## La décision

Les quatre sont rangés dans `docs/2-ARCHITECTURE (Technical Specs et Security)/`
et indexés dans le README du dossier. **Graphify est le seul chemin officiel**
pour les consulter et les mettre à jour ensuite : `graphify query`,
`graphify explain`, `graphify path`, et `graphify update` après toute
modification.

## Ce qui casse si on la change

Un document rangé hors du graphe n'est pas trouvé au moment où il compte. Le cas
s'est déjà produit : l'analyse initiale de la migration a été faite sans
`ARCHITECTURE-ISOLATION-PERMISSIONS.md`, alors que ce document définissait
précisément le modèle de permissions que le contrôle 4 est censé juger.

---

# ⚠️ NOTE DE VOCABULAIRE

`ARCHITECTURE-ISOLATION-PERMISSIONS.md` et
`PHASE-1-VISION-FEATURE-APPLICATIONS.md` ont été écrits **avant**
`MIGRATION-MULTI-ESPACES.md` et parlent d'`activity_id`, y compris pour la clé
d'isolation des apps.

La décision plus récente prévaut :

| couche | terme |
|---|---|
| base de données | **`space_id`**, toujours |
| interface, espace `personal` | « Personnel » |
| interface, espace `business` | « Activité » |

La clé d'isolation des apps se lit donc **`(space_id, app_id)`**, et « une app
s'installe par activité » veut dire **par espace `business`** — la page
Applications n'est jamais visible dans l'espace personnel.

---

# RÉCAPITULATIF

| # | Décision | Résout |
|---|---|---|
| **A** | En-tête `X-Space-Id` au goulot + mode consolidé explicite | La propriété ne suffit pas à isoler deux espaces d'un même propriétaire |
| **B** | Les 3 contraintes d'unicité passent « par espace » | Elles cassent au 2ᵉ espace, après la validation de la migration |
| **C** | Un compte principal par espace ; 2 fonctions SQL réécrites | Les projets de la boutique puiseraient dans le compte personnel |
| **E** | `is_system` en vraie colonne ; consolidation par nom | Une colonne générée disparaît avec `user_id` au Temps 4 |
| **F** | Index `space_id` créés au Temps 1 | Les créer au Temps 4 les fait payer sur des tables pleines |
| **G** | Schéma `core` séparé | Rendre la frontière écosystème / domaine réelle, pas documentaire |
| **H** | Espace personnel par trigger, jamais best effort | Un inscrit sans espace ne voit rien, et c'est indétectable |
| **I** | Migration de retour écrite avec celle de l'aller | « Retour immédiat » n'est pas une procédure sans SQL prêt |
| **J** | Graphify = chemin officiel de la documentation | Un document hors graphe n'est pas trouvé quand il compte |

*Il n'y a pas de décision D : les quatre trous restants du relevé initial
(cadrage applicatif, contraintes, fonctions SQL, colonne générée) portaient les
lettres A, B, C et E. Le point D du relevé — « le contrôle 2 est structurellement
incapable d'échouer le jour de la bascule » — n'appelait pas un arbitrage mais un
harnais : c'est* `scripts/db/check-espaces.ts`.

---

*Neuf décisions d'architecture — Migration multi-espaces — Swiftly.io*
