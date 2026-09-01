# 🎯 LES 3 PROMPTS: "BUILD FOUNDATION + USE IMMEDIATELY" STRATEGY

**Créé pour:** Claude Code (understanding the 3-prompt approach)  
**Version:** 1.0 - Final (màj 31 août 2026)  
**Status:** Ready for Day 9-11 implementation  

---

> ## 🔄 MISE À JOUR (31 août 2026) — Aligné, correction mineure
>
> **Statut : guide de référence pour les 3 prompts fondation ✅.** Parfaitement aligné avec
> la stratégie Build Foundation. Seule correction : le décompte d'écrans passe de 19 à
> **22 écrans MVP (01-22)** (+ 23-24 réservés Phase 2+, non maquettés).
>
> Rappel des 3 fondations (Days 9-11) :
> - **PROMPT #PAYMENT (Day 9)** : build complet, MVP query le schema, Phase 2 wire Paystack (2-3h)
> - **PROMPT #INPUT (Day 10)** : build + utilisé immédiatement (Zod partout), 0 changement Phase 2
> - **PROMPT #TRANSACTIONS (Day 11)** : build locking, dormant en MVP, activé Phase 2 (1-2h)
>
> Le contenu est conservé tel quel (correction 19→22 appliquée).

---

# 🎓 COMPRENDRE LA STRATÉGIE

## Le Changement de Mindset

**OLD THINKING:**
```
"Les 3 prompts implémentent des systèmes complets.
Ils ne sont pas utilisés dans MVP, c'est juste des fondations futures."
```

**NEW THINKING (Intelligent):**
```
"Les 3 prompts construisent les fondations, mais:
├─ Payment: construit foundation, utilisé Phase 2 (day 60+)
├─ Input: construit ET UTILISE immédiatement dans MVP
└─ Transactions: construit foundation, utilisé Phase 2+ (10K+ users)"
```

**Avantage:** Zéro refactoring Phase 2. Juste "wire et activate".

---

# PROMPT #1: PAYMENT SYSTEM — "BUILD FOUNDATION" APPROACH

## Ce qu'on construit (Complet):

```
✅ Database schema (users, accounts, payments, ledger, webhook_logs)
✅ API endpoint POST /api/pay (structure complete)
✅ Webhook handler POST /webhooks/paystack (structure complete)
✅ Reconciliation job (structure complete)
✅ All tests (Jest unit + integration tests)
```

## Ce qu'on NE fait PAS (Phase 2):

```
❌ Wire Paystack API (not needed MVP)
❌ Real payment processing (users don't send money MVP)
❌ Webhook signature verification with Paystack (Phase 2)
```

## MVP Behavior (Days 1-30):

```typescript
// pages/api/pay.ts (Day 9)
export default async function handler(req, res) {
  const { amount, phone } = req.body;
  
  // Validate using Input system (PROMPT #INPUT)
  const validated = PaymentSchema.parse(req.body); ✅
  
  // Create record in database (schema from PROMPT #PAYMENT)
  const payment = await db.payments.create({
    user_id: req.user.id,
    amount: validated.amount,
    status: 'PENDING',
  });

  // TODO: Phase 2 - Wire Paystack here
  
  return res.status(200).json({
    success: true,
    paymentId: payment.id,
  });
}
```

## Days 12-28 Usage (MVP Screens):

```typescript
// pages/dashboard.tsx (Day 15)
// This screen QUERIES the payment schema from Day 9!

const dashboard = async (userId) => {
  // Query accounts table (created Day 9)
  const accounts = await db.accounts.findMany({
    where: { user_id: userId }
  });
  
  // Query transactions (which are stored in structure from Day 9)
  const transactions = await db.transactions.findMany({
    where: { user_id: userId }
  });
  
  return { accounts, transactions };
};
```

## Phase 2 Activation (Day 60+):

```typescript
// Just fill in the TODO from Day 9!

export default async function handler(req, res) {
  const validated = PaymentSchema.parse(req.body);
  
  const payment = await db.payments.create({
    user_id: req.user.id,
    amount: validated.amount,
    status: 'PENDING',
  });

  // NOW wire Paystack API (new in Phase 2!)
  const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PAYSTACK_KEY}` },
    body: JSON.stringify({
      email: user.email,
      amount: validated.amount * 100, // Kobo
      reference: payment.paystack_reference,
    }),
  });

  return res.status(200).json({
    success: true,
    paymentId: payment.id,
    authorizationUrl: paystackResponse.authorization_url,
  });
}
```

**Result:** 2-3 hours to add Paystack integration, no refactoring needed! ✅

---

# PROMPT #2: INPUT VALIDATION — "BUILD + USE IMMEDIATELY" APPROACH

## Ce qu'on construit (Complet):

```
✅ Zod schemas (Amount, Phone, Email, Currency, Payment, Transaction, etc)
✅ Middleware on ALL routes (validates at start of request)
✅ Clear error messages (user-friendly)
✅ All tests (Jest unit tests, 50+ cases)
```

## Ce qu'on UTILISE immédiatement (Days 12-28):

```
✅ Every form uses Zod validation
✅ Every API endpoint protected by middleware
✅ Data integrity from Day 1
✅ No "fix validation later" debt
```

## MVP Behavior (Days 12-28):

```typescript
// pages/transactions/create-expense.tsx (Day 15)
// Uses validation from Day 10!

import { TransactionSchema } from '@/lib/validation'; // Day 10 ✅

export default function CreateExpense() {
  const [amount, setAmount] = useState('');
  
  async function handleSubmit() {
    try {
      // Zod validation (from PROMPT #INPUT Day 10)
      const data = TransactionSchema.parse({
        amount: parseFloat(amount),
        category,
        type: 'EXPENSE',
      });
      
      // API middleware also validates (from PROMPT #INPUT Day 10)
      const response = await fetch('/api/transactions/create', {
        method: 'POST',
        body: JSON.stringify(data), // Already valid!
      });
      
      showToast('✅ Dépense enregistrée!');
    } catch (error) {
      // Zod validation error
      showToast(`❌ ${error.message}`);
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={amount}
        placeholder="Montant (ex: 15000)"
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit">Confirmer</button>
    </form>
  );
}
```

## Database Protection (All Routes):

```typescript
// lib/middleware/validation.ts (Day 10)
// Protects ALL API endpoints

export async function validateRequest(req) {
  // Middleware validation ALWAYS runs
  // Every endpoint is protected
  // No endpoint forgets validation
}

// pages/api/transactions/create.ts (Day 15)
export default async function handler(req, res) {
  // Middleware validation (Day 10) already ran ✅
  // Input is guaranteed valid!
  
  const { amount, category } = req.body; // Already validated
  
  const transaction = await db.transactions.create({
    user_id: req.user.id,
    amount, // safe!
    category, // safe!
  });
  
  return res.status(200).json({ success: true, transaction });
}
```

## Phase 2+ (No Changes Needed):

```
✅ Same validation middleware works for Phase 2
✅ New "Send Money" screen uses same Zod validation
✅ No refactoring needed
✅ Just add new schemas for new fields (if needed)
```

---

# PROMPT #3: TRANSACTIONS SYSTEM — "BUILD FOUNDATION" APPROACH

## Ce qu'on construit (Complet):

```
✅ Database functions with row-level locking (FOR UPDATE)
✅ update_balance_from_payment() function (atomic, locked)
✅ Concurrency tests (Jest: simultaneous operations work)
✅ Deadlock prevention (retry logic)
✅ Load tests (K6: 1000 concurrent users)
```

## Ce qu'on NE fait PAS (MVP):

```
❌ Call the locking functions (single user = no concurrency)
❌ Activate row-level locking (not needed MVP)
❌ Use in any screen (dormant but tested)
```

## MVP Behavior (Days 1-30):

```typescript
// lib/db.ts (Day 11 - exists but not used)
export async function updateBalanceFromPayment(
  accountId,
  amount,
  paymentId
) {
  // This function EXISTS & is TESTED
  // But NOT CALLED in MVP (single user)
  
  // Uses Supabase RPC with FOR UPDATE locking
  // Prevents race conditions (tested!)
  // Just dormant, waiting for Phase 2
}

// pages/transactions/create-expense.ts (Day 15)
// Does NOT call the locking function
// Single user = no need for locking

export default function CreateExpense() {
  async function handleSubmit() {
    const transaction = await db.transactions.create({
      user_id: req.user.id,
      amount,
      category,
    });
    // Simple insert, no locking needed (one user)
  }
}
```

## Phase 2+ Activation (Day 60+):

```typescript
// pages/wallet/send-money.tsx (PHASE 2, Day 60+)
// NOW we use the locking function from Day 11!

import { updateBalanceFromPayment } from '@/lib/db'; // Day 11 ✅

export default function SendMoney() {
  async function handleSendMoney(amount, recipientPhone) {
    // NOW call the locking function (Phase 2)
    const result = await updateBalanceFromPayment(
      senderAccountId,
      amount,
      paymentId
    );
    
    if (!result.success) {
      showToast(`❌ ${result.error}`); // Insufficient funds
      return;
    }
    
    showToast('✅ Argent envoyé!');
  }
}
```

**Result:** 2-3 hours to activate locking for Phase 2, no refactoring needed! ✅

---

# 📊 TIMELINE: BUILDING VS USING

```
PROMPT #PAYMENT (Day 9):
├─ Build: 6-8 hours (database schema, API structure, tests)
├─ MVP Usage: Query the schema (Days 12-28) ✅
└─ Phase 2: Wire Paystack (2-3 hours, not days!) ✅

PROMPT #INPUT (Day 10):
├─ Build: 4-6 hours (Zod schemas, middleware, tests)
├─ MVP Usage: ACTIVE in every screen (Days 12-28) ✅
└─ Phase 2: Same validation, just add new schemas ✅

PROMPT #TRANSACTIONS (Day 11):
├─ Build: 4-6 hours (locking functions, concurrency tests)
├─ MVP Usage: Dormant (tested but not called) ✅
└─ Phase 2+: Activate locking (2-3 hours, not days!) ✅

TOTAL INVESTMENT: 14-18 hours (Days 9-11)
MVP BENEFIT: Solid foundation, zero technical debt
Phase 2 BENEFIT: Fast integration, zero refactoring ✅
```

---

# 🎯 INSTRUCTIONS FOR CLAUDE CODE

## Day 9 (PROMPT #PAYMENT):

```
✅ Build the ENTIRE payment infrastructure
├─ Database schema complete
├─ API endpoints structured
├─ Webhook handler structured
├─ Reconciliation job structured
└─ All tests passing

❌ Do NOT wire Paystack API
❌ Do NOT make real payments
❌ Do NOT integrate with external payment provider

WHY: MVP doesn't need real payments (local tracking)
     Phase 2 will wire everything (just the TODO part)
     This is the FOUNDATION, not full implementation
```

## Day 10 (PROMPT #INPUT):

```
✅ Build validation system + use immediately
├─ Zod schemas created
├─ Middleware on ALL routes
├─ Tests passing
└─ Ready for all screens (Days 12-28)

❌ Don't hold back validation
❌ Don't say "we'll add validation later"
❌ Don't skip any endpoint

WHY: Input validation is ACTIVE in MVP
     Every screen needs it
     No "fix validation in Phase 2" debt
```

## Day 11 (PROMPT #TRANSACTIONS):

```
✅ Build locking infrastructure + test thoroughly
├─ Database functions with FOR UPDATE
├─ Concurrency tests (2 users, simultaneous)
├─ K6 load tests (1000 concurrent users)
├─ Deadlock prevention
└─ All tests passing

❌ Do NOT call the functions in screens
❌ Do NOT activate locking in MVP
❌ Do NOT add to any screen logic

WHY: Single user MVP = no concurrency
     Phase 2+ with 10K+ users = need locking
     This is the FOUNDATION, tested but dormant
```

---

# 🚀 RESULT: SCALABLE MVP

```
After Days 9-11:
├─ Payment infrastructure READY (not wired Paystack)
├─ Input validation PROTECTING MVP
├─ Transaction locking READY (not activated)
└─ All tests passing ✅

After Days 12-28:
├─ All 22 MVP screens (01-22) built on this foundation
├─ Data integrity from Day 1
├─ Zero technical debt
└─ LIVE Day 30 ✅

After Phase 2 (Day 60+):
├─ Add "Send Money" feature
├─ Wire Paystack (2-3h from PROMPT #PAYMENT foundation)
├─ Activate locking (1h from PROMPT #TRANSACTIONS foundation)
├─ Input validation already protecting (no changes)
└─ LIVE Phase 2 with confidence! ✅

NO REFACTORING NEEDED AT ANY POINT! 🎉
```

---

# ✅ KEY TAKEAWAYS FOR CLAUDE CODE

1. **PROMPT #PAYMENT (Day 9):**
   - Build COMPLETE infrastructure (not just sketches)
   - Don't wire Paystack (Phase 2)
   - Tests pass on the logic layer
   - Deliverable: Ready-to-use schema + endpoints

2. **PROMPT #INPUT (Day 10):**
   - Build AND USE immediately
   - Every screen gets validation
   - No "we'll validate later" excuses
   - Deliverable: Protected MVP from Day 1

3. **PROMPT #TRANSACTIONS (Day 11):**
   - Build COMPLETE locking infrastructure
   - Test thoroughly (concurrency, K6)
   - Don't call in MVP (single user)
   - Deliverable: Ready-to-activate for Phase 2

4. **Days 12-28:**
   - Screens QUERY payment schema (Day 9)
   - Screens USE input validation (Day 10)
   - Transaction functions READY if needed
   - Result: Solid foundation, zero debt

5. **Phase 2+ (Day 60+):**
   - Payment: Just wire Paystack (2-3h)
   - Transactions: Just activate locking (1h)
   - Input: Already protecting (no changes)
   - Result: Fast launch, zero refactoring

---

**This is the "Build Foundation + Use Immediately" strategy that makes Swiftly.io scalable from Day 1!** 🚀
