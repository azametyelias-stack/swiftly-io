import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// SECURITY MASTERPLAN Point 18 — Dependencies Updated.
// Locks the conventions that keep dependencies patchable and auditable:
//   - every version spec is a bounded range (caret) or an exact pin — never
//     "*", "latest", "", or a git / http URL (step 5 of the checklist);
//   - a v2+ lockfile exists so CI can run `npm ci` reproducibly;
//   - the CI workflow runs `npm ci` + `npm audit` and Dependabot is configured.

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");
const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

// A caret range (^1.2.3, ^1, ^1.2) or a fully pinned version (1.2.3, 1.2.3-rc.1).
const CARET_OR_PINNED = /^(\^)?\d+(\.\d+){0,2}(-[0-9A-Za-z.-]+)?$/;

test("every dependency uses a caret range or an exact pin", () => {
  assert.ok(Object.keys(allDeps).length > 0, "expected dependencies to exist");
  for (const [name, spec] of Object.entries(allDeps)) {
    assert.notEqual(spec, "*", `${name} must not be pinned to "*"`);
    assert.notEqual(spec.toLowerCase(), "latest", `${name} must not track "latest"`);
    assert.notEqual(spec.trim(), "", `${name} must have an explicit version`);
    assert.doesNotMatch(
      spec,
      /^(git\+|git:|https?:|file:|github:|[\w.-]+\/[\w.-]+)/,
      `${name} must come from the registry, not a URL / git ref (${spec})`,
    );
    assert.doesNotMatch(spec, /^[~>]/, `${name} should use a caret range, not "${spec[0]}" (${spec})`);
    assert.match(
      spec,
      CARET_OR_PINNED,
      `${name} version "${spec}" is neither a caret range nor an exact pin`,
    );
  }
});

test("the framework packages that can break across majors are caret-ranged (Dependabot handles patches)", () => {
  for (const name of ["next", "react", "react-dom"]) {
    assert.ok(allDeps[name], `${name} should be a direct dependency`);
    assert.match(allDeps[name], /^\^/, `${name} should allow in-range patch/minor updates`);
  }
});

test("a lockfile (v2+) is committed so CI can `npm ci`", () => {
  assert.ok(existsSync(repo("package-lock.json")), "package-lock.json must be committed");
  const lock = JSON.parse(read("package-lock.json")) as { lockfileVersion?: number };
  assert.ok((lock.lockfileVersion ?? 0) >= 2, "lockfileVersion must be >= 2 for `npm ci`");
});

test("CI workflow runs a clean install and a dependency audit", () => {
  const ci = read(".github/workflows/ci.yml");
  assert.match(ci, /npm ci/, "CI must use `npm ci`, not `npm install`");
  assert.match(ci, /npm audit --omit=dev --audit-level=high/, "CI must audit runtime deps and fail on high");
  assert.match(ci, /npm run build/, "CI must build");
  assert.match(ci, /npm test/, "CI must run the test suite");
});

test("Dependabot watches npm weekly from the repo root", () => {
  const db = read(".github/dependabot.yml");
  assert.match(db, /package-ecosystem:\s*npm/, "dependabot must watch npm");
  assert.match(db, /directory:\s*["']?\/["']?/, 'dependabot npm directory must be "/"');
  assert.match(db, /interval:\s*weekly/, "dependabot must run weekly");
});
