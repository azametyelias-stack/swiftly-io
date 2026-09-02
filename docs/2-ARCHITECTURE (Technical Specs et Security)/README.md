# 📐 2-ARCHITECTURE/ — Index du dossier

**Swiftly.io — Spécifications techniques & sécurité**
**Dernière mise à jour :** 31 août 2026

Ce dossier contient tout ce que Claude Code (et toi) devez comprendre sur
**comment** Swiftly.io est construit techniquement : l'architecture, le schema
de base de données, les API, et la sécurité.

Ce README est le **point d'entrée** : il te dit quel document ouvrir selon ce
que tu cherches, pour ne pas avoir à tout lire à chaque fois.

---

## 🗺️ Les documents en un coup d'œil

| Document | À quoi il sert | Quand le lire |
|---|---|---|
| **ARCHITECTURE-CLAUDE-CODE.md** | L'architecture **production** de référence (schema complet, API, déploiement, sécurité) | Avant de coder — c'est LA référence technique |
| **ARCHITECTURE-MVP-TEST.md** | L'architecture **test/beta** simplifiée (version gratuite pour 5-10 users) | Pour le MVP 5-10 beta users — version allégée de la précédente |
| **SWIFTLY_IO_SECURITY_MASTERPLAN_ULTIMATE_COMPLET.md** | Le plan **sécurité complet** (20 points + mitigations + roadmap) | Pour tout ce qui touche à la sécurité, à chaque étape |
| **SECURITY-3-LAYERS.md** | La **défense en profondeur** : Semgrep (L1) / Zod (L2) / revue logique métier (L3) — où c'est branché, quand ça tourne | Statut des 3 couches ; avant chaque lot |
| **UPDATE-ARCHITECTURE-REST-API.md** | La **décision REST API** (pourquoi REST, 18 endpoints, format JSON) | Pour comprendre le choix REST vs GraphQL |

---

## 🎯 « Je cherche… » → quel document ouvrir

**« Comment est structurée la base de données ? »**
→ `ARCHITECTURE-CLAUDE-CODE.md` (section 2.2 — schema PostgreSQL complet avec UUID, DECIMAL, partitioning, ledger)

**« Quelle est la version simple pour lancer le MVP avec mes 5-10 amis ? »**
→ `ARCHITECTURE-MVP-TEST.md` (même base de code, moins d'optimisation, $0/mois)

**« Quels sont les endpoints de l'API et leur format ? »**
→ `UPDATE-ARCHITECTURE-REST-API.md` (les 18 endpoints REST, JSON, status codes)
→ puis `ARCHITECTURE-CLAUDE-CODE.md` (section 3 — détail des routes)

**« Comment je sécurise l'app ? »**
→ `SWIFTLY_IO_SECURITY_MASTERPLAN_ULTIMATE_COMPLET.md` (les 20 points, sections 1-6)

**« Comment ça scale de 10 users à 1M ? »**
→ `ARCHITECTURE-CLAUDE-CODE.md` (section 6 — scalabilité par phase)
→ complété par le Guide Master Unifié, Section 14 (Database Scalability)

**« Quel est le workflow de déploiement ? »**
→ `ARCHITECTURE-CLAUDE-CODE.md` (section 4 — Vercel + Supabase)

---

## 📚 Ordre de lecture recommandé (pour Claude Code)

Si tu découvres le projet, lis dans cet ordre :

1. **UPDATE-ARCHITECTURE-REST-API.md** — comprendre le choix REST (rapide, pose le cadre)
2. **ARCHITECTURE-CLAUDE-CODE.md** — l'architecture production complète (le gros morceau)
3. **ARCHITECTURE-MVP-TEST.md** — ce qu'on simplifie pour le MVP (les différences avec la prod)
4. **SWIFTLY_IO_SECURITY_MASTERPLAN...md** — la sécurité, à garder ouvert en permanence

---

## 🔗 Cohérence avec le reste du projet

Ces documents ne vivent pas seuls. Ils s'articulent avec :

- **Guide Master Unifié** (`SWIFTLY-IO-GUIDE-MASTER-UNIFIE.md`) — l'exécution jour par
  jour, les 36 prompts conversationnels + les 3 prompts fondation. C'est là que
  l'architecture de ce dossier prend vie (Days 9-11 = les fondations).
- **Execution Plan** (`SWIFTLY-EXECUTION-PLAN.md`) — la roadmap long-terme (Phases 1-5,
  budgets, embauche).
- **Master Memory** (`SWIFTLY-IO-MASTER-MEMORY-V1.1.md`) — la mémoire du projet.

---

## ⚙️ Décisions techniques clés (rappel rapide)

Pour ne pas avoir à fouiller les documents, voici les décisions actées :

- **Stack :** Next.js 16.3.3 + TypeScript + Tailwind CSS + Supabase (PostgreSQL)
- **API :** REST (18 endpoints), migration GraphQL seulement en Phase 3+ si besoin
- **Schema :** UUID pour les IDs (sharding-ready), DECIMAL pour l'argent (jamais FLOAT),
  ledger append-only, indexes sur (user_id, created_at) — **prêt pour 1M users sans refactoring**
- **Validation :** Zod partout (fondation PROMPT #INPUT), jamais express-validator
- **Auth MVP :** code d'invitation (beta fermée) ; phone/SMS en Phase 2
- **Sécurité :** Semgrep + Zod + RLS + JWT ; score 8.0/10 MVP → 9.3/10 Phase 3
- **Stratégie :** « Build Foundation Once, Use Multiple Times » — construire complet
  aux Days 9-11 (Payment, Input, Transactions), activer Phase 2 en heures pas en semaines
- **Coûts :** $0/mois MVP (free tiers) → $180-200/mois Phase 2 (paid tiers)

---

## 📄 Note sur ce dossier

Les 4 documents ci-dessus ont été relus et mis à jour le **31 août 2026** pour les
aligner sur la stratégie Build Foundation, les coûts réels ($0 → $200), la scalabilité
1M users, et l'état d'avancement (22 écrans, Day 0 complété). Chacun porte un bloc
« 🔄 MISE À JOUR » en tête qui documente ce qui a changé.

---

**Maintenu par :** Elias
**Rôle de ce fichier :** index / point d'entrée du dossier 2-ARCHITECTURE/
