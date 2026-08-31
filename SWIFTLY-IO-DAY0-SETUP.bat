@echo off
REM ╔════════════════════════════════════════════════════════════════╗
REM ║  🚀 SWIFTLY.IO - DAY 0 SETUP AUTOMATISÉ (Windows CMD/Batch)    ║
REM ║  Installation complète en 10-15 minutes                         ║
REM ║  Double-clic sur ce fichier et c'est fini!                     ║
REM ╚════════════════════════════════════════════════════════════════╝

setlocal enabledelayedexpansion

REM Couleurs
color 0B
cls

echo.
echo ════════════════════════════════════════════════════════════════
echo 🚀 SWIFTLY.IO - DAY 0 SETUP AUTOMATISÉ
echo ════════════════════════════════════════════════════════════════
echo.
echo Installation complète en 10-15 minutes
echo Double-clic sur ce fichier et c'est terminé!
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 1: VÉRIFIER LES PRÉREQUIS
REM ╚════════════════════════════════════════════════════════════════╝

echo 📋 ÉTAPE 1: Vérification des prérequis...
echo.

where /q node
if errorlevel 1 (
    echo ✗ Node.js manquant! 
    echo  Installe d'abord Node.js depuis https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% installé

where /q npm
if errorlevel 1 (
    echo ✗ npm manquant!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION% installé

where /q git
if errorlevel 1 (
    echo ✗ Git manquant!
    pause
    exit /b 1
)
echo ✓ Git installé

echo.
echo ════════════════════════════════════════════════════════════════
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 2: CRÉER STRUCTURE DU PROJET
REM ╚════════════════════════════════════════════════════════════════╝

echo 📁 ÉTAPE 2: Création de la structure du projet...
echo.

REM Créer dossiers
mkdir src 2>nul
mkdir src\app\api 2>nul
mkdir src\app\api\webhooks 2>nul
mkdir src\app\api\transactions 2>nul
mkdir src\components 2>nul
mkdir src\lib\db 2>nul
mkdir src\lib\validation 2>nul
mkdir src\lib\security 2>nul
mkdir claude-agents 2>nul
mkdir claude-skills 2>nul
mkdir tests 2>nul
mkdir docs 2>nul
mkdir .github\workflows 2>nul

echo ✓ Dossiers créés
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 3: CRÉER .semgrep.yml
REM ╚════════════════════════════════════════════════════════════════╝

echo ⚙️  ÉTAPE 3: Création de .semgrep.yml (Security rules)...

(
echo rules:
echo   - id: no-eval
echo     pattern: eval(...)
echo     message: "🚨 DANGER! Never use eval()"
echo     severity: ERROR
echo     languages: [javascript, typescript]
echo.
echo   - id: no-hardcoded-secrets
echo     patterns:
echo       - pattern-either:
echo           - pattern: password = "..."
echo           - pattern: api_key = "..."
echo           - pattern: secret = "..."
echo           - pattern: token = "..."
echo     message: "🚨 Don't hardcode secrets! Use .env instead"
echo     severity: ERROR
echo     languages: [javascript, typescript]
echo.
echo   - id: no-console-sensitive
echo     pattern-either:
echo       - pattern: console.log($PASSWORD^)
echo       - pattern: console.log($TOKEN^)
echo       - pattern: console.log($API_KEY^)
echo     message: "⚠️  Don't log sensitive data"
echo     severity: WARNING
echo     languages: [javascript, typescript]
echo.
echo   - id: sql-injection-risk
echo     pattern-either:
echo       - pattern: db.query(... + ...^)
echo       - pattern: query(... + ...^)
echo     message: "🚨 Potential SQL injection - Use parameterized queries!"
echo     severity: ERROR
echo     languages: [javascript, typescript]
) > .semgrep.yml

echo ✓ .semgrep.yml créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 4: CRÉER .claude.config.json
REM ╚════════════════════════════════════════════════════════════════╝

echo 🤖 ÉTAPE 4: Création de .claude.config.json (ECC config)...

(
echo {
echo   "name": "Swiftly.io",
echo   "version": "1.0.0",
echo   "description": "African fintech payment platform - MVP Phase",
echo.
echo   "agents": {
echo     "planner": {
echo       "enabled": true,
echo       "role": "Plans architecture and system design",
echo       "focus": ["architecture", "system-design", "scalability", "performance"]
echo     },
echo.
echo     "code": {
echo       "enabled": true,
echo       "role": "Writes implementation code",
echo       "focus": ["typescript", "nodejs", "react", "api-design", "database"]
echo     },
echo.
echo     "security": {
echo       "enabled": true,
echo       "role": "Security audits and vulnerability scanning",
echo       "focus": ["encryption", "authentication", "authorization", "data-protection", "compliance"]
echo     },
echo.
echo     "testing": {
echo       "enabled": true,
echo       "role": "Writes tests and quality assurance",
echo       "focus": ["unit-tests", "integration-tests", "e2e-tests", "load-testing", "coverage"]
echo     },
echo.
echo     "memory": {
echo       "enabled": true,
echo       "role": "Maintains context between sessions",
echo       "focus": ["persistence", "knowledge-base", "documentation", "decision-log"]
echo     }
echo   },
echo.
echo   "constraints": {
echo     "language": "TypeScript",
echo     "framework": "Next.js 14+",
echo     "database": "PostgreSQL (Supabase)",
echo     "frontend": "React + Tailwind CSS",
echo     "deployment": "Vercel",
echo     "testing": "Jest + Playwright + K6",
echo     "security": "Semgrep + Zod + OWASP",
echo     "monitoring": "Sentry"
echo   },
echo.
echo   "project": {
echo     "phase": "MVP (Days 1-30)",
echo     "branches": ["SwiftlyTrack"],
echo     "screens": 24,
echo     "foundation_prompts": ["PROMPT #PAYMENT", "PROMPT #INPUT", "PROMPT #TRANSACTIONS"],
echo     "cost_mvp": "$0/month (free tiers)",
echo     "cost_phase2": "$180-200/month (paid tiers)"
echo   }
echo }
) > .claude.config.json

echo ✓ .claude.config.json créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 5: CRÉER .mcp-servers.json
REM ╚════════════════════════════════════════════════════════════════╝

echo 🔌 ÉTAPE 5: Création de .mcp-servers.json...

(
echo {
echo   "mcpServers": {
echo     "filesystem": {
echo       "command": "node",
echo       "args": ["node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", "."],
echo       "env": {
echo         "LOG_LEVEL": "error"
echo       }
echo     },
echo.
echo     "github": {
echo       "command": "npx",
echo       "args": ["@modelcontextprotocol/server-github"],
echo       "env": {
echo         "GITHUB_TOKEN": "${GITHUB_TOKEN}",
echo         "GITHUB_REPOSITORY": "azametyelias-stack/swiftly-io"
echo       }
echo     }
echo   }
echo }
) > .mcp-servers.json

echo ✓ .mcp-servers.json créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 6: CRÉER .env.example
REM ╚════════════════════════════════════════════════════════════════╝

echo 🔐 ÉTAPE 6: Création de .env.example...

(
echo # === SUPABASE ===
echo NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key_here
echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
echo.
echo # === PAYSTACK (Phase 2) ===
echo PAYSTACK_SECRET_KEY=your_paystack_secret_here
echo PAYSTACK_PUBLIC_KEY=your_paystack_public_here
echo.
echo # === UPSTASH REDIS ===
echo UPSTASH_REDIS_REST_URL=your_upstash_url_here
echo UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
echo.
echo # === SENTRY (Monitoring) ===
echo SENTRY_AUTH_TOKEN=your_sentry_token_here
echo.
echo # === APP CONFIG ===
echo NODE_ENV=development
echo NEXT_PUBLIC_APP_URL=http://localhost:3000
echo.
echo # === API ===
echo API_RATE_LIMIT=100
echo API_TIMEOUT=30000
) > .env.example

echo ✓ .env.example créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 7: CRÉER jest.config.js
REM ╚════════════════════════════════════════════════════════════════╝

echo ⚙️  ÉTAPE 7: Création de jest.config.js...

(
echo const nextJest = require('next/jest'^)
echo.
echo const createJestConfig = nextJest({
echo   dir: './',
echo }^)
echo.
echo const customJestConfig = {
echo   setupFilesAfterEnv: ['^<rootDir^>/jest.setup.js'],
echo   testEnvironment: 'jest-environment-jsdom',
echo   moduleNameMapper: {
echo     '^@/(.*)$': '^<rootDir^>/src/$1',
echo   },
echo   collectCoverageFrom: [
echo     'src/**/*.{js,jsx,ts,tsx}',
echo     '!src/**/*.d.ts',
echo   ],
echo   testMatch: [
echo     '^<rootDir^>/tests/**/*.test.{js,jsx,ts,tsx}',
echo     '^<rootDir^>/src/**/*.test.{js,jsx,ts,tsx}',
echo   ],
echo }
echo.
echo module.exports = createJestConfig(customJestConfig^)
) > jest.config.js

echo ✓ jest.config.js créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 8: CRÉER jest.setup.js
REM ╚════════════════════════════════════════════════════════════════╝

echo ⚙️  ÉTAPE 8: Création de jest.setup.js...

(
echo import '@testing-library/jest-dom'
) > jest.setup.js

echo ✓ jest.setup.js créé
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 9: INSTALLER NPM DEPENDENCIES
REM ╚════════════════════════════════════════════════════════════════╝

echo 📦 ÉTAPE 9: Installation des dépendances npm...
echo  (Cela peut prendre 2-3 minutes - sois patient!)
echo.

npm install @supabase/supabase-js zod @hookform/resolvers react-hook-form @sentry/nextjs jest @testing-library/react @testing-library/jest-dom

npm install --save-dev @types/jest jest-environment-jsdom @typescript-eslint/eslint-plugin @typescript-eslint/parser

echo ✓ Dépendances installées!
echo.

REM ╔════════════════════════════════════════════════════════════════╗
REM ÉTAPE 10: TESTS FINAUX
REM ╚════════════════════════════════════════════════════════════════╝

echo ✅ ÉTAPE 10: Vérification finale...
echo.

for /f "tokens=*" %%i in ('node --version') do echo ✓ Node.js: %%i
for /f "tokens=*" %%i in ('npm --version') do echo ✓ npm: %%i
for /f "tokens=*" %%i in ('git --version') do echo ✓ Git: %%i

echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo ✅ DAY 0 SETUP COMPLET!
echo.
echo 📋 Résumé de ce qui a été installé:
echo.
echo 1. ✓ .semgrep.yml (Security rules^)
echo 2. ✓ .claude.config.json (Claude Code config^)
echo 3. ✓ .mcp-servers.json (MCP servers^)
echo 4. ✓ Structure du projet (src/, tests/, docs/^)
echo 5. ✓ jest.config.js (Testing config^)
echo 6. ✓ .env.example (Environment template^)
echo 7. ✓ node_modules (All dependencies^)
echo.
echo 🎯 Prochaines étapes:
echo.
echo 1. Crée .env.local avec tes secrets:
echo    copy .env.example .env.local
echo    Puis ouvre .env.local et remplis les valeurs réelles
echo.
echo 2. Configure Supabase:
echo    https://supabase.com ^> Create project
echo    Copie les URLs dans .env.local
echo.
echo 3. Lance le serveur de dev:
echo    npm run dev
echo    Puis visite http://localhost:3000
echo.
echo 🚀 Ton environnement est prêt pour Days 1-30!
echo.
echo ════════════════════════════════════════════════════════════════
echo.

pause
