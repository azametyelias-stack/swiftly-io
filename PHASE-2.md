# Phase 2 — ce qui a été volontairement reporté

Ce fichier ne recense **que des reports décidés**, pas des idées. Chaque ligne a
été écartée du MVP en connaissance de cause, avec la raison et le déclencheur
qui la fait revenir. Si tu ajoutes une entrée, garde les trois : **quoi**,
**pourquoi c'était le bon choix**, **quand ça cesse de l'être**.

Créé le 2026-09-05, après l'audit de connexion des 22 écrans.

---

## 🔴 Bloquants avant un lancement public

### Allonger `INVITE_CODE_LENGTH` à 8-10 caractères

`lib/auth/invite-codes.ts`

6 chiffres conviennent à la bêta fermée : avec 5-10 codes valides sur 10⁶, un
balayage a une chance sur 100 000 par tentative, et le rate limiting du Point 3
rend le coût prohibitif. Le risque ne vient pas de la taille de l'espace mais du
**rapport** entre codes valides et espace : à quelques milliers de codes, le
même espace devient exploitable, et une attaque répartie sur beaucoup d'IP passe
le filtre par IP par définition.

**Déclencheur : toute ouverture au-delà du cercle d'invités.**

⚠️ Ce n'est pas un changement d'une ligne — trois choses cassent en silence
(`INVITE_CODE_SPACE`, la boucle infinie de `REJECT_AT` dès 8 chiffres,
`normalizeInviteCode` qui supprime les lettres). Le détail est dans le
commentaire au-dessus de la constante.

### Connecter Upstash en production

`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`

Sans elles, `/api/auth/verify-code` renvoie **503 et personne ne se connecte** —
c'est délibéré (fail closed), servir sans limiteur recréerait le trou fermé le
2026-09-05. À faire au moment du premier déploiement, pas plus tard.

---

## 🟡 Fonctionnel — reporté par décision produit

### Devise : `preferred_currency` est écrit, jamais relu

L'écran 22 propose XOF / USD / EUR et l'enregistre en base, mais 40 occurrences
de `"XOF"` en dur dans 21 composants ignorent ce choix. Un compte en USD affiche
son solde formaté en francs CFA.

Écarté le 2026-09-05 : **tous les bêta-testeurs sont au Togo, en XOF.** Le
réglage est donc décoratif sans conséquence visible aujourd'hui.

**Déclencheur : le premier utilisateur hors zone franc.** Prévoir aussi la
question de fond que le MVP n'a pas tranchée — un compte en USD et un compte en
XOF dans le même total exigent un taux de change et une date de conversion.

### Devise GHS (cedi ghanéen)

Présente sur l'artboard, absente du sélecteur. La base, `schemas.ts::currency` et
`money.ts::CurrencyCode` n'acceptent que XOF/USD/EUR, et un test verrouille cet
accord. L'ajouter = une migration + 2 fichiers + le test.

### Bandeau du dashboard jamais alimenté

`components/dashboard/DashboardView.tsx` — `<RotatingBanner items={[]} />`

Le composant sait faire tourner alertes, budgets et projets ; il reçoit une
liste vide en dur, donc il affiche éternellement son état « rien à signaler ».
Rien n'est cassé, la fonctionnalité n'existe simplement pas.

### Photo de profil

L'écran 22 affiche les initiales. L'upload demande un bucket Supabase Storage
que le MVP n'a jamais provisionné (aucun usage de `storage.from` dans le code).

### Archive des rapports

La table `reports` existe depuis `0002` et **n'est ni lue ni écrite** : le
rapport est recalculé à chaque ouverture. Conséquence — on ne peut pas relire le
rapport de mars tel qu'il était, seulement le recalculer avec les données
d'aujourd'hui.

---

## 🔵 Technique — à reprendre quand le contexte change

### `payments` — la table que Paystack exigera

Les docs FOUNDATION (Day 9) conçoivent une table `payments` séparée. Elle n'a
pas été construite : dans un registre saisi à la main, un paiement et une
transaction sont la même ligne, et deux tables auraient été une table plus un
bug de synchronisation.

Ça cesse d'être vrai dès qu'un prestataire entre en jeu : un paiement *en
attente*, *échoué* ou *annulé* n'est pas un mouvement d'argent et n'a rien à
faire dans le registre. **Ne pas élargir `transactions.status`** pour les
absorber. La forme à construire est documentée en tête de la table `transactions`
dans `supabase/migrations/0002_core_schema.sql`.

### Sentry

`SENTRY_DSN` est déclaré dans `lib/env/server.ts` et mentionné dans
`lib/log/logger.ts`, mais **rien n'y est envoyé** — aucune dépendance Sentry
installée. Le logger écrit du JSON auto-rédigé sur stdout.

### Sauvegardes automatiques

Supabase **plan Free : pas de sauvegarde automatique.** Accepté et non bloquant
pour la bêta ; le runbook et `scripts/backup/` sont prêts. À activer au passage
en Pro. Voir `supabase/BACKUPS.md`.

### Nettoyer la migration `0006`

`supabase/migrations/0006_theme_system.sql` contient un `UPDATE` de transition
**non rejouable** (il ne distingue pas l'ancien défaut `'light'` d'un choix
délibéré). Appliqué le 2026-09-05. **Supprimer cette ligne** — le reste du
fichier est idempotent.
