# ARCHITECTURE — ISOLATION DES DONNÉES & PERMISSIONS
## Feature « Applications » — Swiftly.io

**Statut :** Fondation NON NÉGOCIABLE n°1
**Destinataire :** Claude Code
**Dépend de :** migration multi-activités (prérequis bloquant)

---

## POURQUOI CE DOCUMENT EXISTE SÉPARÉMENT

C'est le **risque numéro un de toute la plateforme.**

Une app mal codée — ou malveillante, le jour de l'ouverture aux développeurs externes
— peut lire, modifier ou faire fuiter les données financières de tous les utilisateurs.
Pour une fintech, c'est la fin : réputation détruite, problèmes réglementaires, procès.

Ce n'est pas une fonctionnalité qu'on ajoute après. C'est un **choix d'architecture**
qui doit être en dur dès la première ligne de code, même avec une seule app.

---

# 1. LES TROIS NIVEAUX DE DONNÉES

L'erreur classique serait de penser « chaque app a ses données, point ».
La réalité demande **trois** niveaux distincts.

```
┌─────────────────────────────────────────────────────────┐
│  NIVEAU 1 — DONNÉES DU CŒUR (Swiftly.io)                │
│  Comptes · Transactions · Profil · Activités            │
│                                                          │
│  → N'appartiennent à AUCUNE app                         │
│  → Appartiennent à l'utilisateur et à la plateforme     │
│  → Une app ne les possède jamais : elle DEMANDE l'accès │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  NIVEAU 2 — DONNÉES PRIVÉES D'UNE APP                   │
│  Ex : la table produits + niveaux de stock d'Inventaire │
│                                                          │
│  → C'est chez elle                                      │
│  → Aucune autre app n'y touche DIRECTEMENT              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  NIVEAU 3 — DONNÉES PARTAGÉES VOLONTAIREMENT            │
│  Ex : Inventaire déclare « je publie la liste produits »│
│                                                          │
│  → Choix EXPLICITE du développeur de l'app              │
│  → Jamais un accès par défaut                           │
└─────────────────────────────────────────────────────────┘
```

## L'analogie du marché

Imagine le marché de Lomé.

Chaque commerçant a **son étal fermé** avec ses marchandises — ce sont les données
privées de l'app (niveau 2).

Les allées, l'électricité, la sécurité — c'est le marché lui-même, le cœur de
Swiftly.io (niveau 1). Personne ne se l'approprie.

Le boutiquier de tissu et le tailleur travaillent ensemble. Le tailleur **ne rentre pas
dans l'étal** pour se servir. Il passe **par le comptoir** : il demande, l'autre lui
donne. Le comptoir, c'est l'interface publique (niveau 3).

Et si le boutiquier ferme, le tailleur ne se retrouve pas les mains vides sans
prévenir — il **savait à l'avance** qu'il dépendait de lui. C'est le rôle du manifeste.

---

# 2. LE MANIFESTE D'APPLICATION

Chaque app déclare, dans un fichier de configuration versionné, **quatre choses.**

## 2.1 `requires` — ce dont elle a besoin

```yaml
requires:
  - app: inventory
    min_version: "1.0.0"
```

**Comportement attendu :**
- Si la dépendance n'est pas activée → le bouton propose d'activer **les deux ensemble**
- À la désactivation de la dépendance → avertissement explicite :
  « POS ne fonctionnera plus. Voulez-vous continuer ? »

## 2.2 `provides` — ce qu'elle publie

```yaml
provides:
  interfaces:
    - produits.lire
  events:
    - stock.modifie
```

C'est **le comptoir**. C'est la **seule** porte d'entrée vers les données de l'app.

## 2.3 `scopes` — les accès au cœur qu'elle demande

```yaml
scopes:
  - core.transactions.read     # lire uniquement
  # PAS de core.transactions.write : elle n'en a pas besoin
```

Chaque accès est **nommé, granulaire**, et **visible par l'utilisateur** au moment de
l'activation.

## 2.4 `optional` — les dépendances souples

```yaml
optional:
  - app: pos
    fallback: "saisie manuelle des ventes"
```

**Point capital :** si l'app POS est là, Comptabilité récupère automatiquement les
ventes. Sinon, l'utilisateur saisit à la main. **L'app fonctionne dans les deux cas.**

C'est ce qui empêche l'écosystème de devenir une chaîne où tout dépend de tout.

---

# 3. LES TROIS CAS DE DÉPENDANCE

| Cas | Exemple | Comportement |
|---|---|---|
| **Obligatoire** | POS a besoin d'Inventaire pour savoir ce qu'il vend | Activation groupée proposée. Avertissement à la désactivation. |
| **Optionnelle** | Comptabilité marche seule ; si POS est là, elle récupère les ventes | L'app doit être écrite pour marcher **dans les deux cas** |
| **Aucun lien** | Fidélité client ↔ Comptabilité | Chacune dans son coin |

## ⚠️ Le risque de la toile d'araignée

Si les apps peuvent dépendre les unes des autres sans limite, on arrive à une situation
où **désinstaller une seule app en casse huit.**

**Règle à appliquer :**

> Les apps peuvent dépendre du **cœur** autant qu'elles veulent.
> Les dépendances **entre apps** doivent rester rares et déclarées.

Quand deux apps sont vraiment inséparables, la bonne réponse est presque toujours
**d'en faire une seule app avec deux modules** — pas deux apps couplées.

---

# 4. POURQUOI PASSER PAR UNE INTERFACE ET JAMAIS PAR LA BASE

C'est le point technique le plus important du document.

## ❌ Ce qu'il ne faut jamais permettre

Si l'app Comptabilité lit **directement** les tables de l'app POS :

- Le jour où le développeur de POS change sa structure interne, il **casse
  Comptabilité sans le savoir**
- Un développeur externe peut écrire une requête qui **lit tout ce qu'il veut**
- Tu es coincé pour toujours : plus aucune app ne peut évoluer sans risque

## ✅ Ce qu'il faut faire

Avec une interface déclarée :

- POS peut changer **tout ce qu'il veut à l'intérieur**, tant que le comptoir reste
  identique
- Tu contrôles **exactement** ce qui passe par ce comptoir
- Les contrats sont versionnés, donc les ruptures sont visibles à l'avance

```
❌ INTERDIT                        ✅ OBLIGATOIRE

App B ──SELECT──► table de App A   App B ──► interface publiée par App A
                                            (via la couche d'accès Swiftly)
```

---

# 5. LA CLÉ D'ISOLATION

**Décision actée : une app s'installe par ACTIVITÉ, pas par utilisateur.**

```
Clé d'isolation partout : (activity_id, app_id)
```

**Conséquence concrète :** l'app POS activée sur la boutique n'a **aucun accès** aux
données du restaurant, **même si c'est le même propriétaire**.

C'est une isolation à **deux niveaux** : par app **et** par activité.

**Pourquoi ce choix :** une boutique et un restaurant n'ont ni le même stock, ni les
mêmes clients, ni la même caisse. Une installation unique au niveau du compte
mélangerait les ventes de tissu et les ventes de plats — le chiffre d'affaires global
ne voudrait plus rien dire.

L'utilisateur garde bien sûr une **vue consolidée** au niveau de son compte s'il le
souhaite. C'est exactement la philosophie « du chaos à la clarté ».

---

# 6. LE CONSENTEMENT UTILISATEUR

Au moment de l'activation, l'utilisateur voit un écran **en langage simple, pas en
jargon technique.**

```
┌────────────────────────────────────────────┐
│  Comptabilité Pro                          │
│  demande l'accès à :                       │
│                                            │
│  ✓  Lire vos ventes enregistrées dans POS  │
│  ✓  Lire vos transactions bancaires        │
│                                            │
│  ✗  Elle ne pourra PAS modifier vos comptes│
│                                            │
│         [ Refuser ]    [ Activer ]         │
└────────────────────────────────────────────┘
```

**Ce que ça apporte :** protection juridique + construction de la confiance.

**⚙️ Réutilisation directe :** ce système reprend exactement la logique du système de
consentement RGPD déjà construit au Day 8 (PROMPT #0-PRIVACY) — même approche, même
table d'audit. Ne pas réinventer, étendre.

---

# 7. CE QU'IL FAUT METTRE EN DUR DÈS LE DÉPART

Trois briques, à construire même avec une seule app.

## 7.1 Un espace de données isolé par app

Soit un **schéma PostgreSQL par app**, soit un **préfixe de table strict avec RLS**.

⚙️ La fondation RLS du **Point 4** (déjà livrée) sert exactement à ça. Le template
`supabase/rls-core-tables.sql` est le point de départ.

## 7.2 Une couche d'accès unique

> **Aucune app ne parle à la base directement.**

Tout passe par une bibliothèque Swiftly qui **vérifie les permissions à chaque appel.**

⚙️ C'est le même principe que `lib/env/server.ts` déjà construit au Point 1 :
**un seul point de passage, impossible à contourner.** Reprendre ce modèle.

## 7.3 Un registre de dépendances

Une table qui sait **quelle app dépend de quelle app, dans quelle version.**

C'est ce qui permet d'activer, de désactiver et de mettre à jour sans casser.

---

# 8. DÉSACTIVER ≠ DÉSINSTALLER

Deux opérations distinctes, toutes deux nécessaires.

| Opération | Effet | Cas d'usage |
|---|---|---|
| **Désactiver** | L'app s'arrête. **Les données restent.** | Débogage, pause, essai. Réversible instantanément. |
| **Désinstaller** | L'app part. **Les données partent aussi.** | Abandon définitif. Nettoyage complet. |

**Exigence de rollback :** un utilisateur doit pouvoir **désactiver en un clic** et
retrouver son état d'avant. Sans intervention manuelle en base de données.

---

# 9. LE CAS PARTICULIER DES RÉSEAUX SOCIAUX

Une app qui poste sur une page Facebook ou envoie un message WhatsApp accède à un
service **externe**, au nom de l'utilisateur.

**C'est une catégorie de permission à part**, à traiter distinctement des accès aux
données internes :

```yaml
scopes:
  external:
    - whatsapp.send_message
    - tiktok.publish
```

**Raisons :**
- Le consentement doit être explicite et séparé
- La révocation doit être immédiate et indépendante
- Les jetons d'accès externes ont leur propre cycle de vie et leur propre stockage sécurisé
- Une fuite de jeton externe est un incident distinct d'une fuite de données internes

Et la règle générale s'applique : **aucune app ne doit dépendre entièrement d'un
réseau social pour fonctionner.** L'intégration enrichit, elle ne porte pas.

---

# 10. CHECKLIST DE VALIDATION

À vérifier avant tout lancement (critères Go / No-Go).

- [ ] Une app **ne peut pas** lire les données d'une autre activité du même utilisateur
- [ ] Une app **ne peut pas** lire les tables privées d'une autre app
- [ ] Une app **ne peut pas** accéder à un scope qu'elle n'a pas déclaré
- [ ] Tout accès au cœur passe par la couche unique — **aucun contournement possible**
- [ ] L'écran de consentement est compréhensible par une personne non technique
- [ ] Désactiver une app ne casse rien et est réversible
- [ ] Désinstaller une app nettoie ses données proprement
- [ ] Le registre de dépendances empêche d'activer une app sans sa dépendance requise
- [ ] Tout accès aux données du cœur est **tracé** (audit trail)
- [ ] Les jetons externes (WhatsApp, TikTok) sont stockés et révocables séparément

## 🛑 NO-GO absolu

> **Si l'isolation fuit, on ne lance pas.** Sans exception, sans contournement,
> sans « on corrigera après le lancement ».

---

# 11. À TRAITER PLUS TARD (mais à prévoir dans la structure)

- Processus de **validation d'une app avant publication** (rôle administrateur)
- Vérification automatique du manifeste à la soumission
- Détection des apps qui demandent plus de scopes qu'elles n'en utilisent réellement
- **Révocation d'urgence** : retirer une app compromise de toutes les activités d'un coup

⚠️ Rappel : **développeur ≠ administrateur**, toujours séparés en base.
Un développeur ne doit jamais pouvoir approuver sa propre app.

---

*Fondation non négociable n°1 — Feature « Applications » — Swiftly.io*
