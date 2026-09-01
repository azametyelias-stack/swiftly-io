# 📊 GRAPH_REPORT — Swiftly.io Architecture Map

## 🎯 God Nodes (Concepts clés du projet)

### 1. Authentication System
- **Fichiers clés:** `/api/auth.ts`, `/utils/jwt.ts`, `/pages/login.tsx`, `/pages/register.tsx`
- **Connecté à:** User model, Sessions, Role-based access
- **Critique pour:** Sécurité, Gestion d'accès
- **Status:** MVP = Invitation code

### 2. Payment System
- **Fichiers clés:** `/api/payments.ts`, `/models/transactions.ts`, `/utils/paystack.ts`
- **Connecté à:** Accounts, Balances, Ledger
- **Critique pour:** Revenue, Transactions
- **Status:** Foundation PROMPT #PAYMENT (Day 9)

### 3. Accounts & Balances
- **Fichiers clés:** `/models/accounts.ts`, `/api/accounts.ts`, `/pages/dashboard.tsx`
- **Connecté à:** Users, Transactions, Reports
- **Critique pour:** Data core, Financial tracking
- **Status:** MVP core

### 4. Input Validation
- **Fichiers clés:** `/utils/validation/zod-schemas.ts`, `/middleware/validate.ts`
- **Connecté à:** Toutes les API
- **Critique pour:** Sécurité, Data integrity
- **Status:** Foundation PROMPT #INPUT (Day 10)

### 5. Transaction Locking & Concurrency
- **Fichiers clés:** `/db/locks.ts`, `/api/transactions.ts`
- **Connecté à:** Payments, Accounts, Database
- **Critique pour:** Data consistency
- **Status:** Foundation PROMPT #TRANSACTIONS (Day 11)

---

## 📁 File Relationships (Connexions importantes)

---

## 🏗️ Architecture Diagram (Vue d'ensemble)

---

## 🔐 Security Integration

- **Validation:** All API inputs → Zod schemas (/utils/validation/)
- **Auth:** JWT tokens → middleware/auth.ts
- **Payments:** PCI compliance → utils/paystack.ts + webhooks
- **Transactions:** ACID compliance → db/locks.ts + ledger

---

## 🧪 Testing Coverage

- **Unit tests:** Jest → /tests/unit/
- **Integration tests:** Jest → /tests/integration/
- **E2E tests:** Playwright → /tests/e2e/
- **Load tests:** K6 → /tests/load/

---

## 📊 Token Savings with GRAPH_REPORT

---

## 📌 Key Touchpoints (Où Niveau 1 renvoie vers Niveau 2)

1. **Validation (PROMPT #9)** → renvoie vers **PROMPT #INPUT** (Zod)
2. **Webhooks (PROMPT #17)** → renvoie vers **PROMPT #PAYMENT** (structure)
3. **Money screens (08-10)** → renvoie vers **PROMPT #PAYMENT** + **PROMPT #TRANSACTIONS**

---

**Version:** 1.0 — Créé le 31 Août 2026
**Auteur:** Elias + Claude
**Pour:** Claude Code handoff
