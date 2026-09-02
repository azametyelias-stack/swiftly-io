import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// SECURITY MASTERPLAN — defense-in-depth LAYER 1 (Code Analysis / Semgrep).
// Locks the wiring so the static-analysis layer can't silently disappear:
//   - a repo-local rule file exists with real rules;
//   - .semgrepignore keeps the scan off vendored / generated trees;
//   - CI runs Semgrep on every push/PR and fails the build on an ERROR finding;
//   - `npm run scan` exists for an offline local pass.
// It does NOT run Semgrep (that needs the Python engine) — CI job "sast" does.

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

test("a repo-local Semgrep rule file exists with at least a few real rules", () => {
  assert.ok(existsSync(repo("semgrep.yml")), "semgrep.yml must be committed at the repo root");
  const cfg = read("semgrep.yml");
  assert.match(cfg, /^rules:/m, "semgrep.yml must declare a `rules:` list");

  const ids = [...cfg.matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 5, `expected >= 5 custom rules, found ${ids.length}`);
  assert.ok(new Set(ids).size === ids.length, "rule ids must be unique");

  // Every rule carries a severity and a message.
  const severities = [...cfg.matchAll(/^\s*severity:\s*(\S+)/gm)].map((m) => m[1]);
  assert.ok(
    severities.length >= ids.length,
    "every rule needs an explicit severity",
  );
  assert.match(cfg, /message:/, "rules must explain themselves");
});

test("the masterplan conventions each have a rule", () => {
  const cfg = read("semgrep.yml");
  for (const id of [
    "swiftly-raw-error-in-response-body", // Point 14
    "swiftly-sql-string-interpolation", // Point 10/11
    "swiftly-server-env-in-client-component", // Point 7
    "swiftly-insecure-random-in-auth", // Point 19
    "swiftly-user-id-from-request-body", // Point 6
  ]) {
    assert.match(cfg, new RegExp(`id:\\s*${id}\\b`), `missing rule ${id}`);
  }
});

test(".semgrepignore keeps the scan off vendored / generated trees", () => {
  assert.ok(existsSync(repo(".semgrepignore")), ".semgrepignore must be committed");
  const ignore = read(".semgrepignore");
  for (const path of ["node_modules/", ".next/", "ecc/", "docs/", "graphify-out/"]) {
    assert.ok(ignore.includes(path), `.semgrepignore must exclude ${path}`);
  }
});

test("CI runs Semgrep on every push/PR and fails on an ERROR finding", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /semgrep\/semgrep:/, "CI must run the pinned Semgrep image");
  assert.match(ci, /semgrep scan/, "CI must invoke `semgrep scan`");
  assert.match(ci, /--error/, "the scan must fail the build on findings");
  assert.match(ci, /--config \.\/semgrep\.yml/, "CI must load the repo-local rules");
  // and the managed rule packs that need registry network
  for (const pack of ["p/typescript", "p/owasp-top-ten", "p/secrets"]) {
    assert.ok(ci.includes(pack), `CI scan should also pull ${pack}`);
  }
});

test("`npm run scan` exists for a local offline pass", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const scan = pkg.scripts?.scan;
  assert.ok(scan, "package.json needs a `scan` script");
  assert.match(scan!, /semgrep scan/, "`scan` must invoke semgrep");
  assert.match(scan!, /--config \.\/semgrep\.yml/, "`scan` must use the repo-local rules");
});
