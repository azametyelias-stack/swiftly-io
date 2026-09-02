import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// SECURITY MASTERPLAN Point 20 — Automated Database Backups.
// There is nothing runnable to unit-test (backups are a Supabase/ops concern),
// so this locks the *documentation + scripts* that make a restore possible:
//   - a runbook with an actual restore procedure exists;
//   - the backup script encrypts (AES-256) and fails safe;
//   - the restore script guards against clobbering production;
//   - the scheduled workflow is a template, not live (no silent nightly failures).

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

test("the backup runbook exists and covers restore + plan verification", () => {
  assert.ok(existsSync(repo("supabase/BACKUPS.md")), "supabase/BACKUPS.md must exist");
  const doc = read("supabase/BACKUPS.md");
  assert.match(doc, /Point 20/);
  assert.match(doc, /## Restore procedure/i, "must document how to restore");
  assert.match(doc, /Database → Backups/i, "must tell the reader to verify the dashboard");
  assert.match(doc, /never (test a )?restore (against|on) production/i, "must warn against restoring on prod");
  assert.match(doc, /RPO|RTO/, "must state recovery objectives");
});

test("supabase/README links to the backup runbook", () => {
  assert.match(read("supabase/README.md"), /BACKUPS\.md/);
});

test("backup script: strict mode, AES-256, empty-dump guard, no hardcoded secrets", () => {
  const sh = read("scripts/backup/supabase-backup.sh");
  assert.match(sh, /set -euo pipefail/, "must use strict bash mode");
  assert.match(sh, /aes-256-cbc/, "must encrypt with AES-256");
  assert.match(sh, /-pbkdf2/, "openssl must use pbkdf2 key derivation");
  assert.match(sh, /pass env:BACKUP_ENCRYPTION_KEY/, "passphrase must come from env, not an arg/file");
  assert.match(sh, /wc -c|stat/, "must check the dump size before uploading");

  // credentials only ever come from the environment — scan executable lines,
  // not the `#` comment block that documents the env vars with placeholders.
  const code = sh
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("#"))
    .join("\n");
  assert.doesNotMatch(code, /:\/\/[^\s"']*:[^\s"'@]{6,}@/, "no connection string with an inline password");
  assert.doesNotMatch(code, /AKIA[0-9A-Z]{16}/, "no AWS access key id in the script");
});

test("restore script: refuses a production target without an explicit override", () => {
  const sh = read("scripts/backup/restore-from-backup.sh");
  assert.match(sh, /set -euo pipefail/);
  assert.match(sh, /ALLOW_PROD_RESTORE/, "must have a prod override gate");
  assert.match(sh, /aes-256-cbc/);
  assert.match(sh, /ON_ERROR_STOP=1/, "psql must stop on the first error");
});

test("the scheduled workflow is a template, not an active workflow", () => {
  assert.ok(
    existsSync(repo("scripts/backup/github-actions-backup.yml")),
    "the template workflow must exist under scripts/backup/",
  );
  assert.ok(
    !existsSync(repo(".github/workflows/backup.yml")),
    "backup.yml must NOT be live in .github/workflows/ until secrets are configured",
  );
  const wf = read("scripts/backup/github-actions-backup.yml");
  assert.match(wf, /cron:/, "template must define a schedule");
  assert.match(wf, /secrets\.BACKUP_ENCRYPTION_KEY/, "template must read the key from secrets");
});
