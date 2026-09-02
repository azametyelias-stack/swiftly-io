# Défense en profondeur — les 3 couches

Statut : **actives et branchées dans la CI** depuis 2026-09-02.
Référence historique : `docs/5-FOUNDATION (…)/SWIFTLY-COMPLETE-FEATURES-SCAN.md` § System 4.

Les 3 couches ne se remplacent pas : chacune attrape une classe d'erreurs que
les autres laissent passer.

```
LAYER 1 · CODE ANALYSIS  ── Semgrep ──────────── AVANT exécution
   scanne le code : injection SQL, XSS, eval, secrets en clair,
   entpropées de nos propres conventions masterplan.

LAYER 2 · INPUT VALIDATION ── Zod ────────────── À l'entrée de chaque route
   aucune donnée non conforme n'entre. Garbage in = 400.

LAYER 3 · BUSINESS LOGIC ── revue manuelle (ECC AgentShield) ── AVANT deploy
   race conditions, bugs d'autorisation, règles métier
   (solde négatif ?), intégrité des données.
```

---

## LAYER 1 — Semgrep

| | |
|---|---|
| **Où** | CI, job `sast` dans [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — chaque push + chaque PR |
| **Règles maison** | [`semgrep.yml`](../../semgrep.yml) — encode nos conventions (Points 6, 7, 10/11, 14, 19) |
| **Règles managées** | `p/typescript`, `p/react`, `p/nextjs`, `p/owasp-top-ten`, `p/secrets` (tirées du registre en CI) |
| **Exclusions** | [`.semgrepignore`](../../.semgrepignore) — `node_modules/`, `.next/`, `ecc/`, `docs/`, `graphify-out/` |
| **Blocage** | `--severity=ERROR` → un seul finding ERROR casse le build |
| **En local** | `npm run scan` (règles maison seules, hors-ligne — OK derrière Avast) · `npm run scan:full` (tout, nécessite le réseau) |
| **Faux positif** | commentaire inline `// nosemgrep: <rule-id> -- <raison>` |
| **Lock de test** | [`tests/security/semgrep.test.ts`](../../tests/security/semgrep.test.ts) |

> Semgrep tourne mal en natif Windows (lent / se fige). La CI (conteneur Ubuntu
> `semgrep/semgrep`) est la source de vérité ; le scan local est un confort.

## LAYER 2 — Zod

| | |
|---|---|
| **Où** | [`lib/validation/`](../../lib/validation/) — `parseJsonBody(req, schema)` en tête de chaque route |
| **Règle** | body **+** query **+** params validés ; `.strict()` partout ; l'identité n'est jamais un input |
| **Statut** | registre + schémas prêts (P2). Se branche route par route **dès la 1re route du Lot 1** |
| **Lock de test** | [`tests/validation/inputs.test.ts`](../../tests/validation/inputs.test.ts), [`tests/validation/schemas.test.ts`](../../tests/validation/schemas.test.ts) |

Détail : [`lib/validation/README.md`](../../lib/validation/README.md).

## LAYER 3 — Revue logique métier (ECC AgentShield)

| | |
|---|---|
| **Quoi** | revue manuelle de la logique sensible avant qu'elle ne parte |
| **Vérifie** | race conditions · un user peut-il voir/modifier les données d'un autre ? · le solde peut-il devenir incohérent ? · recalculs (D3) corrects ? |
| **Outil** | `npx ecc-agentshield scan --opus` (repo `ecc/`) en support de la revue à la main |
| **Points de contrôle** | **fin de Lot 3** (transactions = le cœur : solde, transferts, autorisation, recalculs) · **fin de Lot 5** (budgets/projets/templates) · **Day 29** avant le déploiement |

Ne pas attendre Day 29 tout seul : à ce stade un défaut de conception est déjà
enfoui sous 6 lots.

---

## Calendrier

| Moment | L1 Semgrep | L2 Zod | L3 revue métier |
|---|---|---|---|
| Prérequis (maintenant) | ✅ branché CI | ✅ registre prêt | — |
| Lot 1 → Lot 6 | tourne à chaque push | se branche à chaque route | — |
| Fin Lot 3 | — | — | ✅ 1re revue (transactions) |
| Fin Lot 5 | — | — | ✅ 2e revue |
| Day 29 (pré-deploy) | scan complet | audit couverture | ✅ revue finale + `ecc-agentshield` |
