# 🗺️ SWIFTLY.IO — PLAN D'EXÉCUTION (EXECUTION PLAN)

**Projet:** Swiftly.io — Écosystème fintech pour l'Afrique francophone
**Auteur:** Elias (Founder)
**Dernière mise à jour:** 30 août 2026
**Horizon:** 3-5 ans, du MVP à 1M+ users

---

## 🎯 EXECUTIVE SUMMARY

- **Stratégie:** Construire la STRUCTURE organisationnelle tôt (mentalement) mais SCALER GRADUELLEMENT (personnel & budget)
- **Principe directeur:** N'embaucher que lorsque le revenu justifie la dépense ; jamais d'embauche spéculative
- **Timeline:** 3-5 ans du MVP à 1M users
- **Budget IT total à 1M users:** ~$178K/mois (~$2.1M/an) en salaires + infrastructure

---

## 🟢 PHASE 1: MVP (Mois 0-3 | 0-1K users)
**Devise:** « Build the product, validate the idea »

### Composition de l'équipe
- Elias (Founder) = CEO + CTO + Backend + Frontend + DevOps + Support
- 1 Backend Dev à temps partiel (10 h/semaine)
- Claude (IA) = debugging de routine, génération de code, chatbot de support

### Budget & stratégie de financement
- **Financement MVP (engagement Elias, 29 août 2026):** Option 1 (free tiers) pour le MVP Days 1-30 ; passer à l'Option 2 (paid tiers ~$180-200/mois) au lancement public en fin de Phase 2
- Cette stratégie évite la pression financière tant que le produit n'est pas validé, avec un upgrade fluide quand les signaux marché sont forts
- Salaires: $600/mois (freelance backend uniquement)
- Infrastructure: $0 (Vercel + Supabase free tier)
- **Total: $600/mois**

### Priorités
1. Terminer le design du MVP (écrans Figma)
2. Implémenter les fonctionnalités core de SwiftlyTrack (auth, transactions, dashboard)
3. Tester avec 5-10 utilisateurs invités (beta feedback)
4. Recueillir des signaux de product-market fit
5. Construire la roadmap réglementaire (checklist de conformité fintech)

### Decision Gate (Fin de Phase 1)
- Le produit résonne avec les beta users ? → OUI = passer à la Phase 2
- Utilisateurs/revenu en croissance ? → devrait atteindre 100-500 users → continuer
- Dette technique maîtrisée ? → OUI = continuer
- Si NON sur l'un d'eux : pivoter ou optimiser avant la Phase 2

### Outils & Infrastructure
- Vercel (hosting) — GRATUIT
- Supabase (database, auth) — GRATUIT (500MB)
- Upstash (cache) — GRATUIT (10MB)
- Figma (design) — $12/mois
- Claude (IA) — $0-20/mois (si Plus)
- Sentry (error tracking) — GRATUIT
- Cloudflare (CDN) — GRATUIT

---

## 🟡 PHASE 2: TRACTION (Mois 3-9 | 1K-10K users)
**Devise:** « Stabilize architecture, prepare for growth »

### Composition de l'équipe
- Elias = CEO + Product Strategy (focus business)
- 1 Backend Dev à temps partiel (depuis Phase 1)
- 1 CTO Consultant (temps partiel, 20 h/semaine) — $2000/mois
- 1 Frontend Dev (temps plein) — $1500/mois
- 1 DevOps Engineer (temps partiel, 15 h/semaine) — $1500/mois
- Claude (IA) = génération de code, debugging, support
- Supabase (cloud) = database + auth

### Budget & décision d'upgrade
- Upgrade vers l'Option 2 (paid tiers) au lancement public, selon l'engagement du 29 août
- Vercel Paid ($20/mois), Supabase Pro ($150/mois), Upstash Paid ($10/mois), Sentry Paid ($20/mois) = $200/mois d'infrastructure
- Salaires: $5,000/mois
- Infrastructure: $200/mois (paid tiers activés au lancement public)
- **Total: $5,200/mois** au début de la Phase 2 ; scale graduellement avec la croissance

### Priorités (dans l'ordre)
1. **Architecture Review** (CTO) — valider que le code MVP peut scaler à 100K users
2. **Frontend Completion** (Frontend Dev) — finaliser le design system, tous les écrans responsive
3. **Deployment Automation** (DevOps) — pipeline CI/CD, setup auto-scaling
4. **Database Optimization** — préparer une croissance x10
5. **Early Support System** — répondre rapidement aux problèmes utilisateurs
6. **Regulatory Prep** — démarrer la checklist de conformité GDPR/locale
7. **Analytics Setup** — suivre DAU, MAU, churn, cohortes

### Métriques à suivre
- DAU — cible : 100-500
- MAU — cible : 1-5K
- Taux de churn — cible : <10% mensuel
- Revenu / unit economics — cible : break-even ou positif
- Coûts d'infrastructure — devraient rester <$500/mois

### Decision Gate (Fin de Phase 2)
- Architecture validée pour 100K users ? → OUI = continuer
- Équipe fonctionne bien (CTO, 1 dev, DevOps) ? → OUI = continuer
- Users >5K et en croissance ? → OUI = continuer
- Signaux de product-market fit forts ? → OUI = continuer

### Nouveaux outils ajoutés
- GitHub Actions (CI/CD) — GRATUIT ou $4/mois
- Datadog monitoring (optionnel) — $50/mois
- Slack (communication) — $8/mois par personne
- Notion (documentation) — $10/mois

---

## 🟠 PHASE 3: EARLY GROWTH (Mois 9-18 | 10K-100K users)
**Devise:** « Form full teams, establish roles, prepare for scale »

### Composition de l'équipe
- Elias = CEO (focus total sur business, fundraising, partenariats)
- 1 CTO (désormais temps plein) — $5000/mois
- 2 Backend Devs (supplémentaires) — $4000/mois total
- 1 Frontend Dev (depuis Phase 2, désormais mentor)
- 1 Mobile Dev (React Native) — $4000/mois
- 1 Database Engineer — $2000/mois
- 1 QA Engineer (automation) — $1000/mois
- 1 Support Engineer (tier 1) — $800/mois
- Claude (IA) — intégré à tous les workflows

### Budget
- Salaires: $12,900/mois
- Infrastructure: $1000-2000/mois (scaling database, plus de serveurs)
- Licences & outils: $300/mois
- **Total: $14,200/mois**

### Priorités (dans l'ordre)
1. **Former la Platform Team** — Backend Lead + 3 devs + Frontend + Mobile
2. **Database Optimization** — nouveau schema pour multi-branches (Track, Pay, etc.)
3. **Security Roadmap** — recruter un consultant sécurité pour la conformité
4. **QA Automation** — construire la suite de tests, prévenir les bugs en production
5. **Lancer la branche #2** — SwiftlyPay (paiements) — nécessite du support backend supplémentaire
6. **Customer Support Tier** — 1 personne gérant les tickets de support
7. **Analytics Dashboard** — suivre cohortes, rétention, revenu

### Structure organisationnelle (début)
```
CEO (Elias)
├─ CTO
│  ├─ Backend Lead
│  │  ├─ Senior Backend Dev
│  │  ├─ Mid Backend Dev
│  │  └─ Junior Backend Dev
│  ├─ Frontend Dev
│  └─ Mobile Dev
├─ DevOps Engineer
├─ Database Engineer
├─ QA Engineer
└─ Support Engineer (1)
```

### Métriques à suivre
- DAU: 5-50K
- MAU: 10-100K
- Revenu : devrait être $10K-50K/mois (pour justifier l'équipe)
- Coûts d'infrastructure : $1-2K/mois
- Temps de réponse support : <2 heures

### Decision Gate (Fin de Phase 3)
- Users >50K ? → OUI = passer à la Phase 4
- Revenu $20K+/mois ? → OUI = continuer
- CTO à l'aise avec l'architecture actuelle ? → OUI = continuer
- L'équipe support gère la charge ? → OUI = continuer

---

## 🔴 PHASE 4: SCALE (Mois 18-36 | 100K-500K users)
**Devise:** « Full specialization, enterprise-grade systems »

### Composition de l'équipe (20-25 personnes)
- Elias = CEO
- 1 CTO (temps plein, stratégique)
- 1 Engineering Manager (Platform) — $4000/mois
- 4 Backend Devs (mix senior/mid/junior) — $12K/mois
- 2 Frontend Devs — $6K/mois
- 1 Mobile Dev — $4K/mois
- **Data Team (NOUVEAU):**
  - 1 Database Architect — $5K/mois
  - 1 Data Engineer — $3K/mois
  - 1 Analytics Engineer — $2.5K/mois
- **DevOps Team (ÉTENDUE):**
  - 1 DevOps Lead — $5K/mois
  - 1 SRE (Site Reliability Engineer) — $4K/mois
  - 1 Ops Specialist — $2K/mois
- **Security Team (NOUVEAU):**
  - 1 Security Architect — $6K/mois
  - 1 Pentester (temps partiel) — $2K/mois
- **QA Team (ÉTENDUE):**
  - 1 QA Lead — $3.5K/mois
  - 1 Automation Engineer — $2.5K/mois
- **Support Team (ÉTENDUE):**
  - 1 Support Manager — $2.5K/mois
  - 2 Support Engineers — $1.8K/mois
  - 1 Technical Writer — $1.2K/mois

### Budget
- Salaires: $70,000/mois
- Infrastructure: $3-5K/mois (multi-region, read replicas)
- Outils & licences: $1K/mois
- Formation & recrutement: $2K/mois
- **Total: $76K-78K/mois**

### Priorités
1. **Full Data Team** — analytics, BI, optimisation
2. **Security Audit** — préparer les exigences réglementaires
3. **Mobile App Launch** — React Native prêt pour la production
4. **Lancer la branche #3** — SwiftlyInvest (investissements)
5. **Multi-region Infrastructure** — optimisation de la latence
6. **Enterprise Support** — support tier 2 pour les utilisateurs VIP
7. **Compliance Automation** — checks GDPR, AML, KYC

### Structure organisationnelle (mature)
```
CEO (Elias)
├─ VP Engineering (CTO)
│  ├─ Platform Team Lead
│  │  ├─ 4 Backend Devs
│  │  ├─ 2 Frontend Devs
│  │  └─ 1 Mobile Dev
│  ├─ Data Team Lead
│  │  ├─ DB Architect
│  │  ├─ Data Engineer
│  │  └─ Analytics Engineer
│  ├─ DevOps Team Lead
│  │  ├─ SRE
│  │  └─ Ops Specialist
│  ├─ Security Lead
│  │  └─ Pentester
│  └─ QA Lead
│     └─ Automation Engineer
└─ Support Manager
   ├─ 2 Support Engineers
   └─ Technical Writer
```

### Decision Gate (Fin de Phase 4)
- Users >250K ? → OUI = continuer
- Revenu $100K+/mois ? → OUI = continuer
- Infrastructure stable à l'échelle ? → OUI = continuer
- Audit de conformité passé ? → OUI = continuer

---

## 🟣 PHASE 5: ENTERPRISE (Mois 36+ | 500K-1M+ users)
**Devise:** « Global scale, regulatory compliance, highest reliability »

### Composition de l'équipe (35-40 personnes)
- Structure organisationnelle COMPLÈTE (détaillée dans STRUCTURE-ORGANISATION-IT-SWIFTLY.md)
- CTO + 7 department leads + équipes spécialisées dans tous les domaines
- Budget: $120-180K/mois

### Priorités
1. Enterprise SLA (garantie 99.9% uptime)
2. Infrastructure globale (multi-region, optimisation CDN)
3. Sécurité avancée (équipe sécurité dédiée, bug bounty program)
4. Audits de conformité (SOC 2 annuel, ISO 27001)
5. Stratégie data (1M+ users, pétaoctets de données)
6. Business intelligence (dashboards exécutifs)

---

## 🚦 DECISION GATES CRITIQUES (Go/No-Go)

### Gate 1: Fin de Phase 1 (Mois 3)
**Doit avoir:**
- ✅ MVP fonctionnel avec 5-10 users
- ✅ Le produit résonne (90% continuent après 1 semaine)
- ✅ Aucun bug critique
- ✅ Feedback utilisateurs positif

**Si échec:** Pivoter le produit ou repenser l'UX avant la Phase 2

---

### Gate 2: Fin de Phase 2 (Mois 9)
**Doit avoir:**
- ✅ 1-5K utilisateurs actifs
- ✅ Le CTO valide que l'architecture peut scaler à 100K
- ✅ Pipeline CI/CD fonctionnel
- ✅ Churn hebdomadaire <2%
- ✅ Équipe de 5 fonctionnant bien

**Si échec:** Recruter un consultant externe ou un CTO à temps plein avant la Phase 3

---

### Gate 3: Fin de Phase 3 (Mois 18)
**Doit avoir:**
- ✅ 10-50K utilisateurs actifs
- ✅ $20K+ de revenu mensuel
- ✅ Équipe de 7 personnes avec des rôles clairs
- ✅ SwiftlyPay lancé
- ✅ Système de support opérationnel

**Si échec:** Scaler plus lentement ou lever des fonds pour soutenir l'équipe

---

### Gate 4: Fin de Phase 4 (Mois 36)
**Doit avoir:**
- ✅ 100-250K utilisateurs actifs
- ✅ $100K+ de revenu mensuel
- ✅ Équipe de 20+ personnes
- ✅ Écosystème multi-branches (Track, Pay, Invest)
- ✅ Audit de conformité passé

**Si échec:** Réévaluer le product-market fit, envisager une acquisition

---

## 🛡️ GUARDRAILS CLÉS

### NE JAMAIS FAIRE
- ❌ Embaucher spéculativement (« on aura peut-être besoin de cette personne bientôt »)
- ❌ Sauter les tests/QA pour aller plus vite (la dette technique te tue)
- ❌ Ignorer la sécurité jusqu'aux plaintes utilisateurs (fintech = conformité obligatoire)
- ❌ N'embaucher que des juniors (besoin de gens expérimentés pour le mentorat)
- ❌ Avoir des rôles flous (confusion = inefficacité)

### TOUJOURS FAIRE
- ✅ Embaucher quand tu as 2-3 mois de backlog de travail
- ✅ Utiliser d'abord des freelances/consultants (flexibilité)
- ✅ Promouvoir en interne quand possible (loyauté + connaissance)
- ✅ Cross-former les gens (redondance)
- ✅ Tout documenter (pour scaler)
- ✅ Réviser les décisions d'embauche chaque trimestre (ajuster si besoin)

---

## 📊 TABLEAU RÉCAPITULATIF DES BUDGETS

| Phase | Users | Durée | Salaires | Infra | Total/mois | Total/an |
|---|---|---|---|---|---|---|
| 1 (MVP) | 0-1K | 3 mo | $600 | $0 | $600 | $1,800 |
| 2 (Traction) | 1K-10K | 6 mo | $5,000 | $300 | $5,300 | $31,800 |
| 3 (Growth) | 10K-100K | 9 mo | $12,900 | $1,500 | $14,400 | $129,600 |
| 4 (Scale) | 100K-500K | 18 mo | $70,000 | $4,000 | $74,000 | $1,332,000 |
| 5 (Enterprise) | 500K-1M | 12+ mo | $120,000 | $50,000 | $170,000 | $2,040,000 |

**Investissement IT total sur 5 ans:** ~$3.5M
**Revenu attendu à 1M users:** $10-50M/an (modèles fintech)
**ROI:** 3-5x sur l'investissement IT

---

## ✅ MÉTRIQUES DE SUCCÈS PAR PHASE

### Phase 1
- [ ] MVP terminé
- [ ] 5-10 beta users
- [ ] 70%+ de rétention après 1 semaine
- [ ] 0 bug critique

### Phase 2
- [ ] 5K users
- [ ] 15% de croissance hebdomadaire
- [ ] <5% de churn
- [ ] Architecture revue & approuvée

### Phase 3
- [ ] 50K users
- [ ] $20K de revenu mensuel
- [ ] Équipe de 7+ personnes
- [ ] SwiftlyPay opérationnel

### Phase 4
- [ ] 250K users
- [ ] $100K de revenu mensuel
- [ ] Équipe de 20+ personnes
- [ ] 3+ branches opérationnelles

### Phase 5
- [ ] 1M+ users
- [ ] $1M+ de revenu mensuel
- [ ] Équipe de 35-40 personnes
- [ ] Opérations globales
- [ ] Conformité réglementaire

---

## 👥 STRATÉGIE D'EMBAUCHE : MODÈLE D'APPRENTISSAGE

- **Philosophie:** Commencer avec la famille / les amis proches en tant que stagiaires plutôt que d'embaucher des seniors inconnus ; les former à mesure qu'ils grandissent
- **Progression Stagiaire → Junior → Mid → Senior:** Construire l'équipe graduellement, garder les coûts bas au début, créer loyauté et connaissance profonde du produit
- **Plan spécifique:** Cousin en stagiaire backend, frère en stagiaire frontend, meilleur ami en stagiaire DevOps
- Après 6-12 mois : promouvoir aux rôles juniors quand compétents
- Après 2-3 ans : rôles mid-level, peuvent alors mentorer les nouveaux juniors
- À l'année 5 (1M users) : le cousin pourrait être Backend Lead/CTO, le frère Frontend Lead, l'ami DevOps Lead
- **Bénéfices:** Rentable, préservation de la connaissance (ils connaissent le codebase dès le jour 1), loyauté (investissement émotionnel), zéro surprise (les connaître avant l'embauche), pipeline de mentorat naturel
- **Guardrail critique:** Rester professionnel (payer des taux de marché équitables même pour les stagiaires, contrats clairs, progression au mérite, pas de favoritisme qui abîme la culture)
- **Impact plus large:** Créer du talent tech local au Togo, prévenir la fuite des cerveaux, garder les gens talentueux au pays avec de bons salaires et des opportunités de croissance

---

## 🧭 MINDSET & ENGAGEMENT DU FOUNDER

- Engagé dans une exécution graduelle : « Même si c'est compliqué, je commencerai petit à petit et j'améliorerai en chemin »
- « Je n'ai pas besoin de tout savoir dans ma tête — les documents sont là pour que je les consulte quand j'en ai besoin »
- Bon mindset startup : construire la structure tôt (mentalement), scaler graduellement (opérationnellement), améliorer en route
- « Avec une bonne équipe autour de moi, il y aura beaucoup moins de concurrence » — l'équipe est un avantage compétitif
- Courageux et prêt à aborder la complexité de façon incrémentale plutôt que d'être paralysé
- Philosophie personnelle : les documents sont une boussole (guidance), pas une prison ; ajuster selon le marché/les utilisateurs mais garder la même destination

---

## 🔗 LIEN AVEC LE GUIDE V4 (Exécution court-terme)

- **Execution Plan** (ce document) = Roadmap long-terme (Phases 1-5, embauche, budgets, 5 ans)
- **V4 Guide / Guide Master Unifié** = Exécution court-terme (Days 0-30, comment construire le MVP, prompts)
- Les deux sont complémentaires : le V4 est **comment tu exécutes la Phase 1** de ce plan d'exécution
- Stratégie technique MVP : « Build Foundation + Use Immediately » — construire complètement les systèmes critiques (Payment, Validation, Locking) dès le MVP, les activer en Phase 2+ sans refactoring

---

**Engagement personnel d'Elias :** Suivre cette roadmap d'aussi près que possible, ajuster uniquement selon le feedback/les métriques réels du marché, ne jamais embaucher avant que le revenu ne le justifie.

---

**Document maintenu par:** Elias
**Date:** 30 août 2026
