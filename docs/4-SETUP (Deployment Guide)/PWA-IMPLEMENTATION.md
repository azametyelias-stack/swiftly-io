# 📱 PWA IMPLEMENTATION — SWIFTLY.IO
**Transformer le MVP Next.js en Progressive Web App (installable + offline)**

**Créé:** 4 septembre 2026
**Destinataire:** Claude Code (exécution) + Elias (référence)
**Stack:** Next.js 16.3.3 (App Router) + TypeScript + Vercel (HTTPS auto)
**Approche:** Manuelle, sans librairie (contrôle total, zéro dépendance à maintenir)

---

## 🎯 POURQUOI UNE PWA POUR SWIFTLY.IO

Une PWA = ton app web qui se comporte comme une appli mobile native, **sans passer par
les stores et sans deuxième codebase**.

```
App native (iOS/Android)          PWA (ton MVP Next.js)
├─ 2 codebases à maintenir        ├─ 1 seule codebase ✅
├─ Passage par les stores         ├─ Installation directe (un lien WhatsApp) ✅
├─ Frais Apple/Google (15-30%)    ├─ Zéro frais de store ✅
├─ Validation = jours d'attente   ├─ Mise à jour instantanée (au prochain lancement) ✅
└─ Coûteux à développer           └─ ~1 jour de travail ✅
```

**Pertinence spécifique Afrique francophone (Togo) :**
- **Installation par lien** — tes 5-10 beta users installent l'app depuis un lien, sans store
- **Fonctionne hors-ligne** — l'app s'ouvre même quand le réseau coupe (3G instable)
- **Léger et rapide** — le cache rend les chargements quasi instantanés après la 1ère visite

---

## 📋 PÉRIMÈTRE : MVP vs PHASE 2

| Fonctionnalité | Phase | Statut |
|---|---|---|
| **Manifest** (installable, icône, plein écran) | **MVP** | ✅ À faire |
| **Service worker** (cache + offline) | **MVP** | ✅ À faire |
| **Page /offline** (fallback hors-ligne) | **MVP** | ✅ À faire |
| **Icônes** (192px, 512px, maskable) | **MVP** | ✅ À faire |
| **Composant d'installation** (+ instructions iOS) | **MVP** | ✅ À faire |
| **Headers de sécurité** (service worker) | **MVP** | ✅ À faire |
| **Notifications push** (VAPID, subscribe, send) | **PHASE 2** | ⏸️ Documenté, pas implémenté en MVP |

> **Décision (validée) :** le MVP est **installable + offline**. Les notifications push sont
> **documentées ci-dessous (Partie B)** mais **clairement marquées Phase 2** — on ne les
> implémente PAS au MVP. Raison : le push nécessite des clés VAPID, une table de souscriptions
> en base, et de la logique serveur ; ça n'apporte rien aux 5-10 beta users et ça alourdit le MVP.

---

## ⏰ OÙ ÇA S'INSÈRE DANS LA TIMELINE

```
Days 8-11:   Fondations (Payment, Input, Transactions)
Days 12-26:  Les 22 écrans MVP (01-22)
Days 27-29:  ⭐ PWA (ce document) + testing final
             └─ La PWA vient APRÈS que les écrans existent
             └─ ~1 jour de travail (Partie A uniquement pour le MVP)
Day 30:      Deploy → SWIFTLY.IO installable + offline 🚀

Phase 2 (Day 60+): Partie B (push notifications) si besoin
```

**Pourquoi à la fin ?** La PWA "emballe" l'app existante. Il faut que les 22 écrans soient
là pour que le cache offline ait du sens. On ne fait pas la PWA avant les écrans.

---

## ⚠️ PRÉ-REQUIS (déjà en place)

- ✅ **HTTPS** — obligatoire pour une PWA. Vercel le fournit automatiquement (rien à faire).
  Le seul endroit où HTTP est toléré, c'est `localhost` en développement.
- ✅ **Next.js App Router** — déjà en place (dossier `app/`).
- ⚠️ **Icônes du logo** — à générer en 192×192 et 512×512 depuis le logo Swiftly.io
  (Claude Design peut les exporter). Voir Partie A, étape 3.

---

---

# 🟢 PARTIE A — PWA MVP (installable + offline)

## Étape A.1 — Le Web App Manifest

Next.js 16 génère le manifest nativement via un fichier `app/manifest.ts`. C'est la carte
d'identité de l'app (nom, icônes, couleurs, mode d'affichage).

**Créer `app/manifest.ts` :**

```tsx
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Swiftly.io — Gestion financière',
    short_name: 'Swiftly',
    description: 'Suivi de vos finances personnelles pour l\'Afrique francophone',
    start_url: '/',
    display: 'standalone',          // plein écran, sans barre de navigateur
    orientation: 'portrait',        // app mobile-first
    background_color: '#0a1628',    // navy foncé Swiftly (splash screen)
    theme_color: '#0a1628',         // couleur de la barre système
    lang: 'fr',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',   // pour un rendu propre sur Android (icône adaptative)
      },
    ],
  }
}
```

> **Note couleurs :** `background_color` et `theme_color` sont sur le navy foncé Swiftly
> (cohérent avec le fond d'écran global — voir DESIGN-GLOBAL.md). Ajuster si la palette
> définie dans Claude Design diffère.

---

## Étape A.2 — Le Service Worker (cache + offline)

Le service worker est le "cerveau" qui met en cache et gère le hors-ligne.

**Créer `public/sw.js` :**

```js
// Service Worker Swiftly.io — cache + offline (MVP)
const CACHE_NAME = 'swiftly-v1'
const OFFLINE_URL = '/offline'

// Fichiers à mettre en cache à l'installation (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Installation : on précache l'app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting() // active immédiatement la nouvelle version
})

// Activation : on nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Stratégie de récupération :
// - Navigation (pages) : réseau d'abord, fallback offline si coupure
// - Assets statiques : cache d'abord, réseau en secours
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ne pas intercepter les appels API (données fraîches obligatoires pour un fintech)
  if (request.url.includes('/api/')) {
    return
  }

  // Navigation de page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Assets statiques : cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
```

> **⚠️ Décision importante pour un fintech :** le service worker **n'intercepte PAS les
> appels `/api/`**. Les données financières (solde, transactions) doivent toujours être
> fraîches — jamais servies depuis un cache périmé. On ne met en cache que l'app shell
> (structure, icônes, page offline), pas les données sensibles.

---

## Étape A.3 — Enregistrer le Service Worker

Le service worker doit être enregistré côté client, une fois l'app chargée.

**Créer `app/pwa-register.tsx` (composant client) :**

```tsx
'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => console.error('SW registration failed:', err))
    }
  }, [])

  return null
}
```

**L'ajouter dans `app/layout.tsx` :**

```tsx
import PWARegister from './pwa-register'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
```

---

## Étape A.4 — La page /offline

Page de secours affichée quand l'utilisateur navigue sans réseau.

**Créer `app/offline/page.tsx` :**

```tsx
export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
    }}>
      <h1>Vous êtes hors ligne</h1>
      <p>Swiftly a besoin d'une connexion pour charger vos données financières.</p>
      <p>Vérifiez votre connexion et réessayez.</p>
      <button onClick={() => window.location.reload()}>Réessayer</button>
    </div>
  )
}
```

> **Cohérence design :** reprendre le design system Swiftly (couleurs navy, typo, logo)
> plutôt que ce style inline minimal. Voir DESIGN-GLOBAL.md et le SCREEN correspondant si
> un écran offline a été maquetté.

---

## Étape A.5 — Les icônes

Générer depuis le logo Swiftly et placer dans `public/icons/` :

```
public/icons/
├── icon-192x192.png            (192×192, fond plein)
├── icon-512x512.png            (512×512, fond plein)
└── icon-maskable-512x512.png   (512×512, avec marge de sécurité pour Android)
```

**Comment les générer :**
- **Claude Design** peut exporter ces tailles depuis le logo
- Ou un outil comme un générateur de favicon/PWA (ex. realfavicongenerator.net) qui produit
  tout le jeu d'icônes d'un coup

> **Icône "maskable" :** sur Android, les icônes sont recadrées (cercle, arrondi…).
> L'icône maskable a une marge de sécurité autour du logo pour ne pas être coupée.

---

## Étape A.6 — Composant d'installation (+ instructions iOS)

Un bouton "Installer l'app" + un message spécifique iOS (car Safari iOS ne supporte pas
l'invite d'installation automatique — l'utilisateur doit passer par "Ajouter à l'écran d'accueil").

**Créer `app/install-prompt.tsx` (composant client) :**

```tsx
'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Détection iOS
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream
    )
    // Détection : app déjà installée ?
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches)
  }, [])

  // Ne rien afficher si déjà installée
  if (isStandalone) return null

  return (
    <div>
      <h3>Installer Swiftly</h3>
      <button>Ajouter à l'écran d'accueil</button>
      {isIOS && (
        <p>
          Sur iPhone : appuyez sur le bouton Partager ⎋, puis sur
          "Sur l'écran d'accueil" ➕.
        </p>
      )}
    </div>
  )
}
```

> **Note cross-browser :** l'API `beforeinstallprompt` (invite personnalisée) n'est PAS
> supportée sur Safari iOS. C'est pourquoi on affiche des instructions manuelles pour iOS.
> Sur Android/Chrome, le navigateur propose l'installation automatiquement dès que le
> manifest + HTTPS sont en place.

---

## Étape A.7 — Headers de sécurité

Configurer les headers dans `next.config.ts` (sécurité + bon cache du service worker) :

```js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}
```

> Ces headers recoupent le PROMPT #7 (Point 8 HTTPS) du masterplan sécurité — cohérent.
> Le `Cache-Control: no-cache` sur `/sw.js` garantit que les users reçoivent toujours la
> dernière version du service worker.

---

## ✅ Checklist PWA MVP (Partie A)

- [x] `app/manifest.ts` créé (nom, icônes, couleurs navy, display standalone)
- [x] `public/sw.js` créé (cache app shell, offline fallback, N'intercepte PAS /api/)
- [x] `app/pwa-register.tsx` créé + ajouté au layout
- [x] `app/offline/page.tsx` créé (avec design Swiftly)
- [x] Icônes générées : 192, 512, maskable-512 dans `public/icons/`
- [x] `app/install-prompt.tsx` créé (bouton + instructions iOS)
- [x] Headers de sécurité ajoutés dans `next.config.ts`
- [ ] Testé : l'app s'installe sur Android (Chrome propose l'installation)
- [ ] Testé sur un VRAI iPhone : "Ajouter à l'écran d'accueil" fonctionne
- [x] Testé offline : couper le réseau → l'app s'ouvre, page /offline s'affiche
- [ ] Lighthouse (Chrome DevTools) → audit PWA passe au vert

> **Coché le 2026-09-06.** Deux ajustements assumés par rapport au code
> ci-dessus, chacun commenté à l'endroit concerné : les couleurs du manifeste
> (`#05060F`, la vraie base nuit du design system, pas `#0a1628` — le doc
> autorise l'ajustement en § A.1) et le fallback de navigation, qui sert la
> landing précachée pour `/` et `/offline` partout ailleurs.
>
> ⚠️ **La catégorie « PWA » de Lighthouse a été retirée depuis Lighthouse 12**
> (Chrome 129+) : il n'y a plus d'audit PWA à faire passer au vert. L'équivalent
> vérifiable est `Page.getInstallabilityErrors` (DevTools → Application →
> Manifest, « Installability »), contrôlé automatiquement et vide.

---

---

# 🔵 PARTIE B — NOTIFICATIONS PUSH (⏸️ PHASE 2, NE PAS IMPLÉMENTER EN MVP)

> **Cette partie est documentée pour référence, mais ne fait PAS partie du MVP.**
> À implémenter en Phase 2 (Day 60+) si les notifications apportent de la valeur.
> Nécessite : clés VAPID, table `push_subscriptions` en base, logique serveur.

## B.1 — Générer les clés VAPID

Les notifications push utilisent l'API Web Push, qui nécessite des clés VAPID.

```bash
npm install -g web-push
web-push generate-vapid-keys
```

Copier le résultat dans `.env` :

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
```

## B.2 — Support navigateurs

Les Web Push Notifications sont supportées par tous les navigateurs modernes : iOS 16.4+
pour les apps installées à l'écran d'accueil, Safari 16 (macOS 13+), navigateurs Chromium,
et Firefox. Sur iOS, le push ne marche QUE si l'app a été ajoutée à l'écran d'accueil.

## B.3 — Composant de souscription (client)

Gère l'abonnement/désabonnement aux notifications. Utilise `pushManager.subscribe()` avec
la clé publique VAPID, puis envoie la souscription au serveur pour la stocker.

*(Code complet dans la doc officielle Next.js — voir "Implementing Web Push Notifications".
On l'implémentera avec la vraie logique de stockage en Phase 2.)*

## B.4 — Server Actions (serveur)

`app/actions.ts` avec `web-push` : `subscribeUser`, `unsubscribeUser`, `sendNotification`.

**⚠️ En production, la souscription DOIT être stockée en base** (table `push_subscriptions`
liée à `user_id`), pas dans une variable mémoire. C'est un ajout au schema — à faire au
moment de l'implémentation Phase 2, en cohérence avec la fondation Payment (UUID, etc.).

## B.5 — Handler push dans le service worker

Ajouter au `public/sw.js` les listeners `push` (afficher la notification) et
`notificationclick` (ouvrir l'app au clic). Adapter l'URL d'ouverture à `swiftly.io`.

## B.6 — Lien avec l'écran 18 (Alertes & Notifications)

En Phase 2, le push se connecte naturellement à l'**écran 18 (Alertes & Notifications /
Inbox)** déjà prévu au MVP. L'écran 18 affiche les notifications in-app ; le push les fait
arriver sur le téléphone même app fermée. Les deux se complètent.

---

---

# 🧪 TESTER LA PWA

## En local (développement)

```bash
# Le service worker a besoin de HTTPS, même en local pour certains tests
next dev --experimental-https
```

- Le service worker ne marche qu'en HTTPS (localhost toléré)
- Chrome DevTools → onglet "Application" → "Service Workers" pour voir l'état
- Chrome DevTools → "Application" → "Manifest" pour vérifier le manifest

## En production (Vercel)

- HTTPS automatique ✅
- Tester l'installation sur Android (Chrome) ET sur un vrai iPhone
- Tester offline : mode avion → ouvrir l'app → doit s'ouvrir + page /offline
- Lighthouse → audit "PWA" doit passer

> **⚠️ Toujours tester sur un VRAI appareil iOS.** iOS bride les PWA différemment ;
> les outils desktop ne reflètent pas fidèlement le comportement iPhone.

---

# 📊 RÉSUMÉ

```
MVP (Partie A) — ~1 jour, Days 27-29 :
├─ Manifest (installable) ✅
├─ Service worker (cache + offline, ignore /api/) ✅
├─ Page /offline ✅
├─ Icônes (192, 512, maskable) ✅
├─ Composant d'installation (+ iOS) ✅
├─ Headers de sécurité ✅
└─ Résultat : Swiftly installable depuis un lien + marche hors-ligne 🚀

PHASE 2 (Partie B) — si besoin, Day 60+ :
├─ Clés VAPID
├─ Table push_subscriptions en base
├─ Souscription + Server Actions + handler SW
└─ Connecté à l'écran 18 (Alertes)

LIMITES À CONNAÎTRE :
├─ iOS bride les PWA (push seulement si installée, tester sur vrai iPhone)
├─ Pas d'accès complet au matériel (vs natif) — sans impact pour du tracking financier
└─ Le jour où il faut du natif poussé → réévaluer une vraie app (pas avant)
```

---

**Maintenu par :** Elias
**Rôle :** guide d'implémentation PWA pour Claude Code
**Placement suggéré :** `docs/3-PRODUCT/` ou `docs/2-ARCHITECTURE/` (au choix)

---

---

# 🤖 PROMPT POUR CLAUDE CODE

## Quand fournir ce document

```
Days 8-11:   Fondations (Payment, Input, Transactions)
Days 12-26:  Les 22 écrans MVP (01-22)
Days 27-29:  ⭐ ICI — fournir ce document + lancer le prompt ci-dessous
Day 30:      Deploy

La PWA vient APRÈS les 22 écrans (elle "emballe" une app qui existe déjà).
Ne jamais la lancer avant que les écrans soient codés et fonctionnels.
```

## Pré-requis à vérifier AVANT de lancer le prompt

- [ ] **Les 22 écrans MVP existent et fonctionnent** (sinon la PWA emballe du vide)
- [ ] **Les icônes sont générées** : 192×192, 512×512, maskable-512 dans `public/icons/`
      (à sortir de Claude Design AVANT — c'est la seule chose que Claude Code ne peut pas
      faire seul). Si pas prêtes : Claude Code code quand même le reste, tu ajoutes les
      icônes après.

## Le prompt (copier-coller)

```
Bonjour Claude Code ! 👋

On passe à la dimension PWA de Swiftly.io (Progressive Web App).
On le fait maintenant car les 22 écrans MVP sont codés et fonctionnent.

FICHIER DE RÉFÉRENCE : PWA-IMPLEMENTATION.md
Lis-le en entier AVANT de coder.

CE QU'ON FAIT (Partie A du document — MVP uniquement) :
├─ Manifest (app/manifest.ts) — installable, couleurs navy Swiftly
├─ Service worker (public/sw.js) — cache app shell + offline
├─ Enregistrement du service worker (app/pwa-register.tsx + layout)
├─ Page /offline (app/offline/page.tsx) — avec le design Swiftly
├─ Composant d'installation (app/install-prompt.tsx) + instructions iOS
└─ Headers de sécurité (next.config.ts)

CE QU'ON NE FAIT PAS (Partie B = Phase 2) :
❌ Pas de notifications push
❌ Pas de clés VAPID
❌ Pas de table push_subscriptions
Le push est documenté dans la Partie B mais reste pour la Phase 2. On n'y touche pas.

RÈGLES IMPORTANTES (dans le document) :
⚠️ Le service worker NE DOIT PAS intercepter les appels /api/ — les données
   financières (solde, transactions) doivent toujours être fraîches, jamais
   servies depuis un cache périmé. On ne cache que l'app shell.
⚠️ La page /offline doit reprendre le design system Swiftly (couleurs navy,
   typo, logo), pas le style inline minimal du document.
⚠️ Les icônes sont déjà dans public/icons/ (192, 512, maskable). Utilise-les
   telles quelles. [OU, si pas encore prêtes : "Les icônes ne sont pas encore
   générées — mets les chemins en place, je les ajouterai après."]

QUAND C'EST FAIT :
- Teste l'installation sur Android (Chrome propose l'installation)
- Teste offline (mode avion → l'app s'ouvre → page /offline)
- Lance un audit Lighthouse PWA (doit passer au vert)
- Dis-moi : "PWA MVP ✓ implémentée et testée"

Des questions avant de commencer ? 👇
```

## ⚠️ Test que TU dois faire toi-même (Claude Code ne peut pas)

Après que Claude Code dit "PWA MVP ✓", fais la validation finale **sur un vrai iPhone** :
1. Ouvre le site dans Safari (iPhone)
2. Bouton Partager → "Sur l'écran d'accueil"
3. Vérifie que l'app s'ouvre en plein écran, avec l'icône Swiftly

iOS bride les PWA différemment ; aucun outil desktop ne reflète fidèlement le comportement
iPhone. C'est TA validation, pas celle de Claude Code.
