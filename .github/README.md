# `.github/` — CI & dependency hygiene

SECURITY MASTERPLAN — **Point 18: Dependencies Updated.**

## `workflows/ci.yml`

Runs on every push to `main` and every pull request.

| Job | Steps | Fails the build when |
| --- | --- | --- |
| `verify` | `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build` | lint error, type error, failing test, or broken build |
| `audit` | `npm ci` → `npm audit --omit=dev --audit-level=high` (+ a report-only dev audit) | a **runtime** dependency has a known **high/critical** advisory |

> The masterplan says `npm audit --production`. That flag is deprecated since
> npm 7 — the current spelling is `npm audit --omit=dev`. Dev-only advisories
> are printed but do not block a release (they never ship to users).

## `dependabot.yml`

| Ecosystem | Schedule | Grouping |
| --- | --- | --- |
| `npm` (root) | weekly, Monday | `minor` + `patch` → one PR; each `major` → its own PR |
| `github-actions` (root) | weekly, Monday | — |

`next`, `react`, `react-dom` and `eslint-config-next` **majors** are ignored —
this Next.js build carries breaking changes even across minors (see
[`AGENTS.md`](../AGENTS.md)), so majors are taken by hand. Security updates from
GitHub's advisory database are always on and ignore the weekly schedule.

## `package.json` version rules (locked by `tests/meta/dependencies.test.ts`)

- Every spec is a **caret range** (`^16.3.3`) or an **exact pin** (`16.3.3`).
- Never `"*"`, `"latest"`, `""`, `~…`, `>=…`, or a git / URL ref.
- `package-lock.json` (v2+) is committed so `npm ci` is reproducible.

## Keeping current by hand

```bash
npm audit                       # 0 vulnerabilities expected
npm outdated                    # what has moved
npm update                      # pull everything in-range (caret) + refresh the lock
# majors: bump one at a time, run `npm run lint && npx tsc --noEmit && npm test && npm run build`
```
