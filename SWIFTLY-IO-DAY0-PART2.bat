@echo off
REM ╔════════════════════════════════════════════════════════════════╗
REM ║  🚀 SWIFTLY.IO - DAY 0 PART 2: Cloud Setup & Tools             ║
REM ║  Installe Semgrep + ECC + Configure Supabase/Vercel/etc       ║
REM ║  Temps estimé: 30 minutes                                      ║
REM ╚════════════════════════════════════════════════════════════════╝

setlocal enabledelayedexpansion

REM Couleurs
color 0B
cls

echo.
echo ════════════════════════════════════════════════════════════════
echo 🚀 SWIFTLY.IO - DAY 0 PART 2: Installation complète
echo ════════════════════════════════════════════════════════════════
echo.
echo Ce script va:
echo  1. Installer Semgrep (Security Scanner)
echo  2. Cloner ECC (Everything Claude Code)
echo  3. Afficher guides pour Supabase/Vercel/Upstash/Sentry
echo.
echo Temps estimé: 30 minutes
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 1: INSTALLER SEMGREP
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo 🔒 ÉTAPE 1: Installation de Semgrep (Security Scanner)
echo ════════════════════════════════════════════════════════════════
echo.

where /q semgrep
if errorlevel 1 (
    echo ⚠️  Semgrep n'est pas installé.
    echo.
    echo Options d'installation pour Windows:
    echo.
    echo 1️⃣  AVEC CHOCOLATEY (si installé):
    echo    choco install semgrep
    echo.
    echo 2️⃣  AVEC PYTHON:
    echo    pip install semgrep
    echo.
    echo 3️⃣  MANUEL:
    echo    Visite: https://semgrep.dev/docs/getting-started/
    echo.
    echo Appuie sur une touche quand c'est fait...
    pause
) else (
    echo ✓ Semgrep déjà installé!
    for /f "tokens=*" %%i in ('semgrep --version') do echo  Version: %%i
)

echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 2: CLONER ECC (Everything Claude Code)
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo 🤖 ÉTAPE 2: Clonage d'ECC (Everything Claude Code)
echo ════════════════════════════════════════════════════════════════
echo.

if exist ecc (
    echo ✓ ECC déjà présent dans le dossier ecc/
) else (
    echo Clonage du repo ECC...
    echo (Cela peut prendre 1-2 minutes)
    echo.
    
    git clone https://github.com/affaan-m/everything-claude-code.git ecc
    
    if errorlevel 0 (
        echo ✓ ECC cloné avec succès!
        echo.
        echo Dossier: ecc/
        echo Structure:
        echo  - ecc/agents/
        echo  - ecc/skills/
        echo  - ecc/README.md
        echo.
        echo Lis ecc/README.md pour comprendre comment utiliser ECC!
    ) else (
        echo ✗ Erreur en clonant ECC
        echo Essaie manuellement:
        echo   git clone https://github.com/affaan-m/everything-claude-code.git ecc
    )
)

echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 3: TESTER SEMGREP
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo ✅ ÉTAPE 3: Test de Semgrep
echo ════════════════════════════════════════════════════════════════
echo.

where /q semgrep
if errorlevel 1 (
    echo ⚠️  Semgrep pas encore installé (installe-le d'abord!)
) else (
    echo Lancement d'un test de sécurité...
    echo (Lance: semgrep scan .)
    echo.
    echo Cela va chercher les patterns dangereux dans ton code.
    echo.
    
    semgrep scan . 2>nul
    
    echo.
    echo ✓ Scan Semgrep terminé!
)

echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 4: AFFICHER GUIDES CLOUD SETUP
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo 🌐 ÉTAPE 4: Configuration des services cloud
echo ════════════════════════════════════════════════════════════════
echo.
echo Les étapes suivantes doivent être faites MANUELLEMENT dans les navigateur.
echo Ce sont les services cloud essentiels pour Swiftly.io.
echo.
echo Ouvre ton navigateur et suis ces guides:
echo.

REM Guide 1: Supabase
echo ┌─ 1️⃣  SUPABASE (Database Cloud) ─────────────────────────────┐
echo │                                                                │
echo │ Supabase = PostgreSQL Cloud + Auth + Real-time               │
echo │                                                                │
echo │ ÉTAPES:                                                       │
echo │ 1. Va à: https://supabase.com                                │
echo │ 2. Clique "Sign Up" (avec GitHub c'est plus facile)         │
echo │ 3. Crée un nouveau "Project"                                 │
echo │ 4. Nomme-le: "swiftly-io"                                   │
echo │ 5. Copie les URLs:                                           │
echo │    - Project URL (NEXT_PUBLIC_SUPABASE_URL)                 │
echo │    - Anon Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)               │
echo │    - Service Role Key (SUPABASE_SERVICE_ROLE_KEY)           │
echo │ 6. Colle-les dans .env.local                                │
echo │                                                                │
echo │ Temps: 5-10 minutes                                          │
echo └────────────────────────────────────────────────────────────┘
echo.

REM Guide 2: Vercel
echo ┌─ 2️⃣  VERCEL (Deployment/Hosting) ────────────────────────────┐
echo │                                                                │
echo │ Vercel = Deployment automatique depuis GitHub                │
echo │                                                                │
echo │ ÉTAPES:                                                       │
echo │ 1. Va à: https://vercel.com                                  │
echo │ 2. Clique "Sign Up" (avec GitHub c'est plus facile)         │
echo │ 3. Clique "Create New" → "Project"                          │
echo │ 4. Sélectionne ton repo GitHub: azametyelias-stack/swiftly-io
echo │ 5. Ajoute les variables d'environnement de .env.local       │
echo │    (Supabase URLs, Sentry token, etc.)                      │
echo │ 6. Clique "Deploy"                                           │
echo │                                                                │
echo │ Résultat: Ton app est LIVE sur vercel.app                   │
echo │ Chaque push à GitHub = redéploiement automatique            │
echo │                                                                │
echo │ Temps: 5 minutes                                             │
echo └────────────────────────────────────────────────────────────┘
echo.

REM Guide 3: Upstash
echo ┌─ 3️⃣  UPSTASH (Redis Cache) ──────────────────────────────────┐
echo │                                                                │
echo │ Upstash = Redis Cloud (caching pour performance)             │
echo │                                                                │
echo │ ÉTAPES:                                                       │
echo │ 1. Va à: https://upstash.com                                 │
echo │ 2. Clique "Sign Up" (avec GitHub c'est plus facile)         │
echo │ 3. Va à: Console → "Create Database"                         │
echo │ 4. Nomme-le: "swiftly-cache"                                │
echo │ 5. Copie les URLs:                                           │
echo │    - UPSTASH_REDIS_REST_URL                                 │
echo │    - UPSTASH_REDIS_REST_TOKEN                               │
echo │ 6. Colle-les dans .env.local                                │
echo │                                                                │
echo │ Temps: 5 minutes                                             │
echo └────────────────────────────────────────────────────────────┘
echo.

REM Guide 4: Sentry
echo ┌─ 4️⃣  SENTRY (Error Monitoring) ─────────────────────────────┐
echo │                                                                │
echo │ Sentry = Monitoring des erreurs en production               │
echo │                                                                │
echo │ ÉTAPES:                                                       │
echo │ 1. Va à: https://sentry.io                                   │
echo │ 2. Clique "Sign Up" (avec GitHub c'est plus facile)         │
echo │ 3. Crée une nouvelle "Organization"                          │
echo │ 4. Crée un nouveau "Project"                                 │
echo │    Platform: "Next.js"                                       │
echo │    Nomme-le: "swiftly-io"                                   │
echo │ 5. Copie le "Authentication Token":                          │
echo │    - SENTRY_AUTH_TOKEN                                      │
echo │ 6. Colle-le dans .env.local                                 │
echo │                                                                │
echo │ Temps: 5 minutes                                             │
echo └────────────────────────────────────────────────────────────┘
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 5: AFFICHER RÉSUMÉ .env.local
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo 📝 ÉTAPE 5: Mise à jour de .env.local
echo ════════════════════════════════════════════════════════════════
echo.
echo Après avoir créé les comptes cloud, mets à jour .env.local:
echo.
echo ✏️  Ouvre .env.local dans VS Code et remplis:
echo.
echo   # === SUPABASE ===
echo   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
echo   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxx...
echo   SUPABASE_SERVICE_ROLE_KEY=eyJxx...
echo.
echo   # === UPSTASH REDIS ===
echo   UPSTASH_REDIS_REST_URL=https://bold-fox-12345.upstash.io
echo   UPSTASH_REDIS_REST_TOKEN=AZ...
echo.
echo   # === SENTRY ===
echo   SENTRY_AUTH_TOKEN=sntrys_xxx...
echo.
echo ✓ Sauvegarde .env.local (Ctrl+S)
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 6: AFFICHER CHECKLIST FINALE
REM ╚════════════════════════════════════════════════════════════════╝

echo ════════════════════════════════════════════════════════════════
echo ✅ DAY 0 PART 2 - CHECKLIST FINALE
echo ════════════════════════════════════════════════════════════════
echo.

echo 📋 INSTALLATIONS:
echo  [ ] Semgrep installé (pip install semgrep)
echo  [ ] ECC cloné (ecc/ dossier visible)
echo.

echo 🌐 COMPTES CLOUD CRÉÉS:
echo  [ ] Supabase account (https://supabase.com)
echo  [ ] Vercel account (https://vercel.com)
echo  [ ] Upstash account (https://upstash.com)
echo  [ ] Sentry account (https://sentry.io)
echo.

echo 🔐 .env.local REMPLI:
echo  [ ] NEXT_PUBLIC_SUPABASE_URL
echo  [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
echo  [ ] SUPABASE_SERVICE_ROLE_KEY
echo  [ ] UPSTASH_REDIS_REST_URL
echo  [ ] UPSTASH_REDIS_REST_TOKEN
echo  [ ] SENTRY_AUTH_TOKEN
echo.

echo ✅ PRÊT POUR LA SUITE:
echo  [ ] npm run dev fonctionne (http://localhost:3000)
echo  [ ] Tous les fichiers de config créés
echo.

echo ════════════════════════════════════════════════════════════════
echo.
echo 🚀 DAY 0 COMPLET!
echo.
echo Prochaines étapes:
echo  Days 1-3: Claude Design (24 écrans Figma)
echo  Days 4-7: Validation des designs
echo  Day 8: Handoff Claude Code
echo  Days 9-11: 3 Prompts Critiques (Payment, Input, Transactions)
echo  Days 12-28: Implémentation des 19 écrans
echo  Days 29-30: Tests + Deployment
echo.
echo ════════════════════════════════════════════════════════════════
echo.

pause
