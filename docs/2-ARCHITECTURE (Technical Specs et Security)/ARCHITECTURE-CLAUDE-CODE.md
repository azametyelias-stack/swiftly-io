# 📐 DOCUMENT D'ARCHITECTURE TECHNIQUE POUR CLAUDE CODE
**SwiftTrack MVP — Stack technique et Infrastructure**

**Date** : 22 juillet 2026 (màj 31 août 2026)
**Destinataire** : Claude Code
**Objectif** : Expliquer la structure technique complète avant de coder

---

> ## 🔄 MISE À JOUR (31 août 2026) — Détails alignés sur l'état actuel
>
> **Statut : excellent, c'est le document d'architecture production de référence ✅.**
> Le schema (UUID, DECIMAL, partitioning, RLS, indexes user_id+created_at) et la sécurité
> (JWT + refresh) sont déjà alignés avec la stratégie Build Foundation. Corrections mineures :
>
> | Élément | Ancienne valeur | Valeur à jour |
> |---|---|---|
> | Nombre d'écrans | 19 écrans | **22 écrans** |
> | Next.js | ^14.0.0 | **16.3.3** |
> | Coût Phase 1 (MVP) | ~$100/mois | **$0/mois** (free tiers: Vercel/Supabase/Upstash/Sentry) |
> | Coût Phase 2 | ~$300/mois | **$180-200/mois** (paid tiers) |
>
> **Lien Build Foundation :** l'« Ordre de développement recommandé » (§7) est complété par
> les 3 fondations des Days 9-11 — **PROMPT #PAYMENT** (schema + API), **PROMPT #INPUT**
> (validation Zod), **PROMPT #TRANSACTIONS** (locking DB). La validation d'input (§8.3) se
> fait avec **Zod** (jamais express-validator). Détail complet : Guide Master Unifié, Section 7.
>
> Corrections appliquées dans le texte. Le reste (schema, API, sécurité) est conservé tel quel.

---

## 1. Vue d'ensemble de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UTILISATEUR                              │
│                   (Navigateur / Mobile Web)                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTPS (sécurisé)
                         │
         ┌───────────────┴───────────────┐
         │                               │
    ┌────▼────┐                  ┌──────▼──────┐
    │ Vercel  │                  │ Cloudflare  │
    │ (CDN)   │                  │ (CDN + Cache)
    └────┬────┘                  └──────┬──────┘
         │                               │
         └───────────────┬───────────────┘
                         │
                    Next.js App
                    (Frontend + API Routes)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼────┐     ┌─────▼──────┐   ┌────▼──────┐
    │ Supabase       │ Redis      │   │ External │
    │ PostgreSQL     │ Cache      │   │ APIs     │
    │ (Database)     │ (Memory)   │   │ (Email.. │
    └────────┘     └────────────┘   └──────────┘
```

---

## 2. Composants détaillés

### 2.1 Frontend (Next.js)

**Qu'est-ce que c'est :**
- Single Page Application (SPA)
- Utilise React pour l'UI
- TypeScript pour la sécurité
- Tailwind CSS pour le styling

**Structure du projet :**
```
swifttrack/
├── app/
│   ├── layout.tsx          (Layout global)
│   ├── page.tsx            (Home page)
│   ├── dashboard/
│   │   └── page.tsx        (Dashboard page)
│   ├── historiques/
│   │   └── page.tsx        (Historiques page)
│   ├── api/
│   │   ├── auth/
│   │   │   ├── verify-code.ts
│   │   │   └── profile.ts
│   │   ├── transactions/
│   │   │   ├── route.ts    (GET/POST transactions)
│   │   │   └── [id].ts     (GET/PUT/DELETE single)
│   │   ├── accounts/
│   │   ├── budgets/
│   │   ├── reports/
│   │   └── ...
│   └── components/
│       ├── Dashboard/
│       ├── TransactionForm/
│       ├── Chart/
│       └── ...
├── lib/
│   ├── supabase.ts         (Client Supabase)
│   ├── redis.ts            (Client Redis)
│   ├── api.ts              (Helpers API)
│   └── utils.ts
├── styles/
│   └── globals.css         (Tailwind + custom CSS)
├── public/
│   ├── background.png      (Asset fond)
│   └── logo.svg
└── package.json
```

**Dépendances clés :**
```json
{
  "dependencies": {
    "next": "^16.3.3",
    "react": "^18.0.0",
    "@supabase/supabase-js": "^2.30.0",
    "redis": "^4.6.0",
    "recharts": "^2.8.0",
    "tailwindcss": "^3.3.0",
    "framer-motion": "^10.0.0",
    "lucide-react": "^0.263.0"
  }
}
```

**Pages/Routes principales :**
```
/                          Landing page
/connexion/code            Connexion par code invite
/connexion/username        Saisie nom d'utilisateur
/dashboard                 Dashboard principal
/statistiques              Statistiques + Score financier
/historiques               Historique complet
/comptes                   Gestion des comptes
/templates                 Gestion des templates
/budgets                   Gestion des budgets
/projets                   Gestion des projets
/alertes                   Alertes & Notifications
/aides                     Aide explicative
/rapport                   Rapport mensuel/annuel
/nouvelle-transaction      Flux multi-étape transaction
/parametres                Profil & Paramètres
```

### 2.2 Database (Supabase + PostgreSQL)

**Qu'est-ce que c'est :**
- PostgreSQL database managée
- Authentification JWT intégrée
- Webhooks pour événements
- Backup automatique
- Row Level Security (sécurité)

**Schema PostgreSQL :**

```sql
-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  invite_code VARCHAR(20) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ACCOUNTS TABLE
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- Cash, Mobile, Bancaire, Carte
  balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'XOF',
  monthly_fees DECIMAL(15,2),
  fee_type VARCHAR(10), -- fixed, percentage
  provider VARCHAR(50), -- For Mobile accounts
  is_favorite BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_created_at ON accounts(created_at);

-- CATEGORIES TABLE
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20), -- Dépense, Revenu, Both
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- TRANSACTIONS TABLE (PARTITIONED)
CREATE TABLE transactions (
  id BIGSERIAL,
  user_id UUID NOT NULL,
  type VARCHAR(20) NOT NULL, -- Dépense, Revenu, Transfert
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  category_id UUID REFERENCES categories(id),
  account_source_id UUID REFERENCES accounts(id),
  account_destination_id UUID REFERENCES accounts(id),
  linked_to_type VARCHAR(20), -- Personne, Projet
  linked_to_id UUID,
  notes TEXT,
  recurrence VARCHAR(20), -- Une Fois, Quotidien, Hebdo, Mensuel, Annuel
  recurrence_end_date DATE,
  status VARCHAR(20) DEFAULT 'Effectué', -- Effectué, Planifié, Remboursé
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions par mois
CREATE TABLE transactions_2024_01 PARTITION OF transactions
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE transactions_2024_02 PARTITION OF transactions
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... etc

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);

-- BUDGETS TABLE
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  limit_amount DECIMAL(15,2) NOT NULL,
  alert_threshold DECIMAL(3,0) DEFAULT 92, -- Alert at 92%
  period VARCHAR(20) DEFAULT 'Mensuel', -- Mensuel, Annuel
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- PROJECTS TABLE
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- Construction, Acquisition, Investissement, etc.
  target_amount DECIMAL(15,2),
  current_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Actif', -- Actif, Archivé, Complété
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- TEMPLATES TABLE
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20), -- Dépense, Revenu
  amount DECIMAL(15,2),
  category_id UUID REFERENCES categories(id),
  account_id UUID REFERENCES accounts(id),
  linked_to_type VARCHAR(20),
  linked_to_id UUID,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_templates_user_id ON templates(user_id);

-- PEOPLE TABLE
CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  relationship VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_people_user_id ON people(user_id);

-- ALERTS TABLE
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20), -- Alerte, Notification Programmée, Transiente
  title VARCHAR(200),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_alerts_user_id_created ON alerts(user_id, created_at DESC);

-- REPORTS TABLE
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(20), -- monthly, annual
  period_month INT,
  period_year INT,
  score_global DECIMAL(5,2),
  liberté_financière DECIMAL(5,2),
  taux_investissement DECIMAL(5,2),
  taux_épargne DECIMAL(5,2),
  diversification INT,
  projection_months INT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reports_user_period ON reports(user_id, period_year, period_month);

-- ROW LEVEL SECURITY (Chaque utilisateur ne voit que ses propres données)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only see their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Indexing strategy :**
```sql
-- Indexing critique pour performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Pour les queries analytiques
CREATE INDEX idx_transactions_category_user ON transactions(user_id, category_id);
```

**Coûts :**
- MVP: $25/mois (Supabase Free → Pro)
- Growth: $100/mois (Supabase Standard)
- Scale: $500+/mois (Supabase Enterprise)

### 2.3 Cache (Redis)

**Qu'est-ce que c'est :**
- In-memory data store (très rapide)
- Mémorise les données fréquemment accessibles
- TTL (Time To Live) : données expirent auto

**Utilisation dans SwiftTrack :**

```typescript
// Redis keys structure
dashboard:{userId}                    // Cache dashboard
stats:{userId}:{year}-{month}        // Cache statistiques
report:{userId}:{year}-{month}       // Cache rapport
account-balance:{accountId}          // Cache solde compte

// Exemples de cache:
redis.setex('dashboard:user123', 300, JSON.stringify({
  solde: 50000,
  revenus: 12000,
  dépenses: 5000
})); // Cache 5 minutes

redis.setex('report:user123:2024-07', 3600, JSON.stringify({
  score: 72,
  liberté: 35,
  épargne: 20
})); // Cache 1 heure
```

**Invalidation strategy :**

```typescript
// Quand utilisateur crée transaction
async function createTransaction(userId, data) {
  const transaction = await db.transactions.create(data);
  
  // Invalide les caches affectés
  await redis.del(`dashboard:${userId}`);
  await redis.del(`stats:${userId}:${currentMonth}`);
  await redis.del(`report:${userId}:${currentMonth}`);
  
  return transaction;
}
```

**Coûts :**
- MVP: $30/mois (Redis single instance)
- Growth: $100/mois
- Scale: $300+/mois (Redis cluster)

### 2.4 Authentification

**JWT (JSON Web Tokens) :**

```typescript
// User logs in with code:
POST /api/auth/verify-code
{
  code: "123456"
}

Response:
{
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  user_id: "uuid-123",
  username: "elias"
}

// Token stocké dans localStorage/cookie
// Envoyé dans Authorization header à chaque request:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabase Auth :**
- Gère tokens JWT automatiquement
- Support sessions (token refresh)
- Row Level Security intégré

---

## 3. API Routes (Next.js)

### 3.1 Authentication

```typescript
// POST /api/auth/verify-code
// Vérifie le code invite 6 chiffres
// Response: JWT token + user data

// POST /api/auth/profile
// Crée/met à jour le profil utilisateur
// Response: Updated user profile

// POST /api/auth/logout
// Logout utilisateur
```

### 3.2 Transactions

```typescript
// GET /api/transactions?limit=20&offset=0&user_id=...
// Récupère les transactions paginées
// Utilise Redis cache

// POST /api/transactions
// Crée une nouvelle transaction
// Invalide cache dashboard/stats/report

// GET /api/transactions/[id]
// Récupère une transaction spécifique

// PUT /api/transactions/[id]
// Met à jour une transaction

// DELETE /api/transactions/[id]
// Supprime une transaction (soft delete recommandé)
```

### 3.3 Accounts

```typescript
// GET /api/accounts
// Liste les comptes de l'utilisateur

// POST /api/accounts
// Crée un nouveau compte

// GET /api/accounts/[id]
// Récupère détails d'un compte

// PUT /api/accounts/[id]
// Met à jour un compte

// DELETE /api/accounts/[id]
// Archive/supprime un compte
```

### 3.4 Reports

```typescript
// GET /api/reports?year=2024&month=7
// Récupère le rapport mensuel
// Génère si n'existe pas
// Utilise Redis cache 1 heure

// GET /api/reports/annual?year=2024
// Rapport annuel
```

### 3.5 Statistics

```typescript
// GET /api/statistics?type=overview&period=month
// Récupère statistiques
// Types: overview, depense, revenu, patrimoine
```

---

## 4. Déploiement

### 4.1 Vercel (Frontend + API Routes)

**Vercel** = Plateforme pour déployer Next.js

```bash
# Deploy automatique à chaque push
git push origin main
# → Vercel build automatiquement
# → Deploy en production
```

**Avantages :**
- Autoscaling automatique
- CDN global intégré (Cloudflare)
- Environment variables managées
- Preview deployments
- Analytics intégré

**Coûts :**
- Free: $0 (MVP)
- Pro: $20/mois (growth)
- Enterprise: Custom pricing

### 4.2 Supabase (Database)

Pas besoin de déployer, tout est géré.

---

## 5. Monitoring & Logging

### 5.1 Supabase Logs

```
Visualiser les requêtes database en temps réel
Identifier les slow queries
Voir les erreurs
```

### 5.2 Vercel Monitoring

```
Response time par fonction
Error rate
CPU usage
Memory usage
```

### 5.3 Custom Logging (optionnel)

```typescript
// Log les erreurs importants
console.error(`[ERROR] ${timestamp} - ${message}`, error);

// Log les slow queries
if (queryTime > 500) {
  console.warn(`[SLOW QUERY] ${queryTime}ms - ${query}`);
}
```

---

## 6. Scalabilité par étape

### Phase 1 (MVP - 0-1000 users)

```
Architecture:
- 1 Vercel deployment
- 1 PostgreSQL (Supabase Free)
- 1 Redis (optional)

Coûts: $0/mois (free tiers)
```

### Phase 2 (Growth - 1K-10K users)

```
Architecture:
- Vercel Pro (autoscaling)
- PostgreSQL Supabase Pro
- Redis single instance

Coûts: $180-200/mois (paid tiers)
```

### Phase 3 (Scale - 10K-100K users)

```
Architecture:
- Vercel + AWS ALB load balancer
- PostgreSQL Supabase + Read replicas
- Redis cluster
- S3 + CDN Cloudflare

Coûts: ~$1000/mois
```

### Phase 4 (Million users)

```
Architecture:
- 50+ Next.js instances (autoscaling)
- PostgreSQL sharding
- Redis cluster (3+ nodes)
- Elasticsearch pour recherche
- Kafka pour événements

Coûts: ~$5000+/mois
```

---

## 7. Checklist de code pour Claude Code

### À faire avant de commencer:

- [ ] Setup Supabase project
- [ ] Créer les tables PostgreSQL
- [ ] Setup environment variables (.env.local)
- [ ] Installer les dépendances (npm install)
- [ ] Setup Supabase client (lib/supabase.ts)
- [ ] Créer les API routes de base

### Ordre de développement recommandé:

1. Authentication (Login/Username)
2. Dashboard (affiche les données)
3. Transaction creation (créer transactions)
4. Historiques (afficher transactions)
5. Statistiques (analyse)
6. Autres pages

### Performance checks:

- [ ] Pagination sur toutes les listes (max 20-50 items)
- [ ] Redis cache sur dashboard/stats/reports
- [ ] Indexes créés sur user_id + date
- [ ] Row Level Security configuré
- [ ] Error handling sur toutes les API routes
- [ ] Rate limiting sur les routes sensibles

---

## 8. Sécurité

### 8.1 Authentication

- JWT tokens avec expiration (1 heure)
- Refresh tokens pour sessions longues
- HTTPS obligatoire
- HttpOnly cookies recommandés

### 8.2 Database

- Row Level Security (Supabase)
- Chaque utilisateur voit que ses propres données
- Parameterized queries (prévenir SQL injection)
- Hasher les mots de passe

### 8.3 API

- Rate limiting: Max 100 requests/min par utilisateur
- Input validation sur toutes les données
- CORS configuré correctement
- Logs pour debug (mais pas de données sensibles)

---

## 9. Références pour Claude Code

Tous les détails métier se trouvent dans:
- SCREEN-01 à SCREEN-22 (22 écrans détaillés)
- BRIEF-CLAUDE-DESIGN.md (contexte global)
- DESIGN-GLOBAL.md (design system)

---

**Prêt à coder ? 🚀**

Questions sur l'architecture ? Demande des clarifications avant de commencer!
