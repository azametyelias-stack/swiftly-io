# Deux bases, et comment on passe de l'une à l'autre

Jusqu'au 2026-09-09, Swiftly.io n'avait qu'une base : `next dev` en local écrivait
dans la base des vrais utilisateurs, et les preview deployments Vercel aussi. Une
migration comme `0007_people_kind.sql`, qui **réécrit des lignes existantes sans
que leur valeur d'avant soit récupérable**, ne pouvait donc être jouée qu'à
l'aveugle, sur des données de production, sur un plan Supabase Free sans
sauvegarde automatique.

Depuis, il y a deux projets Supabase :

| | fichier | qui la lit | rôle |
|---|---|---|---|
| **dev** | `.env.local` | `next dev`, `scripts/db/*` par défaut | la base de travail |
| **prod** | `.env.prod` | `scripts/db/*` avec `--target prod` uniquement | la production |

Le plan Free autorise deux projets : le quota est saturé. Le *branching* natif
Supabase attendra le passage en Pro (~Jour 30, en même temps que les
sauvegardes — voir [`supabase/BACKUPS.md`](../../supabase/BACKUPS.md)).

## Les deux fichiers d'environnement

`.env.prod` n'est **pas** nommé `.env.production`, et c'est délibéré. Next
cherche ses variables dans l'ordre `.env.$(NODE_ENV).local`, `.env.local`,
`.env.$(NODE_ENV)`, `.env` : un fichier `.env.production` serait avalé par
`next build` et renverrait les clés de production dans le bundle qu'on cherche
justement à séparer. `.env.prod` ne correspond à aucun `NODE_ENV` — Next
l'ignore, seuls les scripts de ce dossier le lisent.

Les deux fichiers sont ignorés par git (`.env.*` dans `.gitignore`, sauf
`.env.example`).

### Les garde-fous

[`env.ts`](env.ts) refuse de démarrer si :

- `.env.local` pointe sur le project ref de la production (`PROD_PROJECT_REF`,
  en dur dans le fichier — il est public, il est inliné dans le bundle JS servi
  par Vercel) ;
- `.env.prod` pointe ailleurs que sur ce même ref ;
- `NEXT_PUBLIC_SUPABASE_URL` et `SUPABASE_DB_URL` d'un même fichier désignent
  deux projets différents.

Et toute écriture en production demande de **retaper le project ref** à la main
(ou, hors terminal interactif, `SWIFTLY_CONFIRM_PROD=<ref>`).

## Mise en place de la base de dev

1. **Créer le projet** sur supabase.com (même région que la prod, de préférence).
2. **Remplir `.env.local`** avec les clés du nouveau projet :
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
   `SUPABASE_SERVICE_ROLE_KEY` (Settings → API Keys ; la *publishable* est
   l'anon, la *secret* est la service_role), puis `SUPABASE_DB_URL` — bouton
   **Connect** en haut du dashboard, onglet **Direct** :

   ```
   postgresql://postgres:<mot-de-passe>@db.<project-ref>.supabase.co:5432/postgres
   ```

   Gardez le reste (`INVITE_CODE_PEPPER`, `NEXT_PUBLIC_APP_URL`, …).

   > La connexion directe n'a **qu'un enregistrement AAAA** : elle exige l'IPv6.
   > Vérifié le 2026-09-09 sur la machine d'Elias — `db.<ref>.supabase.co:5432`
   > répond. Si un jour elle ne répond plus (`ENETUNREACH`, `EHOSTUNREACH`),
   > c'est que le réseau n'a pas d'IPv6 : il faut alors le *session pooler*,
   > dont l'hôte est `aws-N-<région>.pooler.supabase.com:5432` avec l'utilisateur
   > `postgres.<project-ref>`. Le `N` (0, 1, …) **n'est pas devinable** — il
   > dépend du serveur Supavisor où Supabase a posé le projet, et l'interface
   > ne l'affiche plus dans l'onglet *Direct*. Ne le construisez pas à la main :
   > cherchez-le dans *Connect*, ou percez-en un via le support.
3. **Rejouer les migrations** :

   ```bash
   npm run db:status          # doit montrer 0001 → 0007 « en attente »
   npm run db:migrate         # applique tout
   ```

4. **Poser les données représentatives** :

   ```bash
   npm run db:seed
   ```

5. **Vérifier que la dev est bien la jumelle de la prod** :

   ```bash
   npm run db:schema -- --snapshot                 # dev
   npm run db:schema -- --snapshot --target prod   # prod (SELECT uniquement)
   npm run db:schema -- --diff dev prod
   ```

   Une différence n'est pas forcément une faute — la production peut porter une
   correction faite à la main que le dépôt n'a jamais eue. Mais elle doit être
   **expliquée avant** de tester une migration lourde, sinon le test porte sur
   autre chose que la vraie base.

### Si la connexion directe ne passe pas

Port filtré, antivirus qui intercepte TLS, mot de passe perdu : générez un seul
fichier SQL et collez-le dans le SQL Editor.

```bash
npm run db:bundle                 # toutes les migrations
npm run db:bundle -- --only 0007  # une seule
```

Le fichier atterrit dans `supabase/.temp/` (ignoré par git). Il tient dans une
transaction et commence par un garde-fou qui refuse de rejouer ce qui est déjà
au registre.

## Le registre des migrations

`migrate.ts` tient une table `public.schema_migrations` (RLS activée, aucune
politique — refus net côté client). Elle existe parce que **trois de nos
migrations ne sont pas rejouables** :

- `0002` seed les catégories système avec `on conflict do nothing`, mais
  `categories` n'a aucun index unique : il n'y a aucun conflit à détecter, et un
  second passage crée 7 doublons. (`0004` insère « Frais bancaires » avec un
  `where not exists` — elle, est rejouable.)
- `0006` fait `update users set theme = 'system' where theme = 'light'`, et le
  fichier signale lui-même qu'un second passage écraserait les « Clair » choisis
  délibérément depuis.
- `0007` déduit `people.kind` de l'usage passé ; rejouée après une correction
  manuelle, elle la défait.

Chaque migration est appliquée dans **une transaction** : si elle échoue à sa
dernière ligne, tout est annulé et le registre n'est pas écrit. C'est ce qui
rendra la migration multi-espaces réessayable autant de fois qu'il le faudra.

`migrate.ts` compare aussi l'empreinte du fichier à celle enregistrée : une
migration modifiée après avoir été appliquée est signalée (`APPLIQUÉE ≠
FICHIER`).

### Repartir de zéro (dev seulement)

Le plus simple et le plus fiable, pour la migration multi-espaces : Supabase →
Settings → General → **Reset database**, puis `npm run db:migrate && npm run
db:seed`. Sinon, `npm run db:seed -- --reset` se contente de refaire les données
sans toucher au schéma.

## Le jeu de données de dev

[`seed.ts`](seed.ts) crée trois comptes, **et le code d'invitation qui ouvre
chacun** — c'est-à-dire de quoi entrer dans l'application, pas seulement de quoi
remplir des tables :

| code | compte | profil | ce qu'il couvre |
|---|---|---|---|
| `111111` | Awa Traoré | usage personnel, XOF | le cas courant, 3 mois d'historique |
| `222222` | Koffi Mensah | usage professionnel, XOF | le futur espace « business », gros montants |
| `333333` | Nina Okonkwo | EUR, en | **le cas limite** : un compte, rien dedans |

On les tape sur l'écran 2 (`npm run dev`). Ils ne valent que sur cette base :
un code est stocké haché avec `INVITE_CODE_PEPPER`, lu dans le même fichier
`.env` que la cible.

Le seed reproduit **l'ordre exact d'une vraie redemption**
(`app/api/auth/verify-code/route.ts`), et cet ordre n'est pas décoratif :

1. l'invitation d'abord — c'est son identifiant qui détermine tout le reste ;
2. l'utilisateur ensuite, sur l'adresse synthétique `invite-<id>@invite.swiftly.io`
   que `syntheticInviteEmail()` déduit de cet identifiant ;
3. `used_at` + `used_by`, qui font passer le code du statut d'invitation offerte
   à celui de **clé du compte** (décision du 2026-09-08).

Poser l'utilisateur avant l'invitation — avec une adresse lisible comme
`awa@example.com`, ce que faisait la première version — donne des comptes dans
lesquels on ne peut plus entrer : à la reconnexion, le serveur réclame un lien
magique pour `invite-<id>@invite.swiftly.io`, adresse qu'aucun utilisateur ne
porte. Les tables sont pleines, l'écran 2 refuse tout, et rien ne dit pourquoi.

Le mot de passe (`swiftly-dev-2026`, ou `SEED_PASSWORD`) existe encore sur les
comptes, mais ne sert à rien : l'application n'a pas d'écran de mot de passe.

Il couvre volontairement les trois types de transaction (dont un virement), une
dépense rattachée à un projet (qui fait travailler `account_balance()`), une
ligne `planned` qui ne doit pas compter dans le solde, des budgets, des modèles
récurrents, des alertes et des rapports mensuels.

Et surtout, pour chaque utilisateur, **les quatre situations que `0007` doit
départager** : une personne référencée par des revenus seuls, une par des
dépenses seules, une par les deux, une jamais utilisée.

`seed.ts` regarde si `people.kind` existe avant d'écrire — il tourne donc aussi
bien sur une base arrêtée à `0006` (l'état requis pour tester `0007`) qu'après.

## La procédure `0007`

C'est le patron de toutes les migrations qui réécrivent des lignes.

### 1. Sur la dev, avec des données antérieures à la migration

```bash
npm run db:migrate -- --through 0006   # la base s'arrête juste avant 0007
npm run db:seed                        # people n'a pas encore de colonne kind
npm run db:check-0007 -- --before      # fige le classement attendu
npm run db:migrate -- --only 0007      # la migration
npm run db:check-0007 -- --after       # verdict
```

L'ordre compte : appliquer `0001 → 0007` d'un bloc puis semer ne teste **rien**,
puisque l'`update` de `0007` n'aurait aucune ligne à reclasser.

`--after` vérifie quatre choses : le classement de chaque personne, qu'aucune
ligne de `people` n'a disparu ni été renommée, qu'aucun `linked_to_id` de
transaction n'a bougé, et que la contrainte et l'index sont en place. Il sort en
erreur au moindre écart.

### 2. En production

```bash
# a. la sauvegarde manuelle — le plan Free n'en fait aucune
#    (SQL Editor, sur le projet de production)
create table people_backup_0007 as select * from public.people;

# b. la prod porte déjà 0001 → 0006, appliquées à la main avant que ce
#    registre existe. On les DÉCLARE sans les rejouer.
npm run db:migrate -- --baseline 0006 --target prod

# c. l'instantané, puis la migration, puis le verdict
npm run db:check-0007 -- --before --target prod
npm run db:migrate -- --only 0007 --target prod
npm run db:check-0007 -- --after --target prod
```

Chaque commande visant `prod` demande de retaper le project ref.

`--baseline` est indispensable : sans lui, `migrate.ts` verrait `0001 → 0006`
« en attente » et les rejouerait, ce qui dupliquerait les catégories système et
réinitialiserait les thèmes.

Si `--after` passe, `people_backup_0007` peut être supprimée — mais rien ne
presse, elle ne coûte que quelques kilo-octets.

## Vercel

| environnement | base | pourquoi |
|---|---|---|
| Production | prod | inchangé |
| Preview | **dev** | sinon chaque preview écrit dans la base des vrais utilisateurs |
| Development | dev | pour `vercel dev`, si un jour il sert |

À faire dans Vercel → Settings → Environment Variables : pour
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
`SUPABASE_SERVICE_ROLE_KEY`, décocher **Preview** sur les variables existantes
(elles restent cochées pour Production), puis recréer ces trois variables avec
les valeurs de la base de dev, cochées **Preview** seulement.

Pensez aussi à `CORS_ALLOWED_ORIGINS` : les URL de preview ne sont pas dans la
liste intégrée (`localhost` en dev, `*.swiftly.io` en prod). Voir
[`.env.example`](../../.env.example) et `lib/http/cors.ts`.

`SUPABASE_DB_URL` n'a rien à faire sur Vercel : l'application ne s'en sert pas,
seuls ces scripts en ont besoin.

## Les commandes

```bash
npm run db:status                       # état des migrations (dev)
npm run db:status -- --target prod      # idem, production
npm run db:migrate                      # applique ce qui manque
npm run db:migrate -- --through 0006    # jusqu'à 0006 inclus
npm run db:migrate -- --only 0007       # une seule
npm run db:migrate -- --dry-run         # dit ce qu'il ferait
npm run db:migrate -- --baseline 0006 --target prod
npm run db:bundle                       # SQL à coller (chemin de secours)
npm run db:seed                         # données de dev
npm run db:seed -- --reset              # les refait à neuf
npm run db:seed -- --summary            # compte, n'écrit rien
npm run db:schema -- --snapshot         # empreinte du schéma
npm run db:schema -- --diff dev prod    # comparaison
npm run db:check-0007 -- --before       # avant la migration
npm run db:check-0007 -- --after        # après
```

Le `--` avant les options est obligatoire avec npm : il sépare les options du
script de celles de npm lui-même.
