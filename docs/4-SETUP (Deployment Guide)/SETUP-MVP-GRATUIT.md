# 🚀 SETUP MVP GRATUIT — GUIDE DÉTAILLÉ ÉTAPE PAR ÉTAPE
**SwiftTrack MVP Test avec 5-10 personnes (100% Gratuit)**

**Durée totale:** ~2 heures (première fois), 30 min (fois suivantes)
**Coût:** $0/mois
**Pré-requis:** GitHub account, compte email, terminal basique

---

> ## 🔄 MISE À JOUR (31 août 2026) — Alignement Day 0 & Build Foundation
>
> **Statut : guide valide ✅, avec 3 corrections importantes.** La mécanique pas-à-pas
> (comptes, GitHub, auto-deploy, tests, codes d'invite) reste juste. Corrections appliquées :
>
> | Élément | Ancienne valeur | Valeur corrigée (à jour) |
> |---|---|---|
> | IDs des tables SQL | **BIGSERIAL / BIGINT** | **UUID** (sharding-ready, cohérent avec la décision 1M users) |
> | Variables Redis | `REDIS_URL` / `REDIS_TOKEN` | **`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`** (noms réels utilisés au Day 0) |
> | Sentry | absent | **`SENTRY_DSN` ajouté** (compte Sentry créé au Day 0) |
>
> **⚠️ Day 0 est déjà complété (31 août 2026).** Les comptes cloud (Supabase, Upstash,
> Sentry, Vercel) sont **déjà créés**, `.env.local` est **déjà rempli et testé**
> (`npm run dev` ✓). Ce guide reste une **référence** pour comprendre chaque étape et pour
> refaire le setup si besoin — mais tu n'as PAS à recréer les comptes. Les valeurs réelles
> sont déjà dans ton `.env.local` et sur Vercel.
>
> **🔗 Lien Build Foundation :** le schema SQL ci-dessous est le schema **de base** (test).
> Il est complété au **Day 9 par PROMPT #PAYMENT**, qui ajoute les tables `payments`,
> `ledger` (append-only, audit trail) et `webhook_logs`. Ne code pas un schema figé ici :
> ce setup pose les fondations, PROMPT #PAYMENT les enrichit. Voir Guide Master Unifié, Section 7.
>
> Les corrections sont appliquées directement dans le texte. Le reste est conservé tel quel.

---

## **OVERVIEW RAPIDE**

Tu vas créer une **chaîne complète** :
```
Ton code (GitHub) 
  → Vercel (hosting automatique) 
    → Supabase (database) 
      → Upstash (cache)
        → Cloudflare (distribution)
```

À chaque `git push`, Vercel déploie automatiquement. C'est magique ! ✨

---

## **PARTIE 1 : VERCEL (Hosting) — 15 min**

### **Étape 1a : Créer un compte Vercel**

1. Va sur https://vercel.com
2. Clique **"Sign Up"**
3. Choisis **"Continue with GitHub"**
4. Autorise Vercel à accéder à ton GitHub

```
Écran attendu:
┌────────────────────────────────┐
│ Sign in to Vercel              │
│ [Sign up with GitHub] ← Clique │
└────────────────────────────────┘
```

**Pourquoi GitHub ?** Vercel se connecte à ton repo et déploie automatiquement quand tu fais `git push`.

### **Étape 1b : Connecter ton repo GitHub**

Supposons tu as déjà un repo avec Next.js:

```bash
# Sur ta machine, crée le repo s'il n'existe pas
cd ~/projects
mkdir swifttrack
cd swifttrack

# Initialise Git
git init
git add .
git commit -m "Initial commit"

# Crée un repo sur GitHub.com
# Puis:
git remote add origin https://github.com/yourusername/swifttrack.git
git branch -M main
git push -u origin main
```

**Sur Vercel :**
1. Après sign up, tu vas à https://vercel.com/dashboard
2. Clique **"Add New..."** → **"Project"**
3. Cherche "swifttrack" dans la liste
4. Clique **"Import"**

```
Écran attendu:
┌──────────────────────────┐
│ Import Project           │
│ ┌────────────────────┐   │
│ │ swifttrack  [>]    │ ← Sélectionne │
│ └────────────────────┘   │
│                          │
│ [Import] ← Clique       │
└──────────────────────────┘
```

### **Étape 1c : Configuration Vercel**

**Framework:** Vercel détecte automatiquement Next.js
**Build command:** `next build` (automatique)
**Output directory:** `.next` (automatique)

Laisse tout par défaut, clique **"Deploy"** ✅

```
Vercel va:
1. Cloner ton repo
2. Installer dépendances (npm install)
3. Builder (next build)
4. Déployer sur leurs serveurs
5. Te donner une URL publique

Temps: 2-5 minutes
Résultat: https://swifttrack.vercel.app
```

**Voilà !** Ton app est live sur Internet! 🎉

### **Étape 1d : Auto-deploy (la magie)**

Maintenant, chaque fois que tu fais:
```bash
git push origin main
```

Vercel détecte le changement et re-deploy **automatiquement** en 1 minute.

Tu peux voir le déploiement en direct sur https://vercel.com/dashboard

---

## **PARTIE 2 : SUPABASE (Database) — 30 min**

### **Étape 2a : Créer un compte Supabase**

1. Va sur https://supabase.com
2. Clique **"Start your project"**
3. Signe-toi avec **GitHub** (même compte)

```
Écran attendu:
┌────────────────────────────────┐
│ Welcome to Supabase            │
│                                │
│ [Sign up with GitHub] ← Clique │
│ [Sign up with Email]           │
└────────────────────────────────┘
```

### **Étape 2b : Créer une Database**

1. Après login, tu vas à https://app.supabase.com
2. Clique **"New Project"**
3. Remplis:
   - **Project name:** `swifttrack-test`
   - **Database Password:** Génère une password forte (ou utilise la suggestion)
   - **Region:** Europe/US (proche de toi)

```
Formulaire:
┌───────────────────────────────┐
│ Create a new project          │
│                               │
│ Project name:                 │
│ [swifttrack-test____________] │
│                               │
│ Database password:            │
│ [GeneratePassword__________] │
│                               │
│ Region:                       │
│ [Europe (Ireland)] ← Sélectionne│
│                               │
│ [Create new project]          │
└───────────────────────────────┘
```

**Clique "Create new project"**

Ça va prendre ~2 minutes. Attends que ça dise "Your project is ready!"

### **Étape 2c : Récupérer les clés API**

Une fois le projet créé:

1. Va dans **"Project Settings"** (icône gear en bas)
2. Clique **"API"**
3. Tu vois deux clés:
   - **`NEXT_PUBLIC_SUPABASE_URL`** (l'URL de ta database)
   - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (la clé publique)

```
Écran attendu:
┌──────────────────────────────┐
│ API Settings                 │
│                              │
│ Project URL:                 │
│ https://xxxxxxxxxxx.supab... │ ← Copie ça │
│                              │
│ Anon (public) key:           │
│ eyJhbGciOiJIUzI1NiIsInR... │ ← Copie ça │
│                              │
│ Service Role key:            │
│ (pour backend seulement)     │
└──────────────────────────────┘
```

**Copie ces deux valeurs !** Tu en auras besoin dans .env.local

### **Étape 2d : Créer les tables (SQL)**

1. Sur Supabase, va à **"SQL Editor"** (icône SQL en haut)
2. Clique **"New Query"**
3. Copie-colle ce code:

```sql
-- NOTE (maj 31 août 2026): UUID (pas BIGSERIAL) = sharding-ready dès le MVP,
-- zéro refactoring en Phase 2. DECIMAL pour l'argent (jamais FLOAT).
-- Ce schema de base est enrichi au Day 9 (PROMPT #PAYMENT: tables payments, ledger, webhook_logs).

-- ==================== USERS ====================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100),
  invite_code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_invite_code ON users(invite_code);

-- ==================== ACCOUNTS ====================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20), -- Cash, Mobile, Bancaire, Carte
  balance DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'XOF',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id, created_at DESC);

-- ==================== CATEGORIES ====================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20), -- Dépense, Revenu
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- ==================== TRANSACTIONS ====================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id),
  type VARCHAR(20), -- Dépense, Revenu, Transfert
  amount DECIMAL(15,2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Effectué',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

-- ==================== PROJECTS ====================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

-- ==================== BUDGETS ====================
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  limit_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
```

> **Note UUID :** si `uuid_generate_v4()` n'est pas disponible, active l'extension une
> seule fois en tête de script : `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
> (Supabase l'a généralement déjà activée.)

4. Clique **"Run"** (en haut)

Attends que ça dise "Success!" ✅

**Voilà !** Ta database est prête avec toutes les tables! 🎉

---

## **PARTIE 3 : UPSTASH (Redis Cache) — 15 min**

### **Étape 3a : Créer un compte Upstash**

1. Va sur https://upstash.com
2. Clique **"Sign Up"**
3. Choisis **"Sign Up with GitHub"** (même compte)

```
Écran attendu:
┌────────────────────────────────┐
│ Welcome to Upstash             │
│ Fast Redis as a Service        │
│                                │
│ [Sign Up with GitHub] ← Clique │
│ [Sign Up with Email]           │
└────────────────────────────────┘
```

**Important:** Pas de carte de crédit requise! C'est vraiment gratuit.

### **Étape 3b : Créer une Redis Database**

1. Après login, va à https://console.upstash.com
2. Clique **"Create Database"**
3. Remplis:
   - **Name:** `swifttrack-cache`
   - **Region:** Europe/US (proche de Supabase)
   - **Type:** Redis

```
Formulaire:
┌──────────────────────────────┐
│ Create Database              │
│                              │
│ Database name:               │
│ [swifttrack-cache__________] │
│                              │
│ Region:                      │
│ [EU (Ireland)] ← Sélectionne │
│                              │
│ Type:                        │
│ [Redis] ← Sélectionné        │
│                              │
│ [Create] ← Clique            │
└──────────────────────────────┘
```

**Clique "Create"**

Attends ~30 secondes. Ça va dire "Your database is ready!"

### **Étape 3c : Récupérer la connection string**

1. Clique sur ta database `swifttrack-cache`
2. Va à **"REST API"** (en haut)
3. Tu vois une URL qui ressemble à:
   ```
   https://rare-cheetah-12345.upstash.io
   ```

4. Copie cette URL (c'est ta `UPSTASH_REDIS_REST_URL`)
5. Clique sur le token d'authentification et copie-le (c'est ta `UPSTASH_REDIS_REST_TOKEN`)

```
Écran attendu:
┌────────────────────────────────────┐
│ REST API                           │
│                                    │
│ UPSTASH_REDIS_REST_URL:            │
│ https://rare-cheetah-12345...      │ ← Copie │
│                                    │
│ UPSTASH_REDIS_REST_TOKEN:          │
│ AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx1  │ ← Copie │
└────────────────────────────────────┘
```

**Parfait!** Ton Redis est prêt! 🎉

---

## **PARTIE 4 : CLOUDFLARE (CDN) — 5 min**

### **Étape 4a : Vérifier que Cloudflare est actif**

Normalement, Vercel inclut Cloudflare automatiquement.

Pour vérifier:
1. Va sur https://yourdomain.vercel.app dans le navigateur
2. Ouvre DevTools (F12)
3. Va dans l'onglet **"Network"**
4. Vois l'entête **"cf-ray"**

Si tu vois ça:
```
cf-ray: 123abc456def-CDN
cf-cache-status: HIT
```

**Cloudflare est activé!** ✅ Rien à faire de plus.

---

## **PARTIE 5 : VARIABLES D'ENVIRONNEMENT — 10 min**

### **Étape 5a : Créer .env.local sur ta machine**

Sur ta machine locale (dans le dossier swifttrack):

```bash
cd ~/projects/swifttrack
cat > .env.local << EOF
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...

# Upstash Redis (noms REST utilisés au Day 0)
UPSTASH_REDIS_REST_URL=https://rare-cheetah-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx1

# Sentry (monitoring, créé au Day 0)
SENTRY_DSN=https://xxxxx@oyyyyy.ingest.sentry.io/zzzzz

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**⚠️ IMPORTANT :** Remplace les valeurs par celles que tu as copiées de Supabase, Upstash
et Sentry ! (Au Day 0, ces 5 variables sont déjà dans ton `.env.local` réel et testées.)

### **Étape 5b : Ajouter les variables à Vercel**

1. Va sur https://vercel.com/dashboard
2. Clique sur ton projet "swifttrack"
3. Va dans **"Settings"** (en haut)
4. Clique **"Environment Variables"**
5. Ajoute chaque variable:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR...
UPSTASH_REDIS_REST_URL = https://rare-cheetah-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN = AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx1
SENTRY_DSN = https://xxxxx@oyyyyy.ingest.sentry.io/zzzzz
```

```
Écran attendu:
┌────────────────────────────────────────┐
│ Environment Variables                  │
│                                        │
│ Key                        │ Value     │
│ ───────────────────────────┼───────────│
│ NEXT_PUBLIC_SUPABASE_URL   │ https://..│ ← Ajoute │
│ NEXT_PUBLIC_SUPABASE_ANON..│ eyJ...    │ ← Ajoute │
│ UPSTASH_REDIS_REST_URL     │ https://..│ ← Ajoute │
│ UPSTASH_REDIS_REST_TOKEN   │ AXX...    │ ← Ajoute │
│ SENTRY_DSN                 │ https://..│ ← Ajoute │
│                                        │
│ [Save] ← Clique                        │
└────────────────────────────────────────┘
```

**Astuce (utilisée au Day 0) :** Vercel permet d'importer directement ton `.env.local`
d'un coup (bouton d'import), au lieu d'ajouter les 5 variables une par une.

**Clique "Save"**

---

## **PARTIE 6 : TESTER LOCALEMENT — 15 min**

### **Étape 6a : Installer les dépendances**

```bash
cd ~/projects/swifttrack

# Installe les packages Node
npm install

# Ajoute Supabase client
npm install @supabase/supabase-js

# Ajoute Redis client
npm install @upstash/redis
```

### **Étape 6b : Créer un hook pour Supabase**

Crée le fichier `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **Étape 6c : Créer un hook pour Redis**

Crée le fichier `lib/redis.ts`:

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})
```

### **Étape 6d : Tester dans une API route**

Crée le fichier `pages/api/test.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { redis } from '@/lib/redis'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test Supabase
    const { data: users } = await supabase.from('users').select('*').limit(1)
    
    // Test Redis
    await redis.set('test-key', 'test-value', { ex: 3600 })
    const value = await redis.get('test-key')
    
    res.status(200).json({
      supabase: { ok: true, users },
      redis: { ok: true, value }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

### **Étape 6e : Lancer en développement**

```bash
npm run dev
```

Ouvre http://localhost:3000/api/test dans le navigateur

Tu dois voir:
```json
{
  "supabase": { "ok": true, "users": [] },
  "redis": { "ok": true, "value": "test-value" }
}
```

**Si tu vois ça, tout marche!** ✅

### **Étape 6f : Tester le Dashboard**

Crée `pages/dashboard.tsx`:

```typescript
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', 1) // Pour le test
      setAccounts(data || [])
      setLoading(false)
    }

    fetchAccounts()
  }, [])

  if (loading) return <div>Chargement...</div>

  return (
    <div>
      <h1>Mes Comptes</h1>
      {accounts.length === 0 ? (
        <p>Aucun compte</p>
      ) : (
        <ul>
          {accounts.map((account: any) => (
            <li key={account.id}>{account.name}: {account.balance} FCFA</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Visite http://localhost:3000/dashboard

Tu dois voir "Aucun compte" (c'est normal, pas de données encore) ✅

---

## **PARTIE 7 : DÉPLOYER SUR VERCEL — 5 min**

### **Étape 7a : Push vers GitHub**

```bash
cd ~/projects/swifttrack

git add .
git commit -m "Ajouter Supabase et Redis setup"
git push origin main
```

### **Étape 7b : Vercel re-déploie automatiquement**

Ouvre https://vercel.com/dashboard

Tu dois voir:
```
Deployment in progress...
Building...
Deploying...
✅ Production ready at: https://swifttrack.vercel.app
```

Attends 2-5 minutes.

### **Étape 7c : Test en live**

Ouvre https://swifttrack.vercel.app/api/test

Tu dois voir la même réponse JSON qu'en local! ✅

---

## **PARTIE 8 : CRÉER DES CODES D'INVITE POUR TES 5 AMIS — 10 min**

### **Étape 8a : Créer une page admin simple**

Crée `pages/admin/generate-codes.tsx`:

```typescript
import { supabase } from '@/lib/supabase'
import { useState } from 'react'

export default function GenerateInviteCodes() {
  const [codes, setCodes] = useState<string[]>([])

  const generateCode = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // Sauvegarde dans Supabase (création d'une table invite_codes si besoin)
    const { error } = await supabase
      .from('users')
      .insert([{ invite_code: code, username: `user-${code}` }])
    
    if (!error) {
      setCodes([...codes, code])
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Générer Codes d'Invite</h1>
      
      <button 
        onClick={generateCode}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Générer un code
      </button>

      <h2>Codes générés:</h2>
      <ul>
        {codes.map((code) => (
          <li key={code} style={{ fontSize: '20px', fontFamily: 'monospace' }}>
            {code} 
            <button onClick={() => navigator.clipboard.writeText(code)}>
              Copier
            </button>
          </li>
        ))}
      </ul>

      <p>Envoie ces codes à tes amis pour qu'ils créent un compte!</p>
    </div>
  )
}
```

### **Étape 8b : Générer 5 codes**

1. Va sur https://swifttrack.vercel.app/admin/generate-codes
2. Clique "Générer un code" 5 fois
3. Copie les 5 codes

```
Codes générés:
1. A1B2C3
2. D4E5F6
3. G7H8I9
4. J0K1L2
5. M3N4O5
```

### **Étape 8c : Partager avec tes 5 amis**

Envoie par email/SMS:

```
Salut! 👋

J'ai créé une app pour tracker nos finances.

Voici ton code pour t'inscrire:
→ A1B2C3

Visite: https://swifttrack.vercel.app

Amuse-toi! 🚀
```

---

## **RÉSUMÉ FINAL**

✅ **Vercel:** Ton app est live sur Internet
✅ **Supabase:** Tes données sont sauvegardées
✅ **Upstash:** Cache pour la performance
✅ **Cloudflare:** Distribution rapide mondiale
✅ **5 codes d'invite:** Prêts pour tester avec des amis

**Coût total:** $0/mois 🎉

---

## **DÉPANNAGE**

### **"Error: Cannot find module '@supabase/supabase-js'"**
```bash
npm install @supabase/supabase-js
```

### **"Error: SUPABASE_URL is not defined"**
- Vérifier que .env.local a les bonnes variables
- Restart le serveur: CTRL+C puis `npm run dev`

### **"Redis connection failed"**
- Vérifier UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont corrects
- Vérifier que Upstash database est créée

### **"Vercel deployment failed"**
- Aller sur https://vercel.com/dashboard
- Clique sur "Deployments"
- Vois le log d'erreur exact
- Fix et re-push vers GitHub

---

**Bravo! Tu as une app production-ready 100% gratuite! 🚀**

Prochaines étapes:
1. Développer les écrans (Claude Code)
2. Inviter 5 amis à tester
3. Récupérer du feedback
4. Itérer
5. Quand prêt, scale avec Claude Code

Des questions? Je peux approfondir chaque étape! 💪
