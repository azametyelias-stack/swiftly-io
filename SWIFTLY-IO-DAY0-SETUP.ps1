# ╔════════════════════════════════════════════════════════════════╗
# ║  🚀 SWIFTLY.IO - DAY 0 SETUP AUTOMATISÉ (Windows PowerShell)    ║
# ║  Installation complète en 10-15 minutes                         ║
# ╚════════════════════════════════════════════════════════════════╝

# Exit on error
$ErrorActionPreference = "Stop"

# Couleurs
$GREEN = "Green"
$RED = "Red"
$YELLOW = "Yellow"
$BLUE = "Cyan"

function Write-Header {
    param([string]$text)
    Write-Host "`n════════════════════════════════════════════════════════════════" -ForegroundColor $BLUE
    Write-Host "🚀 $text" -ForegroundColor $BLUE
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor $BLUE
}

function Write-Step {
    param([string]$text)
    Write-Host "`n$text" -ForegroundColor $YELLOW
}

function Write-Success {
    param([string]$text)
    Write-Host "✓ $text" -ForegroundColor $GREEN
}

function Write-Error-Custom {
    param([string]$text)
    Write-Host "✗ $text" -ForegroundColor $RED
}

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 0: VÉRIFIER ADMIN & ENVIRONNEMENT
# ╚════════════════════════════════════════════════════════════════╝

Write-Header "ÉTAPE 0: Vérification de l'environnement"

# Check if running as admin (optional but recommended)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "⚠️  NOTE: Script n'est pas lancé en admin (optionnel mais recommandé)" -ForegroundColor $YELLOW
    Write-Host "   Pour admin: clic droit PowerShell → 'Run as administrator'" -ForegroundColor $YELLOW
}

$projectDir = Get-Location
Write-Success "Project directory: $projectDir"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 1: VÉRIFIER LES PRÉREQUIS
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "📋 ÉTAPE 1: Vérification des prérequis"

function Check-Command {
    param(
        [string]$cmd,
        [string]$name
    )
    
    try {
        $result = & $cmd --version 2>$null
        Write-Success "$name installé"
        return $true
    } catch {
        Write-Error-Custom "$name manquant!"
        return $false
    }
}

Check-Command "node" "Node.js" | Out-Null
Check-Command "npm" "npm" | Out-Null
Check-Command "git" "Git" | Out-Null

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 2: INSTALLER SEMGREP (Windows)
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "🔒 ÉTAPE 2: Installation de Semgrep (Security Scanner)"

if (Get-Command semgrep -ErrorAction SilentlyContinue) {
    Write-Success "Semgrep déjà installé"
} else {
    Write-Host "Semgrep not found. Options d'installation:" -ForegroundColor $YELLOW
    Write-Host "1. Avec Chocolatey (si installé): choco install semgrep" -ForegroundColor $BLUE
    Write-Host "2. Avec Python: pip install semgrep" -ForegroundColor $BLUE
    Write-Host "3. Visite: https://semgrep.dev/docs/getting-started/" -ForegroundColor $BLUE
    Write-Host "" -ForegroundColor $YELLOW
    Write-Host "⚠️  Installe Semgrep manuellement si tu veux l'activer maintenant" -ForegroundColor $YELLOW
}

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 3: CRÉER CONFIGURATION SEMGREP
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "⚙️  ÉTAPE 3: Création du fichier .semgrep.yml"

$semgrepConfig = @"
rules:
  - id: no-eval
    pattern: eval(...)
    message: "🚨 DANGER! Never use eval()"
    severity: ERROR
    languages: [javascript, typescript]

  - id: no-hardcoded-secrets
    patterns:
      - pattern-either:
          - pattern: password = "..."
          - pattern: api_key = "..."
          - pattern: secret = "..."
          - pattern: token = "..."
    message: "🚨 Don't hardcode secrets! Use .env instead"
    severity: ERROR
    languages: [javascript, typescript]

  - id: no-console-sensitive
    pattern-either:
      - pattern: console.log(`$PASSWORD)
      - pattern: console.log(`$TOKEN)
      - pattern: console.log(`$API_KEY)
    message: "⚠️  Don't log sensitive data"
    severity: WARNING
    languages: [javascript, typescript]

  - id: sql-injection-risk
    pattern-either:
      - pattern: db.query(... + ...)
      - pattern: query(... + ...)
    message: "🚨 Potential SQL injection - Use parameterized queries!"
    severity: ERROR
    languages: [javascript, typescript]
"@

$semgrepConfig | Out-File -FilePath "$projectDir\.semgrep.yml" -Encoding UTF8
Write-Success ".semgrep.yml créé"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 4: CRÉER STRUCTURE DU PROJET
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "📁 ÉTAPE 4: Création de la structure du projet"

$folders = @(
    "src",
    "src\app\api",
    "src\app\api\webhooks",
    "src\app\api\transactions",
    "src\components",
    "src\lib\db",
    "src\lib\validation",
    "src\lib\security",
    "claude-agents",
    "claude-skills",
    "tests",
    "docs",
    ".github\workflows"
)

foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path "$projectDir\$folder" -Force | Out-Null
}

Write-Success "Dossiers créés"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 5: CRÉER CONFIGURATION ECC
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "🤖 ÉTAPE 5: Création du fichier .claude.config.json"

$eccConfig = @"
{
  "name": "Swiftly.io",
  "version": "1.0.0",
  "description": "African fintech payment platform - MVP Phase",
  
  "agents": {
    "planner": {
      "enabled": true,
      "role": "Plans architecture and system design",
      "focus": ["architecture", "system-design", "scalability", "performance"]
    },
    
    "code": {
      "enabled": true,
      "role": "Writes implementation code",
      "focus": ["typescript", "nodejs", "react", "api-design", "database"]
    },
    
    "security": {
      "enabled": true,
      "role": "Security audits and vulnerability scanning",
      "focus": ["encryption", "authentication", "authorization", "data-protection", "compliance"]
    },
    
    "testing": {
      "enabled": true,
      "role": "Writes tests and quality assurance",
      "focus": ["unit-tests", "integration-tests", "e2e-tests", "load-testing", "coverage"]
    },
    
    "memory": {
      "enabled": true,
      "role": "Maintains context between sessions",
      "focus": ["persistence", "knowledge-base", "documentation", "decision-log"]
    }
  },

  "constraints": {
    "language": "TypeScript",
    "framework": "Next.js 14+",
    "database": "PostgreSQL (Supabase)",
    "frontend": "React + Tailwind CSS",
    "deployment": "Vercel",
    "testing": "Jest + Playwright + K6",
    "security": "Semgrep + Zod + OWASP",
    "monitoring": "Sentry"
  },

  "project": {
    "phase": "MVP (Days 1-30)",
    "branches": ["SwiftlyTrack"],
    "screens": 24,
    "foundation_prompts": ["PROMPT #PAYMENT", "PROMPT #INPUT", "PROMPT #TRANSACTIONS"],
    "cost_mvp": "`$0/month (free tiers)",
    "cost_phase2": "`$180-200/month (paid tiers)"
  }
}
"@

$eccConfig | Out-File -FilePath "$projectDir\.claude.config.json" -Encoding UTF8
Write-Success ".claude.config.json créé"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 6: CRÉER MCP SERVERS CONFIG
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "🔌 ÉTAPE 6: Création du fichier .mcp-servers.json"

$mcpConfig = @"
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["node_modules/@modelcontextprotocol/server-filesystem/dist/index.js", "."],
      "env": {
        "LOG_LEVEL": "error"
      }
    },
    
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "`${GITHUB_TOKEN}",
        "GITHUB_REPOSITORY": "azametyelias-stack/swiftly-io"
      }
    }
  }
}
"@

$mcpConfig | Out-File -FilePath "$projectDir\.mcp-servers.json" -Encoding UTF8
Write-Success ".mcp-servers.json créé"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 7: CRÉER .ENV.EXAMPLE
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "🔐 ÉTAPE 7: Création du fichier .env.example"

$envExample = @"
# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# === PAYSTACK (Phase 2) ===
PAYSTACK_SECRET_KEY=your_paystack_secret_here
PAYSTACK_PUBLIC_KEY=your_paystack_public_here

# === UPSTASH REDIS ===
UPSTASH_REDIS_REST_URL=your_upstash_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here

# === SENTRY (Monitoring) ===
SENTRY_AUTH_TOKEN=your_sentry_token_here

# === APP CONFIG ===
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === API ===
API_RATE_LIMIT=100
API_TIMEOUT=30000
"@

$envExample | Out-File -FilePath "$projectDir\.env.example" -Encoding UTF8
Write-Success ".env.example créé"
Write-Host "⚠️  IMPORTANT: Crée .env.local avec tes vrais secrets!" -ForegroundColor $YELLOW

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 8: CRÉER JEST CONFIG
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "⚙️  ÉTAPE 8: Création de jest.config.js"

$jestConfig = @'
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
  ],
}

module.exports = createJestConfig(customJestConfig)
'@

$jestConfig | Out-File -FilePath "$projectDir\jest.config.js" -Encoding UTF8
Write-Success "jest.config.js créé"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 9: INSTALLER DÉPENDANCES NPM
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "📦 ÉTAPE 9: Installation des dépendances npm"

Write-Host "Installation en cours... (cela peut prendre 2-3 minutes)" -ForegroundColor $YELLOW

$dependencies = @(
    "@supabase/supabase-js",
    "zod",
    "@hookform/resolvers",
    "react-hook-form",
    "@sentry/nextjs",
    "jest",
    "@testing-library/react",
    "@testing-library/jest-dom"
)

npm install @supabase/supabase-js zod @hookform/resolvers react-hook-form @sentry/nextjs jest @testing-library/react @testing-library/jest-dom

npm install --save-dev `
    @types/jest `
    "jest-environment-jsdom" `
    "@typescript-eslint/eslint-plugin" `
    "@typescript-eslint/parser"

Write-Success "Dépendances installées!"

# ╔════════════════════════════════════════════════════════════════╗
# ÉTAPE 10: TESTS D'INSTALLATION
# ╚════════════════════════════════════════════════════════════════╝

Write-Step "✅ ÉTAPE 10: Tests d'installation"

Write-Success "Node.js: $(node --version)"
Write-Success "npm: $(npm --version)"
Write-Success "Git: $(git --version)"

# ╔════════════════════════════════════════════════════════════════╗
# RÉSUMÉ FINAL
# ╚════════════════════════════════════════════════════════════════╝

Write-Header "✅ DAY 0 SETUP COMPLET!"

Write-Host "`n📋 Résumé de ce qui a été installé:" -ForegroundColor $YELLOW

Write-Host "1. ✓ Configuration Semgrep (.semgrep.yml)" -ForegroundColor $GREEN
Write-Host "2. ✓ Configuration ECC (.claude.config.json)" -ForegroundColor $GREEN
Write-Host "3. ✓ Configuration MCP (.mcp-servers.json)" -ForegroundColor $GREEN
Write-Host "4. ✓ Structure du projet (src/, tests/, docs/)" -ForegroundColor $GREEN
Write-Host "5. ✓ Jest configuration" -ForegroundColor $GREEN
Write-Host "6. ✓ .env.example template" -ForegroundColor $GREEN
Write-Host "7. ✓ npm dependencies" -ForegroundColor $GREEN

Write-Host "`n🎯 Prochaines étapes:" -ForegroundColor $YELLOW

Write-Host "`n1. Crée .env.local avec tes secrets:" -ForegroundColor $BLUE
Write-Host "   copy .env.example .env.local" -ForegroundColor $BLUE
Write-Host "   Puis remplis les valeurs réelles" -ForegroundColor $BLUE

Write-Host "`n2. Configure Supabase:" -ForegroundColor $BLUE
Write-Host "   https://supabase.com → Create project" -ForegroundColor $BLUE

Write-Host "`n3. Vérifie que tout fonctionne:" -ForegroundColor $BLUE
Write-Host "   npm run dev" -ForegroundColor $BLUE
Write-Host "   Puis visite http://localhost:3000" -ForegroundColor $BLUE

Write-Host "`n4. Teste Semgrep:" -ForegroundColor $BLUE
Write-Host "   semgrep scan ." -ForegroundColor $BLUE

Write-Host "`n🚀 Ton environnement est prêt pour Days 1-30!" -ForegroundColor $GREEN
Write-Host ""
