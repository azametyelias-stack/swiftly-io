#!/usr/bin/env bash
#
# Restore an encrypted backup produced by supabase-backup.sh — Point 20 (Phase 2).
#
#   aws s3 cp  →  openssl -d AES-256-CBC  →  gunzip  →  psql  into TARGET_DATABASE_URL
#
# Usage:
#   TARGET_DATABASE_URL=postgresql://...  ./restore-from-backup.sh --latest
#   TARGET_DATABASE_URL=postgresql://...  ./restore-from-backup.sh s3://bucket/db/2026/09/02/db-....sql.gz.enc
#
# ⚠️  NEVER restore onto production. This script refuses a TARGET_DATABASE_URL that
#     matches SUPABASE_DB_URL or $PROD_DB_HOST unless ALLOW_PROD_RESTORE=yes AND
#     you type the confirmation phrase.
#
# Env:
#   TARGET_DATABASE_URL     where to load the dump (a NEW project / branch / local pg)
#   BACKUP_ENCRYPTION_KEY   the passphrase the backup was created with
#   BACKUP_S3_BUCKET        (only for --latest) bucket to list
#   AWS_*                   credentials + region
#   PROD_DB_HOST            optional extra host substring to treat as production
#   ALLOW_PROD_RESTORE      must be "yes" to even be asked about a prod-looking target

set -euo pipefail

fail() { echo "restore: $*" >&2; exit 1; }

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required}"
[ $# -ge 1 ] || fail "usage: restore-from-backup.sh (--latest | s3://<uri>)"

for bin in openssl gunzip psql aws; do
  command -v "$bin" >/dev/null 2>&1 || fail "missing dependency: $bin"
done

# ---------------------------------------------------------------------------
# Production guard
# ---------------------------------------------------------------------------
looks_like_prod=no
if [ -n "${SUPABASE_DB_URL:-}" ] && [ "$TARGET_DATABASE_URL" = "${SUPABASE_DB_URL:-}" ]; then
  looks_like_prod=yes
fi
if [ -n "${PROD_DB_HOST:-}" ] && printf '%s' "$TARGET_DATABASE_URL" | grep -qF "$PROD_DB_HOST"; then
  looks_like_prod=yes
fi

if [ "$looks_like_prod" = yes ]; then
  [ "${ALLOW_PROD_RESTORE:-no}" = yes ] \
    || fail "TARGET looks like PRODUCTION and ALLOW_PROD_RESTORE != yes — refusing."
  echo "restore: TARGET looks like PRODUCTION."
  printf 'Type exactly: I understand this overwrites production\n> '
  read -r confirmation
  [ "$confirmation" = "I understand this overwrites production" ] \
    || fail "confirmation phrase did not match — aborting."
fi

# ---------------------------------------------------------------------------
# Resolve the S3 object
# ---------------------------------------------------------------------------
if [ "$1" = "--latest" ]; then
  : "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required for --latest}"
  prefix="${BACKUP_S3_PREFIX:-db}"
  s3_uri="$(aws s3 ls "s3://${BACKUP_S3_BUCKET}/${prefix}/" --recursive \
    | sort | tail -n 1 | awk '{print $4}')"
  [ -n "$s3_uri" ] || fail "no backups found under s3://${BACKUP_S3_BUCKET}/${prefix}/"
  s3_uri="s3://${BACKUP_S3_BUCKET}/${s3_uri}"
else
  s3_uri="$1"
fi
echo "restore: source = ${s3_uri}"

workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT
cipher="${workdir}/dump.sql.gz.enc"
gzipped="${workdir}/dump.sql.gz"
plain="${workdir}/dump.sql"

aws s3 cp "$s3_uri" "$cipher" --only-show-errors

echo "restore: decrypting"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 240000 -salt \
  -pass env:BACKUP_ENCRYPTION_KEY -in "$cipher" -out "$gzipped" \
  || fail "decryption failed — wrong BACKUP_ENCRYPTION_KEY?"

gunzip -c "$gzipped" > "$plain"
lines="$(wc -l < "$plain")"
[ "$lines" -ge 10 ] || fail "decrypted dump has only ${lines} lines — looks wrong"
echo "restore: dump ok (${lines} lines) — loading into target"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$plain"

echo "restore: done. Now run the smoke checks in supabase/BACKUPS.md → 'Verifying a restore'."
