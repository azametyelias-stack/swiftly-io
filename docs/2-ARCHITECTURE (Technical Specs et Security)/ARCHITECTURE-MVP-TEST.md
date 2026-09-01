# 🏗️ ARCHITECTURE MVP TEST — SWIFTTRACK
**Pour tester avec 5-10 personnes (Version simplifiée & gratuite)**

**Vs:** ARCHITECTURE-CLAUDE-CODE.md (production-ready)
**Utilisé lors du:** Phase de test avec beta users
**Coût:** $0/mois
**Durée de vie:** 1-3 mois (après → passer à production)

---

> ## 🔄 MISE À JOUR (31 août 2026) — Alignée sur la stratégie Build Foundation
>
> **Statut : valide ✅, avec une correction importante sur le schema.** Cette architecture
> test « simplifiée gratuite » reste la bonne pour le MVP 5-10 users. Mais un point a été
> corrigé pour éviter une dette technique en Phase 2 :
>
> | Élément | Ancienne valeur | Valeur corrigée (à jour) |
> |---|---|---|
> | IDs des tables | **BIGSERIAL** | **UUID** (sharding-ready dès le MVP) |
> | Coût affiché | $0/mois | $0/mois MVP → **$180-200/mois** Phase 2 (inchangé) |
> | Validation | Zod (non nommé) | **Zod, fondation PROMPT #INPUT** (nommée) |
> | Next.js | 14+ | **16.3.3** |
>
> **Pourquoi UUID et pas BIGSERIAL, même en test :** on a acté que le schema MVP doit être
> **prêt pour 1M users sans refactoring**. UUID est sharding-ready ; BIGSERIAL forcerait une
> migration douloureuse en Phase 2. « Simplifié » veut dire moins d'optimisation (pas de
> partitioning, pas de replicas), PAS un schema jetable. La base reste 100% compatible avec
> `ARCHITECTURE-CLAUDE-CODE.md` (production) — on scale graduellement, on ne réécrit rien.
>
> **Lien Build Foundation :** cette archi test est ce que Claude Code met en place aux
> Days 9-11 en mode « fondation ». Le schema (Payment), la validation (Input/Zod) et le
> locking (Transactions) sont construits complets ici, activés en Phase 2. Détail dans le
> **Guide Master Unifié**, Section 7.
>
> Les corrections sont appliquées directement dans le texte ci-dessous. Le reste est conservé.

---

## 1. Vue d'ensemble simplifiée

```
┌──────────────────────────────────────────────┐
│          UTILISATEURS (5-10)                  │
└─────────────────┬──────────────────────────────┘
                  │
         ┌────────┴──────────┐
         │                   │
    ┌────▼────┐         ┌────▼────────┐
    │Vercel   │         │Supabase      │
    │(FREE)   │         │(FREE)        │
    └────┬────┘         └────┬────────┘
         │                   │
         │           ┌───────┴────────┐
         │           │                │
         │       ┌───▼──────┐    ┌───▼─────┐
         │       │PostgreSQL│    │Upstash  │
         │       │(Single)  │    │(Cache)  │
         │       └──────────┘    └─────────┘
         │
    ┌────▼────────────────┐
    │ Cloudflare (FREE)   │
    │ CDN + DDoS          │
    └─────────────────────┘
```

**Différences avec Production :**
- ✅ 1 seule instance Vercel (au lieu de 10+)
- ✅ 1 PostgreSQL (pas de replicas)
- ✅ 1 Redis single (pas de cluster)
- ✅ Pas de monitoring avancé (Sentry seul)
- ✅ Structure simplicité (pas de sharding)

---

## 2. Stack technique (simplifié)

### **Frontend**
- Next.js 14+ (TypeScript)
- Tailwind CSS
- Framer Motion (animations)
- Recharts (graphiques)
- TanStack Query (caching côté client)

### **Backend**
- Next.js API Routes (simple, pas de framework complexe)
- Supabase Auth (code d'invite)
- Supabase PostgreSQL (une seule database)

### **Caching**
- Redis Upstash (sessions + cache dashboard)
- Browser cache (assets statiques)

### **Infrastructure**
- **Hosting :** Vercel (1 instance, gratuit)
- **Database :** Supabase PostgreSQL (500MB gratuit, suffisant pour 5 users)
- **Cache :** Upstash Redis (10K commands/jour, suffisant)
- **CDN :** Cloudflare (gratuit)

---

## 3. Structure du code (allégée)

```typescript
/app
  /dashboard
    page.tsx (simpler, pas de optimization avancée)
  /transactions
    flux-transaction.tsx (même que production)
  /statistiques
    page.tsx

/api
  /auth
    /verify-code.ts
  /dashboard
    /index.ts
  /transactions
    /index.ts (CRUD simple)
  /accounts
    /index.ts

/lib
  /supabase.ts (client simplifié)
  /redis.ts (cache basique)

/components (réutilisables, mais moins d'optimisation)
```

**Vs Production :** Moins de code splitting, de lazy loading, de memoization — juste du code fonctionnel.

---

## 4. Database Schema (TEST)

**Même que production, mais :** SANS partitioning

```sql
-- Tables de base (aucun partitioning nécessaire pour 5 users)
-- NOTE (maj 31 août 2026): UUID (pas BIGSERIAL) = sharding-ready dès le MVP,
-- zéro refactoring en Phase 2. DECIMAL pour l'argent (jamais FLOAT).
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50),
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  balance DECIMAL(15,2),
  type VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(15,2),
  category VARCHAR(50),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes minimalistes (mais positionnés pour scaler: user_id + created_at)
CREATE INDEX idx_transactions_user_id ON transactions(user_id, created_at DESC);
```

**Limites (assumées en test) :**
- ❌ Pas de partitioning (pas besoin pour 5 users — activable en Phase 3+ sans changer le schema)
- ❌ Pas de read replicas
- ❌ Pas d'optimization avancée
- ✅ MAIS : UUID + DECIMAL + indexes = schema prêt pour 1M users, aucun refactoring plus tard

---

## 5. Caching (basique)

```typescript
// Redis cache simple
export async function getDashboard(userId: string) {
  const cacheKey = `dashboard:${userId}`
  
  // Check Redis
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)
  
  // Query DB
  const data = await db.dashboard.query(userId)
  
  // Cache 5 min
  await redis.setex(cacheKey, 300, JSON.stringify(data))
  
  return data
}
```

**Pas de :**
- ❌ Redis cluster
- ❌ Cache invalidation complexe
- ❌ Layered caching

---

## 6. API Endpoints (simplifié)

```typescript
// GET /api/dashboard
// Simple query, pas de optimization

// POST /api/transactions
// Insert basique, pas de batch operations

// GET /api/accounts
// List simple, pas de pagination ultra-optimisée
```

**Pas de :**
- ❌ Pagination complexe
- ❌ Filtering avancé
- ❌ Batch operations

---

## 7. Performance (basique)

```typescript
// Frontend
- Code splitting basique (Next.js default)
- Images optimisées (next/image)
- Pas de virtual scrolling (listes courtes)

// Backend
- Indexes simples (user_id, date)
- Cache Redis pour dashboard
- Pas d'optimisation de queries complexes
```

**Suffisant pour :**
- ✅ 5-10 users
- ✅ <100 transactions/jour
- ✅ Response time <500ms

---

## 8. Monitoring (minimal)

```typescript
// Sentry pour les erreurs
import * as Sentry from "@sentry/nextjs"
Sentry.captureException(error)

// Vercel Analytics
import { Analytics } from '@vercel/analytics/react'

// Rien d'autre (Datadog pas nécessaire)
```

**Pas de :**
- ❌ Datadog
- ❌ Dashboard temps-réel
- ❌ Alertes complexes

---

## 9. Security (basique mais valide)

```typescript
// Input validation
import { z } from 'zod'
const schema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1)
})

// Auth middleware simple
export async function withAuth(handler: Function) {
  return async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })
    
    const user = await supabase.auth.getUser(token)
    req.userId = user.id
    
    return handler(req, res)
  }
}

// Rate limiting (simple)
// Vercel inclut des limits de base
```

**Pas de :**
- ❌ DDoS protection avancée
- ❌ WAF (Web Application Firewall)
- ❌ Encryption au repos

---

## 10. Scalability après test

**Roadmap pour passer à Production :**

```
Phase Test (maintenant) → Maintenance
  - 1 Vercel instance
  - 1 PostgreSQL
  - 1 Redis
  - Coût: $0/mois

Phase Growth (10K users) → Production
  - 3-5 Vercel instances + autoscaling
  - PostgreSQL scaled
  - Redis cluster 3 nodes
  - Datadog monitoring
  - Coût: $500-1000/mois

Migration:
1. Garder le même code (100% compatible)
2. Ajouter indexes de partitioning
3. Lancer read replicas
4. Setup Redis cluster
5. Enable autoscaling
6. Activate monitoring
7. Load test
```

---

## 11. Deployment

```bash
# Vercel (automatique)
git push origin main
# Déploie en 2 min
```

---

## 12. Testing

```typescript
// Jest (tests unitaires)
describe('calculateScore', () => {
  it('calcule la liberté financière', () => {
    expect(calculateFinancialFreedom(500, 2000)).toBe(25)
  })
})

// Manuel (pour 5 users, assez!)
- Test signup avec 5 codes
- Test créer transaction
- Test voir dashboard
- Test rapport
```

---

## 13. Limitations connues (acceptées en test)

| Limitation | Impacte | Solution après test |
|---|---|---|
| 1 instance | Downtime possible | Ajouter replicas + autoscaling |
| Pas de cache intelligent | Slow queries | Partitioning + read replicas |
| Monitoring minimal | Difficile debugger | Datadog + Sentry complet |
| Pas de CDN avancé | Pas de perf globale | Custom CDN (Cloudflare Pro) |
| Pas de sharding | Limité à 1M transactions | Sharding par user_id |

**Mais pour 5 users :** Aucun de ces problèmes n'apparaît! ✅

---

## 14. Checklist avant de tester

- [ ] Vercel déployé
- [ ] Supabase database créée
- [ ] Redis Upstash connecté
- [ ] Variables d'environnement configurées
- [ ] 5 codes d'invite générés
- [ ] Dashboard teste en local
- [ ] Deployed sur Vercel (live)
- [ ] 5 amis reçoivent les codes
- [ ] Test de bout en bout (signup → créer transaction → voir rapport)

---

## 15. Quand migrer vers Production

Migrate vers ARCHITECTURE-CLAUDE-CODE.md quand :
- [ ] >100 utilisateurs actifs
- [ ] >10K transactions en database
- [ ] Response time > 1 second (au lieu de <500ms)
- [ ] Besoin de monitoring temps-réel
- [ ] Planification de croissance globale
- [ ] Besoin de SLA (uptime guarantee)

---

## 16. Support pour le test

**Pour du support pendant le test :**
- Sentry pour les erreurs
- Vercel logs pour les deployments
- Supabase SQL console pour déboguer
- Local testing avec `npm run dev`

---

**Voilà! Une architecture test gratuite, simple, et extensible. 🚀**

Après le test avec tes 5 amis, tu migres vers ARCHITECTURE-CLAUDE-CODE.md pour la production.

C'est la même base de code — juste scale graduellement!
