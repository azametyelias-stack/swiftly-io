# `scripts/backup/` — off-Supabase encrypted backups

SECURITY MASTERPLAN **Point 20**, Phase 2. Full context + the **restore
procedure** live in [`supabase/BACKUPS.md`](../../supabase/BACKUPS.md).

| File | What |
| --- | --- |
| `supabase-backup.sh` | `pg_dump` → `gzip -9` → `openssl aes-256-cbc -pbkdf2` → `aws s3 cp`. Verifies the dump isn't empty and that the ciphertext decrypts before uploading. |
| `restore-from-backup.sh` | S3 → decrypt → `gunzip` → `psql "$TARGET_DATABASE_URL"`. Refuses a production-looking target unless `ALLOW_PROD_RESTORE=yes` + a typed phrase. |
| `github-actions-backup.yml` | Template daily workflow. **Not** under `.github/workflows/` — move it there to activate. |

These are POSIX shell — run them in CI, WSL, macOS or Linux, **not** native
Windows PowerShell. Local deps: `postgresql-client` 15+, `openssl` 3.x, `awscli` v2.

## When do I actually need this?

- **Supabase Pro/PITR** → managed backups already cover Point 20. Treat these
  scripts as a bonus second copy (off-vendor) and skip scheduling them if you want.
- **Supabase Free** → there are **no** managed backups. Either upgrade to Pro, or
  schedule this job. Until one is true, Point 20 is not satisfied.

## One-time setup

1. **S3 bucket** (e.g. `swiftly-io-backups`), Block Public Access ON,
   **default encryption** ON (SSE-S3 or SSE-KMS).
2. **Lifecycle rule** on the bucket: expire objects after **30 days** (this is the
   retention — the script never deletes).
3. **IAM user** limited to `s3:PutObject` + `s3:GetObject` + `s3:ListBucket` on
   that bucket only. Take its access key / secret.
4. **Encryption passphrase**: generate a long random one
   (`openssl rand -base64 48`). Store it in the team password manager **and**
   nowhere in the repo. Lose it → the backups are unrecoverable by design.
5. Put all of it in GitHub repo secrets (or your runner's env):

   | Secret | Example / source |
   | --- | --- |
   | `SUPABASE_DB_URL` | Supabase dashboard → Database → Connection string → URI (contains the DB password) |
   | `BACKUP_ENCRYPTION_KEY` | the passphrase from step 4 |
   | `BACKUP_S3_BUCKET` | `swiftly-io-backups` |
   | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` | step 3 + your region |

6. `mv scripts/backup/github-actions-backup.yml .github/workflows/backup.yml`,
   commit, then **Actions → DB backup → Run workflow** to test it once.

## First restore drill (do this before you trust it)

```bash
export TARGET_DATABASE_URL='postgresql://postgres:...@db.<scratchref>.supabase.co:5432/postgres'
export BACKUP_ENCRYPTION_KEY='...'         # same as the backup
export BACKUP_S3_BUCKET='swiftly-io-backups'
./scripts/backup/restore-from-backup.sh --latest
# then run the smoke checks from supabase/BACKUPS.md
```

Never point `TARGET_DATABASE_URL` at the production project.

## Manual local backup (no CI)

```bash
export SUPABASE_DB_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres'
export BACKUP_ENCRYPTION_KEY='...'
export BACKUP_S3_BUCKET='swiftly-io-backups' AWS_DEFAULT_REGION='eu-west-1'
export AWS_ACCESS_KEY_ID='...' AWS_SECRET_ACCESS_KEY='...'
./scripts/backup/supabase-backup.sh
```
