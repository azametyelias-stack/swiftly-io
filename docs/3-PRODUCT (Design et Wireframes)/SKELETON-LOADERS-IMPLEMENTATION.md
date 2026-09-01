# 💫 SKELETON LOADERS POUR SWIFTTRACK
**Guide complet : Implémenter les loading states professionels**

**Objectif:** Montrer une structure pendant le chargement des données (au lieu d'écran blanc)
**Impact:** Users pensent que l'app est rapide + trust augmente

---

> ## 🔄 MISE À JOUR (31 août 2026) — Ponts de cohérence
>
> **Statut : document valide et complet ✅.** Les composants, la numérotation des écrans et
> l'exemple Dashboard sont bons. Deux précisions de cohérence avec la stratégie actuelle :
>
> - **Source des données :** l'exemple `fetch('/api/dashboard')` interroge en réalité le
>   **schema de la fondation Payment** (PROMPT #PAYMENT, Day 9). Les endpoints qui reçoivent
>   des données valident les inputs avec **Zod** (fondation PROMPT #INPUT, Day 10).
> - **Décompte écrans :** skeleton loaders à prévoir pour les **22 écrans MVP (01-22)**
>   (les écrans 23-24 sont réservés Phase 2+, pas concernés).
>
> Le reste du guide est conservé tel quel.

---

## **CONCEPT RAPIDE**

```
SANS SKELETON:
User ouvre dashboard
    ↓
Écran blanc (3 secondes)
    ↓
User pense: "App cassée?"
    ↓
User quitte
❌ Bad UX

AVEC SKELETON:
User ouvre dashboard
    ↓
Skeleton visible (3 secondes) ← "Ça charge!"
    ↓
Skeleton disparaît, vraies données
    ↓
User: "App est rapide!"
✅ Good UX
```

---

## **PARTIE 1 : LES COMPOSANTS SKELETON DE BASE**

### **Étape 1 : Créer un composant SkeletonLoader**

Crée le fichier: `components/Skeleton/SkeletonLoader.tsx`

```typescript
import React from 'react'
import './SkeletonLoader.css' // Voir CSS en bas

export function SkeletonLine({ 
  width = '100%', 
  height = '16px',
  className = '' 
}) {
  return (
    <div
      className={`skeleton-line ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard({ count = 1, className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLine key={i} width="100%" height="12px" className="mb-2" />
      ))}
    </div>
  )
}

export function SkeletonCircle({ 
  diameter = '40px',
  className = '' 
}) {
  return (
    <div
      className={`skeleton-circle ${className}`}
      style={{ 
        width: diameter, 
        height: diameter,
        borderRadius: '50%'
      }}
    />
  )
}

export function SkeletonImage({ 
  width = '100%',
  height = '200px',
  className = ''
}) {
  return (
    <div
      className={`skeleton-image ${className}`}
      style={{ width, height }}
    />
  )
}
```

### **CSS pour Skeleton**

Crée: `components/Skeleton/SkeletonLoader.css`

```css
/* Base skeleton style */
.skeleton-line,
.skeleton-card,
.skeleton-circle,
.skeleton-image {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeletonLoading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Skeleton card */
.skeleton-card {
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.skeleton-card .skeleton-line {
  margin-bottom: 12px;
}

.skeleton-card .skeleton-line:last-child {
  margin-bottom: 0;
}

/* Skeleton circle */
.skeleton-circle {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: skeletonLoading 1.5s infinite;
}

/* Responsive */
@media (max-width: 768px) {
  .skeleton-card {
    padding: 12px;
  }
}
```

---

## **PARTIE 2 : SKELETON POUR CHAQUE ÉCRAN DE SWIFTTRACK**

### **SCREEN 01 : LANDING PAGE**

```typescript
// components/Skeletons/LandingPageSkeleton.tsx

export function LandingPageSkeleton() {
  return (
    <div className="landing-page-skeleton">
      {/* Logo/Header */}
      <div className="flex justify-between items-center p-4">
        <SkeletonLine width="120px" height="32px" />
        <SkeletonLine width="80px" height="32px" />
      </div>

      {/* Hero section */}
      <div className="p-4">
        <SkeletonLine width="100%" height="24px" className="mb-4" />
        <SkeletonLine width="80%" height="20px" className="mb-2" />
        <SkeletonLine width="75%" height="20px" className="mb-6" />
      </div>

      {/* CTA Button */}
      <div className="p-4">
        <SkeletonLine width="100%" height="48px" />
      </div>

      {/* Features section */}
      <div className="p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <SkeletonCircle diameter="48px" />
            <div className="flex-1">
              <SkeletonLine width="80%" height="16px" className="mb-2" />
              <SkeletonLine width="100%" height="12px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### **SCREEN 02 & 03 : CONNEXION (Code + Username)**

```typescript
// components/Skeletons/AuthSkeleton.tsx

export function AuthSkeleton() {
  return (
    <div className="auth-skeleton p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <SkeletonCircle diameter="60px" className="mx-auto mb-4" />
        <SkeletonLine width="80%" height="24px" className="mx-auto mb-2" />
        <SkeletonLine width="70%" height="16px" className="mx-auto" />
      </div>

      {/* Input fields */}
      <div className="space-y-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonLine key={i} width="100%" height="48px" />
        ))}
      </div>

      {/* Button */}
      <SkeletonLine width="100%" height="48px" className="mb-4" />

      {/* Footer text */}
      <SkeletonLine width="60%" height="14px" className="mx-auto" />
    </div>
  )
}
```

### **SCREEN 04 : DASHBOARD (LA PLUS IMPORTANTE!)**

```typescript
// components/Skeletons/DashboardSkeleton.tsx

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton pb-20">
      {/* Header avec profil */}
      <div className="p-4 flex justify-between items-center border-b border-gray-100">
        <div>
          <SkeletonLine width="150px" height="20px" className="mb-2" />
          <SkeletonLine width="100px" height="14px" />
        </div>
        <SkeletonCircle diameter="40px" />
      </div>

      {/* Solde principal - CRITICAL */}
      <div className="p-4">
        <SkeletonLine width="120px" height="14px" className="mb-3" />
        <SkeletonLine width="100%" height="36px" className="mb-2" />
        <SkeletonLine width="80%" height="12px" />
      </div>

      {/* Bandeau d'info */}
      <div className="p-4 bg-blue-50">
        <SkeletonLine width="100%" height="60px" />
      </div>

      {/* Score Financier Card */}
      <div className="p-4">
        <SkeletonLine width="150px" height="16px" className="mb-3" />
        <SkeletonCard count={4} />
      </div>

      {/* Sections de comptes */}
      <div className="p-4 space-y-3">
        <SkeletonLine width="100px" height="14px" className="mb-3" />
        
        {/* 3 cartes de comptes */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-3">
            <SkeletonCircle diameter="48px" />
            <div className="flex-1">
              <SkeletonLine width="80%" height="14px" className="mb-2" />
              <SkeletonLine width="60%" height="12px" />
            </div>
          </div>
        ))}
      </div>

      {/* Historique récent */}
      <div className="p-4">
        <SkeletonLine width="150px" height="16px" className="mb-3" />
        
        {/* 5 transactions */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
            <div className="flex gap-3 flex-1">
              <SkeletonCircle diameter="36px" />
              <div className="flex-1">
                <SkeletonLine width="70%" height="12px" className="mb-2" />
                <SkeletonLine width="50%" height="10px" />
              </div>
            </div>
            <SkeletonLine width="60px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### **SCREEN 06 : STATISTIQUES**

```typescript
// components/Skeletons/StatisticsSkeleton.tsx

export function StatisticsSkeleton() {
  return (
    <div className="statistics-skeleton pb-20">
      {/* Tabs/Filters */}
      <div className="flex gap-2 p-4 border-b border-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLine key={i} width="80px" height="36px" />
        ))}
      </div>

      {/* Score Card */}
      <div className="p-4">
        <SkeletonLine width="100px" height="14px" className="mb-3" />
        <SkeletonCircle diameter="120px" className="mx-auto mb-4" />
        <SkeletonLine width="100%" height="48px" className="mb-3" />
      </div>

      {/* Chart */}
      <div className="p-4 h-64">
        <SkeletonImage width="100%" height="250px" />
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <SkeletonLine width="40%" height="14px" />
            <SkeletonLine width="30%" height="14px" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### **SCREEN 12-16 : TRANSACTION FLOW (Flux Paiement)**

```typescript
// components/Skeletons/TransactionFlowSkeleton.tsx

export function TransactionFlowSkeleton() {
  return (
    <div className="transaction-flow-skeleton pb-20">
      {/* Progress indicator */}
      <div className="p-4 flex justify-between items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1">
            <SkeletonCircle diameter="32px" className="mx-auto mb-2" />
            {i < 4 && <div className="h-1 bg-gray-100 flex-1" />}
          </div>
        ))}
      </div>

      {/* Slide content */}
      <div className="p-4">
        <SkeletonLine width="150px" height="18px" className="mb-4" />
        
        {/* Slide 1: Type selection */}
        <div className="space-y-2 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLine key={i} width="100%" height="48px" />
          ))}
        </div>

        {/* Slide 2-4: Input fields */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <SkeletonLine width="80px" height="12px" className="mb-2" />
              <SkeletonLine width="100%" height="44px" />
            </div>
          ))}
        </div>

        {/* Amount input (big one) */}
        <div className="mt-6">
          <SkeletonLine width="100%" height="60px" className="mb-3" />
          <SkeletonLine width="100%" height="44px" />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-2">
        <SkeletonLine width="30%" height="48px" />
        <SkeletonLine width="70%" height="48px" />
      </div>
    </div>
  )
}
```

---

## **PARTIE 3 : INTÉGRATION AVEC REACT/NEXT.JS**

### **Pattern 1 : Hook personnalisé pour les skeletons**

```typescript
// hooks/useSkeleton.ts

import { useState, useEffect } from 'react'

interface UseSkeletonOptions {
  delay?: number // milliseconds avant de montrer les vraies données
  minDuration?: number // min time to show skeleton (for UX)
}

export function useSkeleton<T>(
  fetchFn: () => Promise<T>,
  options: UseSkeletonOptions = {}
) {
  const { delay = 0, minDuration = 1000 } = options
  
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true
    const startTime = Date.now()

    const load = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, delay))
        const result = await fetchFn()

        // Ensure minimum skeleton display time
        const elapsedTime = Date.now() - startTime
        const remainingTime = Math.max(0, minDuration - elapsedTime)
        await new Promise(resolve => setTimeout(resolve, remainingTime))

        if (isMounted) {
          setData(result)
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error)
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [fetchFn, delay, minDuration])

  return { data, isLoading, error }
}
```

### **Pattern 2 : Composant wrapper**

```typescript
// components/LoadingWrapper.tsx

import React from 'react'

interface LoadingWrapperProps {
  isLoading: boolean
  skeletonComponent: React.ReactNode
  children: React.ReactNode
  error?: Error | null
}

export function LoadingWrapper({
  isLoading,
  skeletonComponent,
  children,
  error
}: LoadingWrapperProps) {
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
        <p className="font-semibold">Erreur de chargement</p>
        <p className="text-sm">{error.message}</p>
      </div>
    )
  }

  if (isLoading) {
    return <>{skeletonComponent}</>
  }

  return <>{children}</>
}
```

### **Exemple d'utilisation complète**

```typescript
// pages/dashboard.tsx

import { useEffect, useState } from 'react'
import { LoadingWrapper } from '@/components/LoadingWrapper'
import { DashboardSkeleton } from '@/components/Skeletons/DashboardSkeleton'
import Dashboard from '@/components/Dashboard'
import { useSkeleton } from '@/hooks/useSkeleton'

export default function DashboardPage() {
  // Fetch user data
  const { data: dashboardData, isLoading, error } = useSkeleton(
    async () => {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to load dashboard')
      return response.json()
    },
    { minDuration: 800 } // Show skeleton for at least 800ms
  )

  return (
    <LoadingWrapper
      isLoading={isLoading}
      skeletonComponent={<DashboardSkeleton />}
      error={error}
    >
      <Dashboard data={dashboardData} />
    </LoadingWrapper>
  )
}
```

---

## **PARTIE 4 : VARIANTES DE SKELETONS**

### **Skeleton avec pulse (pulsating)**

```typescript
// Alternative à l'animation shimmer

export function SkeletonPulse({ width = '100%', height = '16px' }) {
  return (
    <div
      className="animate-pulse bg-gray-200"
      style={{ width, height, borderRadius: '4px' }}
    />
  )
}

// CSS
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### **Skeleton avec gradient (shimmer - meilleur)**

```typescript
// Déjà fourni ci-dessus
// C'est ce qu'on utilise
```

### **Skeleton nuage (cloud effect)**

```typescript
// Pour un effect plus soft

export function SkeletonCloud() {
  return (
    <div className="skeleton-cloud" />
  )
}

// CSS
.skeleton-cloud {
  background: radial-gradient(
    circle,
    #e0e0e0 0%,
    #f0f0f0 50%,
    #e0e0e0 100%
  );
  background-size: 200% 200%;
  animation: cloudMove 3s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes cloudMove {
  0%, 100% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
}
```

---

## **PARTIE 5 : SKELETON POUR LES LISTES**

### **Skeleton liste avec images (Transactions)**

```typescript
// components/Skeletons/TransactionListSkeleton.tsx

export function TransactionListSkeleton({ count = 10 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 bg-white rounded border border-gray-100"
        >
          {/* Left: Icon + Text */}
          <div className="flex items-center gap-3 flex-1">
            <SkeletonCircle diameter="48px" />
            <div className="flex-1">
              <SkeletonLine width="70%" height="14px" className="mb-2" />
              <SkeletonLine width="50%" height="12px" />
            </div>
          </div>

          {/* Right: Amount */}
          <div className="w-20">
            <SkeletonLine width="100%" height="14px" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

### **Skeleton carte (Accounts)**

```typescript
// components/Skeletons/AccountCardSkeleton.tsx

export function AccountCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200"
        >
          {/* Card header */}
          <div className="flex justify-between items-start mb-4">
            <SkeletonCircle diameter="36px" />
            <SkeletonLine width="40px" height="16px" />
          </div>

          {/* Card content */}
          <SkeletonLine width="80%" height="12px" className="mb-2" />
          <SkeletonLine width="60%" height="20px" className="mb-4" />
          <SkeletonLine width="100%" height="12px" />
        </div>
      ))}
    </div>
  )
}
```

---

## **PARTIE 6 : SKELETON CHART**

```typescript
// components/Skeletons/ChartSkeleton.tsx

export function ChartSkeleton({ height = '300px' }) {
  return (
    <div className="p-4">
      {/* Title */}
      <SkeletonLine width="150px" height="16px" className="mb-4" />

      {/* Chart placeholder */}
      <SkeletonImage width="100%" height={height} />

      {/* Legend */}
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <SkeletonCircle diameter="12px" />
            <SkeletonLine width="60px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## **PARTIE 7 : BEST PRACTICES**

### **✅ DO**

```typescript
✅ Montre skeleton immédiatement (0ms)
   → User voit quelque chose, pense que ça charge

✅ Keep skeleton visible minimum 800ms
   → Avoid flash (skeleton disappear too quick)

✅ Match skeleton avec layout final
   → Skeleton shape = final layout shape
   → No layout shift when data arrives

✅ Use consistent animation timing
   → All skeletons use same animation
   → Professional feel

✅ Hide skeleton when data ready
   → Smooth transition
   → Fade out skeleton, fade in data

✅ Show error state clearly
   → "Erreur de chargement"
   → Allow retry

✅ Test on slow network
   → Throttle to 3G on DevTools
   → Skeleton should look good for 3+ seconds
```

### **❌ DON'T**

```typescript
❌ Show blank white screen
   → User thinks app is broken

❌ Show skeleton for <200ms
   → Flickers and confuses users

❌ Change layout between skeleton and real data
   → Layout shift = bad UX (CLS metric)

❌ Use same animation for everything
   → Looks cheap if all animations identical

❌ Forget to handle errors
   → Skeleton loading forever = frustrating

❌ Make skeleton look too different from data
   → User confused when data appears

❌ Don't test on slow networks
   → Works on WiFi doesn't mean works on 3G
```

---

## **PARTIE 8 : CHECKLIST D'IMPLÉMENTATION**

### **Pour chaque écran:**

```
☐ Créer SkeletonComponent pour l'écran
☐ Créer hook useData pour récupérer données
☐ Wrap avec LoadingWrapper
  ☐ isLoading state
  ☐ skeletonComponent
  ☐ error handling
  ☐ children (real content)
☐ Test sur local (DevTools throttle)
  ☐ Skeleton visible 1-2 sec
  ☐ Transition smooth
  ☐ No layout shift
  ☐ Error state works
☐ Test sur mobile (3G)
  ☐ Skeleton visible 3+ sec
  ☐ Still looks good
☐ Test sur slow internet (EDGE)
  ☐ Skeleton visible long time
  ☐ Don't give up hope
```

---

## **PARTIE 9 : INTÉGRATION AVEC SWIFTTRACK**

### **Fichiers à créer:**

```
components/
├── Skeleton/
│   ├── SkeletonLoader.tsx (base components)
│   ├── SkeletonLoader.css (animations)
│   ├── LandingPageSkeleton.tsx
│   ├── AuthSkeleton.tsx
│   ├── DashboardSkeleton.tsx
│   ├── StatisticsSkeleton.tsx
│   ├── TransactionFlowSkeleton.tsx
│   ├── TransactionListSkeleton.tsx
│   ├── AccountCardSkeleton.tsx
│   ├── ChartSkeleton.tsx
│   └── SkeletonIndex.ts (export all)
├── LoadingWrapper.tsx
└── ...

hooks/
├── useSkeleton.ts
└── useData.ts (custom hooks per feature)
```

### **Ordre d'implémentation:**

```
Priority 1 (CRITICAL):
☐ Dashboard skeleton + loading state
☐ Transaction flow skeleton + loading

Priority 2 (HIGH):
☐ Statistics skeleton
☐ Account cards skeleton
☐ Transaction list skeleton

Priority 3 (MEDIUM):
☐ Auth skeleton
☐ Landing page skeleton
☐ Menu navigation skeleton

Priority 4 (NICE TO HAVE):
☐ Chart skeleton
☐ Micro-interactions
☐ Loading progress indicator
```

---

## **EXEMPLE COMPLET : DASHBOARD AVEC SKELETON**

```typescript
// pages/dashboard.tsx

'use client'

import { useEffect, useState } from 'react'
import { DashboardSkeleton } from '@/components/Skeleton/DashboardSkeleton'
import { LoadingWrapper } from '@/components/LoadingWrapper'
import Dashboard from '@/components/Dashboard'

interface DashboardData {
  user: {
    name: string
    solde: number
  }
  comptes: Account[]
  transactions: Transaction[]
  score: number
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const startTime = Date.now()
    
    const loadDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard')
        
        if (!response.ok) {
          throw new Error('Failed to load dashboard')
        }

        const data = await response.json()

        // Ensure minimum skeleton display time (800ms)
        const elapsedTime = Date.now() - startTime
        const minDuration = 800
        const remainingTime = Math.max(0, minDuration - elapsedTime)

        await new Promise(resolve => setTimeout(resolve, remainingTime))

        setDashboardData(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  return (
    <LoadingWrapper
      isLoading={isLoading}
      skeletonComponent={<DashboardSkeleton />}
      error={error}
    >
      {dashboardData && <Dashboard data={dashboardData} />}
    </LoadingWrapper>
  )
}
```

---

## **RÉSUMÉ RAPIDE**

```
1. Créer composants skeleton (SkeletonLine, SkeletonCard, etc.)
2. Créer skeleton pour chaque écran
3. Créer hook pour fetcher les données
4. Wrapper avec LoadingWrapper
5. Test: DevTools throttle 3G, vérifier skeleton display
6. Déployer!

Result: Professional loading UX, users love it ❤️
```

**Fait ça et ton app va sembler 10x plus rapide!** 🚀
