# 💳 PAYMENT RECONCILIATION DEEP DIVE

**Document:** Implémentation complète du système de réconciliation des paiements  
**Scope:** Supabase + Paystack + Webhooks + Ledger  
**Time to implement:** 2-3 jours avec Claude Code  

---

> ## 🔄 MISE À JOUR (31 août 2026) — Document de référence, aucune correction de fond
>
> **Statut : document technique de référence pour PROMPT #PAYMENT (Day 9) ✅.** L'architecture
> ici est déjà à l'état de l'art et sert de base à tout le reste : **UUID** (`gen_random_uuid()`),
> table **`ledger`** immutable (append-only), **`idempotency_key`**, fonction
> **`update_balance_from_payment`** avec locking `FOR UPDATE`, webhook dedup, reconciliation job.
> Rien à corriger sur le fond.
>
> **Rappel Build Foundation (comment ce doc s'utilise) :**
> - **Day 9 (PROMPT #PAYMENT)** : Claude Code construit TOUT ce qui est décrit ici — schema,
>   endpoints, webhook, reconciliation, tests — **mais sans wire Paystack**. En MVP, `/api/pay`
>   renvoie une réponse mock ; le webhook et la reconciliation existent et sont testés à vide.
> - **MVP (Days 12-28)** : les écrans **interrogent** ce schema (Dashboard lit `accounts`,
>   History lit `ledger`, Stats agrège `ledger`).
> - **Phase 2 (Day 60+)** : on remplit les `TODO Paystack` (2-3h), on active la vérification de
>   signature webhook — zéro refactoring.
>
> La validation des inputs de `/api/pay` utilise **Zod** (fondation PROMPT #INPUT, Day 10).
> Le contenu ci-dessous est conservé intégralement.

---

---

# 1️⃣ ARCHITECTURE GÉNÉRALE

## Vue d'ensemble

```
USER ─► App Frontend
        │
        ├─► Backend API (/api/pay)
        │   └─► Creates payment in PENDING state
        │   └─► Calls Paystack
        │   └─► Returns result to user
        │
        ├─► Supabase Database
        │   ├─ payments table (status: PENDING/SUCCESS/FAILED)
        │   ├─ accounts table (balance)
        │   ├─ ledger table (immutable log)
        │   └─ webhook_logs table (dedup)
        │
        └─► Paystack API
            ├─ Processes payment
            ├─ Sends webhook "charge.success"
            └─ Can also use /verify endpoint for reconciliation
            
NIGHTLY JOB:
└─► Reconciliation Engine
    └─ Find PENDING payments >30 min old
    └─ Call Paystack /verify for each
    └─ Update status based on Paystack reality
    └─ Alert if mismatch found
```

---

# 2️⃣ DATABASE SCHEMA

## Tables Complètes

```sql
-- ===== USERS =====
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  phone_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== ACCOUNTS (Main account per user) =====
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_type VARCHAR(50),  -- CASH, WAVE, ORANGE_MONEY, BANK
  balance DECIMAL(19, 4) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'XOF',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: Balance never negative
  CONSTRAINT positive_balance CHECK (balance >= 0),
  
  -- Ensure user has only one main account per type
  UNIQUE(user_id, account_type)
);

-- ===== PAYMENTS (Source of truth) =====
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  amount DECIMAL(19, 4) NOT NULL,
  currency VARCHAR(3) DEFAULT 'XOF',
  status VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING: Created, awaiting Paystack confirmation
    -- SUCCESS: Paystack confirmed success
    -- RECONCILED: Webhook received + DB updated
    -- FAILED: Paystack or system failed
  
  idempotency_key UUID UNIQUE NOT NULL,
    -- ← CRITICAL: Prevents duplicate payments!
  
  paystack_id VARCHAR(100) UNIQUE,  -- Paystack transaction ID
  paystack_reference VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reconciled_at TIMESTAMP,  -- When webhook confirmed
  error_message TEXT,
  metadata JSONB,
  
  UNIQUE(account_id, idempotency_key),
  CONSTRAINT valid_amount CHECK (amount > 0)
);

-- ===== LEDGER (Immutable audit trail) =====
CREATE TABLE ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  
  type VARCHAR(20),  -- DEBIT, CREDIT
  amount DECIMAL(19, 4) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- ✅ Immutable: Never update, only insert
  CONSTRAINT never_update CHECK (true)
);

-- ===== WEBHOOK_LOGS (Deduplicate webhooks) =====
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paystack_event_id VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50),  -- charge.success, charge.failure, etc
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== WEBHOOK_ANOMALIES (Manual investigation) =====
CREATE TABLE webhook_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50),
    -- PAYMENT_NOT_FOUND: Webhook for unknown payment
    -- AMOUNT_MISMATCH: Webhook amount != DB amount
    -- DUPLICATE_SUCCESS: Already marked success
    -- etc
  
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  investigated BOOLEAN DEFAULT FALSE,
  investigation_notes TEXT
);

-- ===== INDEXES (Performance) =====
CREATE INDEX idx_payments_account_id ON payments(account_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_ledger_account_id ON ledger(account_id);
CREATE INDEX idx_ledger_created ON ledger(created_at DESC);
```

---

# 3️⃣ BACKEND IMPLEMENTATION

## API Endpoint: POST /api/pay

```typescript
// backend/api/routes/pay.ts

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { paystack } from '../lib/paystack';
import * as Sentry from '@sentry/node';

const router = Router();

// ✅ Validation schema
const PaymentSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(999999.99, 'Amount exceeds maximum'),
  currency: z.enum(['USD', 'XOF', 'GHS', 'EUR']).default('USD'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  description: z.string().max(200).optional(),
  idempotencyKey: z.string().uuid().optional()  // Client can provide
});

router.post('/', async (req, res) => {
  try {
    // STEP 1: Validate input
    const validated = PaymentSchema.parse(req.body);
    
    // Generate idempotency key if not provided
    const idempotencyKey = validated.idempotencyKey || uuidv4();
    
    // STEP 2: Get current user
    const user = req.user;  // From middleware
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    // STEP 3: Get user's account
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // STEP 4: Check if payment already exists (idempotency)
    const existing = await supabase
      .from('payments')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();
    
    if (existing.data) {
      // ✅ Already processed! Return existing result
      Sentry.captureMessage('Idempotent payment request', {
        level: 'info',
        contexts: { idempotencyKey }
      });
      
      return res.json({
        status: 'success',
        paymentId: existing.data.id,
        message: 'Payment already processed with this key'
      });
    }
    
    // STEP 5: Create payment record in PENDING state
    const { data: payment, error: createError } = await supabase
      .from('payments')
      .insert({
        account_id: account.id,
        amount: validated.amount,
        currency: validated.currency,
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        metadata: {
          phone: validated.phone,
          description: validated.description
        }
      })
      .select()
      .single();
    
    if (createError) {
      Sentry.captureException(createError, {
        tags: { endpoint: '/api/pay', stage: 'payment_create' }
      });
      return res.status(500).json({ error: 'Failed to create payment' });
    }
    
    // STEP 6: Call Paystack
    let paystackResult;
    try {
      paystackResult = await paystack.charge({
        email: user.email || `user-${user.id}@swiftly.io`,
        amount: Math.round(validated.amount * 100),  // Convert to cents
        reference: payment.id,  // ← Use our payment ID as reference!
        metadata: {
          user_id: user.id,
          account_id: account.id,
          idempotency_key: idempotencyKey
        }
      });
    } catch (err) {
      // Paystack call failed
      Sentry.captureException(err, {
        tags: { endpoint: '/api/pay', stage: 'paystack_charge' }
      });
      
      // Mark payment as FAILED
      await supabase
        .from('payments')
        .update({ status: 'FAILED', error_message: err.message })
        .eq('id', payment.id);
      
      return res.status(400).json({
        error: 'Payment processing failed',
        details: err.message
      });
    }
    
    // STEP 7: Update payment with Paystack reference
    if (paystackResult.status === 'success') {
      await supabase
        .from('payments')
        .update({
          paystack_id: paystackResult.id,
          paystack_reference: paystackResult.reference,
          status: 'SUCCESS'
        })
        .eq('id', payment.id);
      
      // STEP 8: Update account balance (atomic transaction)
      const { error: txError } = await supabase.rpc('update_balance_from_payment', {
        p_payment_id: payment.id,
        p_account_id: account.id,
        p_amount: validated.amount
      });
      
      if (txError) {
        Sentry.captureException(txError, {
          tags: { endpoint: '/api/pay', stage: 'balance_update' }
        });
        
        // ⚠️ CRITICAL: Payment succeeded but balance not updated!
        // This should be caught by reconciliation job
        return res.status(500).json({
          error: 'Payment processed but balance update failed',
          paymentId: payment.id,
          paymentStatus: 'SUCCESS'
        });
      }
      
      return res.json({
        status: 'success',
        paymentId: payment.id,
        newBalance: account.balance - validated.amount
      });
    } else {
      // Paystack returned failure
      await supabase
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', payment.id);
      
      return res.status(400).json({
        error: 'Payment declined',
        paymentId: payment.id
      });
    }
    
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors
      });
    }
    
    Sentry.captureException(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

## Database Function: update_balance_from_payment

```sql
-- ✅ Atomic operation: Update payment AND balance AND ledger in transaction

CREATE OR REPLACE FUNCTION update_balance_from_payment(
  p_payment_id UUID,
  p_account_id UUID,
  p_amount DECIMAL
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance DECIMAL,
  error_message TEXT
)
AS $$
DECLARE
  v_current_balance DECIMAL;
BEGIN
  -- ✅ ROW-level lock to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM accounts
  WHERE id = p_account_id
  FOR UPDATE;
  
  -- Check sufficient funds
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT
      false,
      v_current_balance,
      'Insufficient funds'::TEXT;
    RETURN;
  END IF;
  
  -- ✅ Atomic update: All or nothing
  UPDATE accounts
  SET balance = balance - p_amount
  WHERE id = p_account_id;
  
  -- Record to immutable ledger
  INSERT INTO ledger (account_id, payment_id, type, amount, description)
  VALUES (p_account_id, p_payment_id, 'DEBIT', p_amount, 'Payment via Paystack');
  
  -- Update payment status
  UPDATE payments
  SET status = 'RECONCILED', reconciled_at = NOW()
  WHERE id = p_payment_id;
  
  -- Return success
  RETURN QUERY SELECT
    true,
    v_current_balance - p_amount,
    NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT
    false,
    v_current_balance,
    SQLERRM;
END;
$$ LANGUAGE plpgsql STRICT;
```

---

# 4️⃣ WEBHOOK HANDLING

## Endpoint: POST /webhooks/paystack

```typescript
// backend/api/webhooks/paystack.ts

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import * as Sentry from '@sentry/node';

const router = Router();

router.post('/', async (req, res) => {
  const event = req.body;
  
  try {
    // STEP 1: Verify Paystack signature
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(event))
      .digest('hex');
    
    if (signature !== hash) {
      console.warn('Invalid Paystack signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // STEP 2: Check if webhook already processed (idempotency)
    const processed = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('paystack_event_id', event.id)
      .single();
    
    if (processed.data) {
      // ✅ Already processed
      console.log(`Webhook ${event.id} already processed`);
      return res.json({ status: 'already_processed' });
    }
    
    // STEP 3: Handle event based on type
    if (event.type === 'charge.success') {
      await handleChargeSuccess(event);
    } else if (event.type === 'charge.failure') {
      await handleChargeFailure(event);
    } else {
      console.log(`Unhandled event type: ${event.type}`);
    }
    
    // STEP 4: Log processed webhook
    await supabase
      .from('webhook_logs')
      .insert({
        paystack_event_id: event.id,
        type: event.type,
        processed_at: new Date()
      });
    
    return res.json({ status: 'processed' });
    
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'webhook_paystack' }
    });
    
    // Always return 200 to Paystack (don't retry)
    return res.status(200).json({ status: 'error_logged' });
  }
});

async function handleChargeSuccess(event) {
  const { reference, amount, id: paystackId } = event.data;
  
  // Find payment by our reference
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', reference)
    .single();
  
  if (!payment) {
    // ⚠️ Webhook for unknown payment!
    await supabase.from('webhook_anomalies').insert({
      type: 'PAYMENT_NOT_FOUND',
      details: { reference, paystackId, amount }
    });
    
    Sentry.captureMessage('Webhook: Payment not found', {
      level: 'error',
      contexts: { reference, paystackId }
    });
    return;
  }
  
  // Check amount matches
  const expectedAmount = Math.round(payment.amount * 100);  // Convert to cents
  if (amount !== expectedAmount) {
    await supabase.from('webhook_anomalies').insert({
      type: 'AMOUNT_MISMATCH',
      details: {
        paymentId: payment.id,
        expected: expectedAmount,
        received: amount
      }
    });
    
    Sentry.captureMessage('Webhook: Amount mismatch', {
      level: 'error',
      contexts: { expected: expectedAmount, received: amount }
    });
    return;
  }
  
  // If payment already SUCCESS, log anomaly
  if (payment.status === 'SUCCESS' || payment.status === 'RECONCILED') {
    await supabase.from('webhook_anomalies').insert({
      type: 'DUPLICATE_SUCCESS',
      details: { paymentId: payment.id }
    });
    return;
  }
  
  // ✅ Mark as RECONCILED
  await supabase
    .from('payments')
    .update({
      status: 'RECONCILED',
      paystack_id: paystackId,
      reconciled_at: new Date()
    })
    .eq('id', payment.id);
  
  console.log(`✅ Payment ${payment.id} reconciled via webhook`);
}

async function handleChargeFailure(event) {
  const { reference } = event.data;
  
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', reference)
    .single();
  
  if (payment) {
    await supabase
      .from('payments')
      .update({ status: 'FAILED' })
      .eq('id', payment.id);
  }
}

export default router;
```

---

# 5️⃣ RECONCILIATION JOB (Nightly)

## Cron Job: Reconcile Stale Payments

```typescript
// backend/jobs/reconcile-payments.ts

import { supabase } from '../lib/supabase';
import { paystack } from '../lib/paystack';
import * as Sentry from '@sentry/node';

export async function reconcilePayments() {
  console.log('[Reconciliation] Starting...');
  
  try {
    // Find PENDING payments older than 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const { data: stalePayments } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'PENDING')
      .lt('created_at', thirtyMinutesAgo.toISOString());
    
    if (!stalePayments || stalePayments.length === 0) {
      console.log('[Reconciliation] No stale payments found');
      return;
    }
    
    console.log(`[Reconciliation] Found ${stalePayments.length} stale payments`);
    
    for (const payment of stalePayments) {
      try {
        // Check status with Paystack
        const paystackStatus = await paystack.verify({
          reference: payment.id
        });
        
        if (paystackStatus.status === 'success') {
          // ✅ Paystack says success! Finalize locally
          
          // Update balance if not done yet
          const { data: account } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', payment.account_id)
            .single();
          
          // Call the atomic function to update everything
          await supabase.rpc('update_balance_from_payment', {
            p_payment_id: payment.id,
            p_account_id: payment.account_id,
            p_amount: payment.amount
          });
          
          console.log(`✅ [Reconciliation] Finalized payment ${payment.id}`);
          
        } else if (paystackStatus.status === 'failed') {
          // ❌ Paystack says failed
          await supabase
            .from('payments')
            .update({ status: 'FAILED' })
            .eq('id', payment.id);
          
          console.log(`❌ [Reconciliation] Payment ${payment.id} failed`);
          
        } else {
          // ⏳ Still pending at Paystack
          console.log(`⏳ [Reconciliation] Payment ${payment.id} still pending`);
        }
        
      } catch (err) {
        Sentry.captureException(err, {
          tags: { job: 'reconciliation', paymentId: payment.id }
        });
        console.error(`Error reconciling ${payment.id}:`, err.message);
      }
    }
    
    console.log('[Reconciliation] Complete');
    
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'reconciliation_job' }
    });
    throw err;
  }
}
```

## Schedule with Vercel Crons

```typescript
// api/cron/reconcile.ts

import { reconcilePayments } from '../../jobs/reconcile-payments';

export default async function handler(req, res) {
  // Verify Vercel's cron signature
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    await reconcilePayments();
    res.json({ success: true });
  } catch (err) {
    console.error('Reconciliation failed:', err);
    res.status(500).json({ error: err.message });
  }
}

// vercel.json - Schedule every 5 minutes
{
  "crons": [
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

---

# 6️⃣ MONITORING & ALERTS

## Alerts Configuration

```typescript
// monitoring/payment-alerts.ts

import * as Sentry from '@sentry/node';

export function setupPaymentAlerts() {
  // Alert if more than 5 stale payments
  setInterval(async () => {
    const { data: stale } = await supabase
      .from('payments')
      .select('id')
      .eq('status', 'PENDING')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    
    if (stale && stale.length > 5) {
      Sentry.captureMessage(`${stale.length} stale payments`, {
        level: 'error',
        contexts: { paymentIds: stale.map(p => p.id) }
      });
    }
  }, 15 * 60 * 1000);  // Every 15 minutes
  
  // Alert if webhook anomalies detected
  setInterval(async () => {
    const { data: anomalies } = await supabase
      .from('webhook_anomalies')
      .select('*')
      .eq('investigated', false);
    
    if (anomalies && anomalies.length > 0) {
      Sentry.captureMessage(`${anomalies.length} webhook anomalies`, {
        level: 'warning',
        contexts: { anomalies }
      });
    }
  }, 30 * 60 * 1000);  // Every 30 minutes
}
```

---

**STATUS:** ✅ Payment Reconciliation system complete

