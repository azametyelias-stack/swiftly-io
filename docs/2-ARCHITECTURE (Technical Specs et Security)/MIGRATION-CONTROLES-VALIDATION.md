# CONTRÔLES DE VALIDATION DE LA MIGRATION
## Migration multi-espaces — Swiftly.io

**Destinataire :** Claude Code
**Document parent :** MIGRATION-MULTI-ESPACES.md
**Nature :** critères Go / No-Go sur des données EN PRODUCTION

---

## POURQUOI CE DOCUMENT EXISTE SÉPARÉMENT

Ce sont ces contrôles — et eux seuls — qui décident si on **garde** la migration ou si
on **revient en arrière**.

La migration touche les données financières réelles d'utilisateurs actifs. Une erreur
silencieuse ici ne fait planter aucun écran : elle fausse simplement les chiffres, et
personne ne s'en aperçoit avant des semaines. C'est le pire scénario possible pour une
application de gestion financière.

> **Un seul contrôle en échec = retour arrière immédiat.**
> Pas de discussion, pas de « on corrigera après ».

---

## PRINCIPE D'EXÉCUTION

Les quatre contrôles s'écrivent comme des **tests automatiques**, pas comme une
vérification manuelle.

```
1. Sur l'environnement de TEST
   └─ Répéter la migration jusqu'à ce que les 4 contrôles passent

2. En PRODUCTION, juste après le Temps 2 (remplissage)
   └─ Rejouer les 4 contrôles

3. En PRODUCTION, juste après le Temps 3 (bascule)
   └─ Rejouer les 4 contrôles

Un échec à n'importe quelle étape → retour arrière
(l'ancienne colonne existe encore, le retour est immédiat)
```

⚠️ **Prérequis absolu :** les mesures « avant » (contrôle 2) doivent être prises et
stockées **avant** de lancer le remplissage. Sans elles, il est impossible de prouver
que rien n'a bougé.

---

# CONTRÔLE 1 — AUCUNE DONNÉE ORPHELINE

## Ce qu'on vérifie

Chaque ligne de chaque table concernée possède un `space_id` valide, pointant vers un
espace existant.

**Zéro exception.**

## Tables à contrôler

```
accounts · transactions · budgets · projects
templates · people · alerts · reports
categories (les catégories personnalisées uniquement —
            les catégories système restent globales)
```

## Pourquoi c'est critique

Une seule ligne oubliée = un utilisateur perd une partie de son historique. Dans une
application de gestion financière, une transaction disparue est une faute
impardonnable.

## Critère de réussite

| Vérification | Attendu |
|---|---|
| Lignes avec `space_id` NULL | **0** sur chaque table |
| Lignes avec `space_id` pointant vers un espace inexistant | **0** |
| Nombre de lignes total avant / après | **identique** sur chaque table |

## ✅ / ❌

- [ ] Aucune ligne orpheline sur les 9 tables
- [ ] Aucune référence vers un espace inexistant
- [ ] Le compte de lignes est inchangé table par table

---

# CONTRÔLE 2 — LES TOTAUX SONT IDENTIQUES

## 🔴 C'est le contrôle le plus important

C'est celui qui attrape les **erreurs silencieuses** — celles qui ne font planter aucun
écran mais qui faussent les données.

Un mauvais rattachement ne provoque pas d'erreur technique. L'application fonctionne,
les écrans s'affichent, et les chiffres sont faux. Sans ce contrôle, personne ne s'en
aperçoit.

## Ce qu'on vérifie

Pour **chaque utilisateur**, on compare avant et après :

- Le solde total, tous comptes confondus
- Le solde de chaque compte pris individuellement
- Le nombre total de transactions
- La somme des dépenses
- La somme des revenus
- Le nombre de budgets, de projets, de templates, de Personnes

## Méthode

```
AVANT le remplissage
└─ Calculer et STOCKER un instantané par utilisateur
   (table temporaire ou fichier de contrôle)

APRÈS le remplissage
└─ Recalculer les mêmes valeurs
└─ Comparer ligne à ligne

Toute différence, même d'un centime, même sur un seul
utilisateur → ÉCHEC
```

⚠️ Utiliser des comparaisons **exactes** sur les montants (type DECIMAL, jamais FLOAT
— conforme au schéma existant). Aucune tolérance d'arrondi.

## Critère de réussite

> **Correspondance exacte, pour 100 % des utilisateurs, sur 100 % des indicateurs.**

## ✅ / ❌

- [ ] Instantané « avant » pris et stocké
- [ ] Soldes totaux identiques pour chaque utilisateur
- [ ] Solde de chaque compte identique
- [ ] Nombre de transactions identique
- [ ] Somme des dépenses identique
- [ ] Somme des revenus identique
- [ ] Compteurs budgets / projets / templates / personnes identiques

---

# CONTRÔLE 3 — UN SEUL ESPACE PERSONNEL PAR UTILISATEUR

## Ce qu'on vérifie

Chaque utilisateur existant possède **exactement un** espace de type `personal`.

**Ni zéro, ni deux.**

## Pourquoi c'est critique

**Zéro espace** → l'utilisateur ouvre l'application et ne voit rien. Ses données
existent mais ne sont rattachées à aucun conteneur affichable.

**Deux espaces** → ses données sont réparties entre les deux. Il voit la moitié de son
historique, et l'autre moitié semble avoir disparu. C'est le scénario le plus
déroutant pour l'utilisateur, et le plus difficile à diagnostiquer.

## Critère de réussite

| Vérification | Attendu |
|---|---|
| Utilisateurs avec 0 espace `personal` | **0** |
| Utilisateurs avec 2+ espaces `personal` | **0** |
| Nombre d'espaces `personal` | **= nombre d'utilisateurs** |

## À vérifier aussi

- [ ] L'espace personnel est bien marqué **non supprimable**
- [ ] Aucun abonnement ne peut s'y rattacher
- [ ] La création automatique fonctionne aussi pour les **nouveaux** utilisateurs
      inscrits après la migration

---

# CONTRÔLE 4 — L'ISOLATION FONCTIONNE

## Ce qu'on vérifie

Aucune requête ne remonte les données d'un espace qui n'appartient pas à l'utilisateur.

## Scénarios de test obligatoires

**Test A — Isolation entre utilisateurs**
Utilisateur 1 tente de lire les données de l'espace de l'utilisateur 2
→ doit retourner **RIEN** (pas une erreur : rien)

**Test B — Isolation entre espaces d'un même utilisateur**
L'espace « Ma boutique » tente de lire les données de l'espace « Mon restaurant »
→ doit retourner **RIEN**, même si c'est le même propriétaire

**Test C — La consolidation fonctionne quand même**
L'utilisateur, en tant que **propriétaire**, demande sa vue consolidée
→ doit retourner **toutes** ses données, tous espaces confondus

**Test D — Politiques RLS réécrites**
Toutes les politiques RLS pointent bien sur `space_id` et non plus sur `user_id`
→ aucune politique orpheline ou contradictoire

## Pourquoi le test B est le plus important

C'est le fondement de tout le modèle de permissions de la page Applications. Si deux
espaces d'un même utilisateur peuvent se lire mutuellement, alors une app installée
dans la boutique pourra lire les données du restaurant — et l'isolation décrite dans
ARCHITECTURE-ISOLATION-PERMISSIONS.md ne tient plus.

## Rappel de l'architecture testée

```
Espaces business  →  ne se voient JAMAIS entre eux
Apps              →  enfermées dans leur espace
Utilisateur       →  voit tout, parce qu'il est PROPRIÉTAIRE
                     (droit au niveau utilisateur, pas privilège d'espace)
```

## ✅ / ❌

- [ ] Test A passe
- [ ] Test B passe
- [ ] Test C passe
- [ ] Test D passe

---

# 🛑 DÉCISION GO / NO-GO

## GO — on garde la migration

**Les 4 contrôles passent, sans exception.**

On surveille ensuite de près (Sentry, logs) pendant plusieurs semaines avant de
supprimer l'ancienne colonne (Temps 4).

## NO-GO — retour arrière immédiat

**Un seul contrôle en échec suffit.**

| Situation | Décision |
|---|---|
| Données orphelines détectées | Retour arrière |
| Un seul total qui ne correspond pas | Retour arrière |
| Un utilisateur sans espace, ou avec deux | Retour arrière |
| L'isolation fuit | Retour arrière |

Le retour arrière est **immédiat et sans perte** tant que l'ancienne colonne existe.
C'est précisément pour ça qu'on ne la supprime qu'après plusieurs semaines.

---

# APRÈS LA BASCULE — SURVEILLANCE

Les 4 contrôles valident l'instant T. Il faut aussi surveiller la durée.

- [ ] Rejouer les contrôles 1 et 3 **quotidiennement** pendant la première semaine
      (attrape les nouvelles données mal rattachées)
- [ ] Surveiller Sentry sur les erreurs liées aux requêtes de données
- [ ] Vérifier qu'aucun utilisateur ne signale de données manquantes
- [ ] Ne lancer le Temps 4 (suppression de l'ancienne colonne) qu'après **plusieurs
      semaines** sans incident

---

*Contrôles Go / No-Go — Migration multi-espaces — Swiftly.io*
