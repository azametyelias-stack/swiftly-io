# 📋 MISE À JOUR ARCHITECTURE: REST API EXPLICITE
**Tous les documents updatés pour clarifier REST API**

---

> ## 🔄 MISE À JOUR (31 août 2026) — Statut de ce document
>
> **Ce document est un « patch » : il liste des modifications à appliquer aux AUTRES
> documents pour clarifier le choix REST API.** Ces modifications ont été appliquées.
> Il reste utile comme **référence de la décision REST** (pourquoi REST et pas GraphQL,
> les 18 endpoints, le format JSON, les status codes).
>
> | Élément | Ancienne valeur | Valeur à jour |
> |---|---|---|
> | Nombre d'écrans | 19 écrans | **22 écrans** |
> | Choix API | REST (18 endpoints) | **REST confirmé** (inchangé, toujours valide) |
> | Migration GraphQL | Phase 3+ | **Phase 3+ si besoin** (inchangé) |
>
> **Décision REST toujours actée ✅ :** REST reste le bon choix pour le MVP (simple, rapide,
> mobile-friendly, testable). La migration GraphQL n'est envisagée qu'en Phase 3+ si un vrai
> besoin apparaît. Rien à changer sur le fond — juste 19→22 écrans.
>
> **Note de cohérence :** la validation d'input de ces endpoints REST utilise **Zod**
> (fondation PROMPT #INPUT), et les endpoints paiement/transactions s'appuient sur les
> fondations **PROMPT #PAYMENT** et **PROMPT #TRANSACTIONS** (Guide Master Unifié, Section 7).
>
> Correction 19→22 appliquée ci-dessous. Le reste est conservé tel quel.

---

# **DOCUMENTS À METTRE À JOUR**

## **1. ARCHITECTURE-MVP-TEST.md**

```
SECTION: BACKEND ARCHITECTURE

AVANT:
"API Routes: Next.js API Routes pour le backend"

APRÈS (UPDATED):
"API ARCHITECTURE: REST API ✅

Backend Technology: Next.js API Routes (REST)
├─ 18 REST endpoints
├─ HTTP methods: GET, POST, PUT, DELETE
├─ JSON responses
├─ JWT authentication
├─ Error handling & validation
├─ Rate limiting
└─ Database: Supabase (PostgreSQL)

WHY REST (not GraphQL):
├─ Simple & fast to implement ✅
├─ Perfect for MVP (Phase 1-2)
├─ No over-engineering
├─ Easy to understand
├─ Bandwidth efficient for mobile
└─ Can migrate to GraphQL in Phase 3+ if needed

Endpoints (18 total):

AUTHENTICATION:
├─ POST /api/auth/signup
├─ POST /api/auth/login
├─ POST /api/auth/verify-code
└─ POST /api/auth/logout

USERS:
├─ GET /api/users/me
└─ PUT /api/users/me

ACCOUNTS:
├─ GET /api/accounts
├─ POST /api/accounts
├─ GET /api/accounts/:id
├─ PUT /api/accounts/:id
└─ DELETE /api/accounts/:id

TRANSACTIONS:
├─ GET /api/accounts/:accountId/transactions
├─ POST /api/accounts/:accountId/transactions
└─ GET /api/transactions/:id

STATISTICS:
├─ GET /api/users/me/stats
└─ GET /api/accounts/:id/stats

SETTINGS:
├─ GET /api/settings
└─ PUT /api/settings"
```

---

## **2. ARCHITECTURE-CLAUDE-CODE.md**

```
SECTION: BACKEND & API DESIGN

AVANT:
"API: Next.js API Routes"

APRÈS (UPDATED):
"API DESIGN: REST Architecture ✅

Backend Framework: Next.js API Routes
API Style: REST (Representational State Transfer)

Design Principles:
├─ Clear resource-based URLs
├─ Standard HTTP methods (GET, POST, PUT, DELETE)
├─ JSON request/response format
├─ Consistent error handling
├─ Proper HTTP status codes
└─ Authentication via JWT tokens

Architecture:
/api
├─ /auth (signup, login, logout, verify)
├─ /users (me, profile)
├─ /accounts (CRUD operations)
├─ /transactions (create, list, detail)
├─ /stats (user & account statistics)
├─ /settings (user preferences)
└─ Middleware for auth, validation, error handling

Why REST (not GraphQL):
✅ Simple & proven architecture
✅ Fast to implement (MVP focus)
✅ Easy to test (Postman, etc)
✅ Standard industry practice
✅ Mobile-friendly (no over-fetching)
❌ GraphQL = overkill for Phase 1
🔄 Can migrate to GraphQL in Phase 3+ if needed

Code Structure:
/api
├─ /auth
│  ├─ signup.js
│  ├─ login.js
│  └─ verify.js
├─ /users
│  └─ me.js
├─ /accounts
│  ├─ index.js (GET POST)
│  ├─ [id].js (GET PUT DELETE)
│  └─ [id]/
│      └─ transactions.js
└─ Middleware
   ├─ auth.js (JWT verification)
   ├─ validation.js (input validation)
   └─ errorHandler.js (error responses)

Response Format (JSON):
Success:
{
  \"success\": true,
  \"data\": { ... }
}

Error:
{
  \"success\": false,
  \"error\": \"Error message\",
  \"code\": \"ERROR_CODE\"
}

Status Codes:
├─ 200 OK (success)
├─ 201 Created (resource created)
├─ 400 Bad Request (validation error)
├─ 401 Unauthorized (no auth)
├─ 403 Forbidden (no permission)
├─ 404 Not Found
├─ 500 Server Error
└─ 429 Too Many Requests (rate limit)

Performance:
├─ API response time: <100ms
├─ Database queries optimized
├─ Caching via Upstash Redis
├─ CDN via Cloudflare
└─ Result: Ultra-fast fintech app ⚡"
```

---

## **3. SETUP-MVP-GRATUIT.md**

```
SECTION: ARCHITECTURE DECISIONS

AVANT:
"Backend: API Routes"

APRÈS (UPDATED):
"BACKEND ARCHITECTURE: REST API ✅

Technology Stack:
├─ Frontend: Next.js + React
├─ Backend: Next.js API Routes (REST)
├─ Database: Supabase (PostgreSQL)
├─ Cache: Upstash (Redis)
├─ Hosting: Vercel
└─ CDN: Cloudflare

API Design: REST
├─ 18 REST endpoints
├─ Standard HTTP methods
├─ JSON format
├─ JWT authentication
└─ Rate limiting

Why REST (not GraphQL)?
✅ Simpler to implement
✅ Faster development
✅ Perfect for MVP
✅ Industry standard
❌ GraphQL considered for Phase 3+

Setup Steps:
1. Code REST API endpoints
2. Add authentication (JWT)
3. Add database queries
4. Add validation & error handling
5. Deploy to Vercel
6. Test with Postman/Insomnia
7. Ready for production!"
```

---

## **4. CAS1-VS-CAS2-STRATEGIE-PRODUCTION.md**

```
SECTION: IMPLEMENTATION GUIDANCE

AVANT:
"Code les 22 écrans avec Next.js + Tailwind.
Utilise couleurs basiques, design simple mais fonctionnel."

APRÈS (UPDATED):
"Code avec REST API + 22 écrans

BACKEND (REST API):
├─ Create 18 REST endpoints
├─ /api/auth/* (signup, login, logout, verify)
├─ /api/users/* (me, profile)
├─ /api/accounts/* (CRUD)
├─ /api/transactions/* (create, list, detail)
├─ /api/stats/* (statistics)
├─ /api/settings/* (preferences)
├─ Add JWT authentication
├─ Add input validation
├─ Add error handling
└─ Add rate limiting

FRONTEND (22 écrans):
├─ Auth screens (login, signup, verify)
├─ Dashboard (balance, recent transactions)
├─ Accounts (list, create, detail, manage)
├─ Transactions (list, detail, create)
├─ Statistics (charts, analysis)
└─ Settings (profile, security, preferences)

INTEGRATION:
├─ Frontend calls REST API
├─ API returns JSON data
├─ Frontend displays in skeleton loaders
├─ Smooth animations
└─ Responsive design

Architecture: Simple but solid!
┌─────────────┐
│   Frontend  │ (22 écrans, Tailwind CSS, skeleton loaders)
└──────┬──────┘
       │ (REST API calls)
┌──────▼──────┐
│  REST API   │ (18 endpoints, JWT auth, validation)
└──────┬──────┘
       │ (database queries)
┌──────▼──────┐
│  Supabase   │ (PostgreSQL database)
└─────────────┘"
```

---

# **RÉSUMÉ: TOUS LES UPDATES**

```
✅ Architecture clairement définie: REST API
✅ 18 endpoints listés explicitement
✅ Endpoints structure définie
✅ Response format défini
✅ Status codes définis
✅ Why REST (not GraphQL) expliqué
✅ Performance targets définis
✅ Code structure proposé
✅ Migration path to GraphQL (Phase 3+) mentionné

MAINTENANT: Tous les documents sont clairs! 🎯
```

---

**Fin des mises à jour!**

Maintenant, voyons la liste complète pour Claude Code... 👇
