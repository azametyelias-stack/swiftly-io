import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guardrail for SECURITY MASTERPLAN — Point 4.
 *
 * Every `create table public.<t>` in a migration MUST be followed (in the same
 * file) by `alter table public.<t> enable row level security`. RLS-on with no
 * policies is a hard deny for anon/authenticated, which is the safe default;
 * this test only fails when a table is created with RLS left OFF.
 */

const migrationsDir = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

function normalize(sql: string): string {
  // strip line comments, collapse whitespace, lowercase
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));

test("there is at least one migration to check", () => {
  assert.ok(files.length > 0, "no .sql files in supabase/migrations/");
});

for (const file of files) {
  test(`${file}: every created table enables RLS`, () => {
    const sql = normalize(readFileSync(migrationsDir + file, "utf8"));

    const created = [
      ...sql.matchAll(/create table (?:if not exists )?public\.([a-z0-9_]+)/g),
    ].map((m) => m[1]!);

    const rlsEnabled = new Set(
      [
        ...sql.matchAll(
          /alter table (?:if exists )?public\.([a-z0-9_]+) enable row level security/g,
        ),
      ].map((m) => m[1]!),
    );

    const missing = created.filter((t) => !rlsEnabled.has(t));
    assert.deepEqual(
      missing,
      [],
      `tables created without "enable row level security": ${missing.join(", ")}`,
    );
  });
}
