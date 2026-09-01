# 🎨 DESIGN GLOBAL — FOND D'ÉCRAN PARTAGÉ
**Statut** : Référence partagée, à consulter en complément de chaque `SCREEN-XX.md`
**Date** : 21 juillet 2026 (màj 31 août 2026)

---

> ## 🔄 MISE À JOUR (31 août 2026) — Périmètre & contexte clarifiés
>
> **Ce document couvre UNIQUEMENT le fond d'écran global partagé** — pas le design system
> complet. Malgré son nom « DESIGN-GLOBAL », il ne contient ni la palette de couleurs, ni la
> typographie, ni les composants.
>
> **Où est le design system ?** Il est construit **directement dans Claude Design** (couleurs,
> typo, composants, animations), pas dans un fichier `.md`. Les **22 maquettes MVP** (écrans
> 01-22) sont déjà créées dans Claude Design ; il suffit de les passer à Claude Code pour le code.
>
> **Rôle des 22 documents `SCREEN-XX.md` (01-22) :** chaque écran a son document qui explique
> à Claude Code **la logique de l'écran, son rôle, ses états et ses navigations** — pour qu'il
> code l'écran fidèlement à partir de la maquette existante. Ces documents sont statiques et
> conformes aux maquettes (ils ne redéfinissent pas le design, ils expliquent le comportement).
>
> **Décompte écrans :** 22 écrans MVP (01-22) + 23-24 réservés Phase 2+ (non maquettés).
>
> Le contenu ci-dessous (le fond d'écran global) reste valide tel quel.

---

## 0. ⚠️ RÈGLE D'OR POUR CHAQUE ÉCRAN (à lire en premier, Claude Code)

**Chaque écran a son propre document de référence, portant EXACTEMENT le même nom que l'écran.**

```
Écran 01 (Landing Page)  →  SCREEN-01-landing-page.md
Écran 04 (Dashboard)     →  SCREEN-04-dashboard.md
Écran 08 (Dépense)       →  SCREEN-08-creer-depense.md
... et ainsi de suite pour les 22 écrans (01-22)
```

**Avant CHAQUE implémentation d'écran, c'est OBLIGATOIRE :**

1. **Ouvrir et lire le document `SCREEN-XX.md` correspondant** — il décrit le rôle de
   l'écran, sa logique métier, ses états (vide/chargement/erreur/succès), ses interactions
   et ses navigations.
2. **Comprendre** ce document en entier avant d'écrire la moindre ligne de code.
3. **Construire l'écran en fonction de ce document** ET de la maquette existante — le code
   doit être fidèle aux deux. Ne jamais coder un écran "au feeling" ou en devinant son
   comportement.

**Le document de référence prime sur toute supposition.** Si quelque chose n'est pas clair
dans la maquette, la réponse est dans le `SCREEN-XX.md`. S'il y a un doute qui persiste
après lecture, demander — ne pas inventer.

**La carte produit (`SWIFTLY-CARTE-PRODUIT-22-ECRANS.md`) est là pour aider à construire :**
elle donne la vue d'ensemble des 22 écrans, leurs flux, d'où l'on arrive et vers où l'on va,
et les dépendances entre écrans. À consulter pour situer chaque écran dans l'ensemble et
comprendre l'ordre de construction (les 6 lots). Le `SCREEN-XX.md` donne le détail d'UN
écran ; la carte produit donne la carte de TOUS les écrans et leurs liens.

**En résumé du workflow par écran :**
```
1. Consulter la CARTE PRODUIT → situer l'écran, ses flux, ses dépendances
2. Lire le SCREEN-XX.md de l'écran → comprendre rôle, logique, états, navigation
3. Regarder la maquette (Claude Design) → le rendu visuel exact
4. Coder l'écran fidèle aux 3 → document + maquette + carte
```

---

## 1. Nature de l'élément

Un seul et même média de fond (image, potentiellement vidéo à l'avenir — dégradé navy foncé) est utilisé **sur tous les écrans de l'application**, avec un traitement différent selon l'écran :

- **Landing (Écran 1)** : plein cadre, en arrière-plan de tout le contenu (pattern "hero background"), avec un dégradé noir en overlay dans le bas de l'image
- **Connexion - Code d'invitation (Écran 2) et Connexion - Username (Écran 3)** : version réduite du même fond, limitée à un bandeau d'en-tête en haut de l'écran ; le reste de la page (fond gris clair, carte blanche) n'est pas concerné

C'est le **même asset visuel**, simplement redimensionné/rogné différemment selon l'écran — pas deux traitements distincts. Le rognage exact par écran est déductible du screenshot correspondant.

---

## 2. Asset à fournir

- Le fichier média lui-même (image ou vidéo) doit être fourni directement à Claude Design — asset unique, non déductible d'une description
- Le dégradé noir en bas (sur Landing) est déductible du screenshot, pas besoin de fichier séparé pour ça

---

## 3. Considération performance (pour Claude Code, pas Claude Design)

Puisque ce fond est global et répété sur plusieurs écrans :

- Implémenter le fond au niveau d'un **layout partagé** (ex. `app/layout.tsx` en Next.js) plutôt que de le recharger par page, pour qu'il soit mis en cache par le navigateur après le premier chargement et ne soit pas re-téléchargé à chaque navigation
- Compresser/convertir en format moderne (WebP ou AVIF) pour réduire le poids
- Utiliser `next/image` pour le redimensionnement automatique selon l'écran et le lazy loading

---

## 4. Référencement depuis les écrans

Chaque `SCREEN-XX.md` peut simplement renvoyer à ce document plutôt que de répéter l'explication — voir section Assets de chaque écran concerné.
