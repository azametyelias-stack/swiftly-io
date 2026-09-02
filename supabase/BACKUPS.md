# Database backups & restore — SECURITY MASTERPLAN Point 20

> **Risk without:** database deleted / corrupted → data gone forever. Level: CRITICAL.

## TL;DR

| Phase | What | Status |
| --- | --- | --- |
| **MVP** | Restore runbook + backup scripts + tests in place | ✅ **done (structure‑ready)** — decision below |
| **Day ~30** | Turn on Supabase managed daily backups | ⏳ when the project upgrades to Pro |
| Phase 2 | Own `pg_dump` → AES‑256 → S3, 30‑day retention (runs off Supabase) | scripts ready in [`scripts/backup/`](../scripts/backup/), not scheduled |
| Phase 3 | Multi‑region, hourly | notes only |

### Decision (2026‑09‑02)

Swiftly.io runs on the **Supabase Free tier** for the MVP (budget). Free tier has
**no** automated backups, and that is an **accepted, non‑blocking** state for
Days 9–30 — **do not wait on backups to ship the MVP**. Point 20 MVP is
considered complete: the runbook, the off‑Supabase scripts, and the guardrail
tests are all here. Backups get *activated* when the project moves to Pro
(targeted ~Day 30): flip the dashboard toggle and/or schedule the
`scripts/backup/` job.

---

## MVP — Supabase managed backups

### ❗ Reality check: the free plan does **not** include automated backups

The masterplan says "déjà inclus, gratuit". That is **only true from the Pro plan
up**. What each plan actually gives (verify — Supabase changes this):

| Plan | Automated backups | Retention | PITR |
| --- | --- | --- | --- |
| **Free** | ❌ none | — | ❌ |
| Pro ($25/mo) | ✅ daily | 7 days | add‑on |
| Pro + PITR add‑on | ✅ + WAL | up to 28 days | ✅ (to the minute) |

### Step 1 — verify what THIS project has

Supabase dashboard → **Project → Database → Backups**
(also **Settings → Add‑ons** for PITR).

- If you see a list of daily backups with dates → managed backups are on. Note the
  retention window.
- If you see "Backups are available on the Pro plan" → **this project has no
  automated backups**. Pick one:
  1. **Upgrade to Pro** — simplest, gets daily + 7 days, and PITR is one toggle.
  2. **Schedule the self‑hosted job** in [`scripts/backup/`](../scripts/backup/)
     (below). Free‑plan‑friendly; you own the S3 bill (cents/month).

Per the decision above, doing neither is fine for the MVP window — just don't
forget to revisit it at the Pro upgrade.

### Step 2 — recovery objectives (what we're aiming for)

| | Target (MVP) |
| --- | --- |
| RPO (max data loss) | ≤ 24 h (daily backup) — ≤ 5 min with PITR |
| RTO (time to restore) | ≤ 2 h |

---

## Restore procedure — **read this before you need it**

> ⚠️ **Never test a restore against production.** Restore into a *new* project or a
> Supabase **branch**, point a staging app at it, verify, then throw it away.

### A. Restore a Supabase managed backup (Pro)

1. Dashboard → **Database → Backups**.
2. Pick a backup → **Restore**. For PITR: **Restore → Point in time** → choose the
   timestamp.
3. Supabase restores **in place** (same project ref, same connection string) and
   takes the DB offline for the duration. Expect several minutes to ~1 h.
4. After it comes back: run the smoke checks in *Verifying a restore* below.

**Safer variant (no downtime on prod):** create a **branch** from the backup,
verify there, then promote — or copy the data you need back with `pg_dump`
`--data-only` for specific tables.

### B. Restore from a self‑hosted encrypted dump (`scripts/backup/`)

Prereqs: `psql`, `openssl`, `aws` CLI, and the `BACKUP_ENCRYPTION_KEY` used to
create the dump.

```bash
# 1. Spin up a TARGET (new Supabase project, or a local postgres) and get its URL.
export TARGET_DATABASE_URL='postgresql://postgres:...@db.<newref>.supabase.co:5432/postgres'

# 2. Restore the newest dump from S3 (the script downloads + decrypts + loads):
./scripts/backup/restore-from-backup.sh --latest

#    or a specific one:
./scripts/backup/restore-from-backup.sh s3://swiftly-io-backups/2026/09/02/db-030000.sql.gz.enc
```

The script **refuses** a `TARGET_DATABASE_URL` that looks like production unless
`ALLOW_PROD_RESTORE=yes` is set *and* you type the confirmation phrase.

Manual equivalent (if the script isn't available):

```bash
aws s3 cp s3://<bucket>/<path>/db-XXXXXX.sql.gz.enc ./dump.sql.gz.enc
openssl enc -d -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY \
  -in ./dump.sql.gz.enc -out ./dump.sql.gz
gunzip ./dump.sql.gz
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f ./dump.sql
shred -u ./dump.sql ./dump.sql.gz.enc     # don't leave plaintext lying around
```

### Verifying a restore (smoke checks)

```sql
-- row counts in the right ballpark
select
  (select count(*) from auth.users)                as users,
  (select count(*) from public.consent_logs)       as consent_logs,
  (select count(*) from public.privacy_settings)   as privacy_settings;

-- RLS still enabled on every public table (Point 4)
select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;   -- expect 0 rows

-- newest data present (adjust once app tables exist)
select max(created_at) from public.consent_logs;
```

Then: point a **staging** deployment at `TARGET_DATABASE_URL`, sign in, load a few
screens. Only once that passes is the backup considered good.

### After ANY real incident

Write a short post‑mortem in `docs/` (what broke, RPO/RTO actually achieved,
what to fix). Restore drills: once a quarter, minimum.

---

## Phase 2 — external encrypted backups (scripts ready, not scheduled)

[`scripts/backup/`](../scripts/backup/) contains:

| File | Purpose |
| --- | --- |
| `supabase-backup.sh` | `pg_dump` → `gzip` → `openssl aes‑256‑cbc` → `aws s3 cp`. Idempotent, `set -euo pipefail`, fails loudly on an empty dump. |
| `restore-from-backup.sh` | reverse of the above, into `TARGET_DATABASE_URL`, with a production guard. |
| `github-actions-backup.yml` | a **template** workflow (daily `cron`). It lives here, **not** in `.github/workflows/`, so it does nothing until you move it and set the secrets. |
| `README.md` | required env / secrets, S3 bucket + lifecycle (30‑day expiry) setup, first‑run checklist. |

Secrets it needs (GitHub repo → Settings → Secrets, or your runner's env) —
**never commit these, never echo them in logs**:

```
SUPABASE_DB_URL          postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
BACKUP_ENCRYPTION_KEY     long random passphrase (store in a password manager too — lose it, lose the backups)
BACKUP_S3_BUCKET          swiftly-io-backups
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION   IAM user limited to s3:PutObject/GetObject on that bucket
```

Retention = an **S3 lifecycle rule** (expire after 30 days) — not the script's job.
Enable **S3 bucket default encryption** (SSE‑S3 or SSE‑KMS) as a second layer on
top of the client‑side AES‑256.

---

## Phase 3 — multi‑region, hourly

- Cross‑region S3 replication of the backup bucket (or write to two buckets).
- Hourly `pg_dump` (or lean on PITR WAL shipping instead of frequent full dumps).
- A standby Supabase project in a second region; documented failover (DNS / env
  swap) with a target RTO ≤ 15 min.
- Automated monthly restore test in CI against a scratch project.
