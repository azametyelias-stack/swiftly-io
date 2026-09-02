#!/usr/bin/env bash
#
# Encrypted off-site database backup — SECURITY MASTERPLAN Point 20 (Phase 2).
#
#   pg_dump  →  gzip  →  openssl AES-256-CBC (pbkdf2)  →  aws s3 cp
#
# Runs on Linux/macOS/WSL/CI, NOT native Windows PowerShell. Needs: pg_dump
# (postgresql-client 15+), gzip, openssl 3.x, aws CLI v2.
#
# Env (all required; secrets — never echo, never commit):
#   SUPABASE_DB_URL        postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
#   BACKUP_ENCRYPTION_KEY  passphrase for openssl (store a copy in a password manager)
#   BACKUP_S3_BUCKET       e.g. swiftly-io-backups
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION
#
# Optional:
#   BACKUP_S3_PREFIX      key prefix (default: "db")
#   PGDUMP_ARGS           extra pg_dump args (default: "--no-owner --no-privileges")
#
# Retention (delete backups older than 30 days) is an S3 lifecycle rule, not this
# script's job — see scripts/backup/README.md.

set -euo pipefail

fail() { echo "backup: $*" >&2; exit 1; }

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"
: "${AWS_DEFAULT_REGION:?AWS_DEFAULT_REGION is required}"

for bin in pg_dump gzip openssl aws; do
  command -v "$bin" >/dev/null 2>&1 || fail "missing dependency: $bin"
done

prefix="${BACKUP_S3_PREFIX:-db}"
# shellcheck disable=SC2206
pgdump_args=(${PGDUMP_ARGS:---no-owner --no-privileges})

now_utc="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
s3_key="${prefix}/$(date -u +%Y/%m/%d)/db-${now_utc}.sql.gz.enc"
s3_uri="s3://${BACKUP_S3_BUCKET}/${s3_key}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
plain="${workdir}/dump.sql.gz"
cipher="${workdir}/dump.sql.gz.enc"

echo "backup: dumping database → ${plain}"
# --no-sync: we don't care about fsync durability for a throwaway dump file.
pg_dump "$SUPABASE_DB_URL" "${pgdump_args[@]}" --format=plain --no-sync \
  | gzip -9 > "$plain"

# A healthy compressed dump of a non-empty schema is comfortably > 1 KiB.
size="$(wc -c < "$plain")"
[ "$size" -ge 1024 ] || fail "dump looks empty (${size} bytes) — aborting, NOT uploading"
echo "backup: dump ok (${size} bytes compressed)"

echo "backup: encrypting (AES-256-CBC, pbkdf2)"
openssl enc -aes-256-cbc -pbkdf2 -iter 240000 -salt \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$plain" -out "$cipher"

# Verify the ciphertext actually decrypts before we rely on it.
openssl enc -d -aes-256-cbc -pbkdf2 -iter 240000 -salt \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in "$cipher" -out /dev/null || fail "self-check failed: ciphertext does not decrypt"

echo "backup: uploading → ${s3_uri}"
aws s3 cp "$cipher" "$s3_uri" \
  --only-show-errors \
  --sse AES256 \
  --metadata "created=${now_utc},tool=supabase-backup.sh"

echo "backup: done — ${s3_uri} ($(wc -c < "$cipher") bytes)"
