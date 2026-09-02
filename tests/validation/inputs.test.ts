import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guardrail for SECURITY MASTERPLAN — Point 10 (Validate All Inputs).
 *
 * Point 10's real implementation is PROMPT #INPUT (Day 10). Until then these tests
 * lock in the two invariants that must never regress:
 *   1. Zod is the ONLY validation library.
 *   2. No route handler consumes a request body without a Zod parse.
 *   3. No source file builds SQL by string concatenation / interpolation.
 */

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

const walk = (dir: string, hit: (path: string, src: string) => void) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(full, hit);
    else if (/\.(ts|tsx)$/.test(e.name)) hit(full.replace(repo(""), ""), readFileSync(full, "utf8"));
  }
};

test("Zod is the only validation library (package.json deps)", () => {
  const pkg = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  const banned = ["express-validator", "joi", "yup", "class-validator", "superstruct", "validator"];
  const found = banned.filter((name) => name in all);
  assert.deepEqual(found, [], `banned validation libs in package.json: ${found.join(", ")}`);
  assert.ok("zod" in (pkg.dependencies ?? {}), "zod must be a direct dependency");
});

test("no source file imports a banned validation library", () => {
  const offenders: string[] = [];
  const bad = /from\s+["'](express-validator|joi|yup|class-validator|superstruct)["']/;
  for (const root of ["app", "lib", "components"]) walk(repo(root), (p, src) => {
    if (bad.test(src)) offenders.push(p);
  });
  assert.deepEqual(offenders, [], `files importing a banned validator: ${offenders.join(", ")}`);
});

test("every route/endpoint that reads a body validates it with Zod", () => {
  const offenders: string[] = [];
  const check = (p: string, src: string) => {
    const readsBody = /\.(json|formData|text)\s*\(\s*\)/.test(src) && /request|req/.test(src);
    if (!readsBody) return;
    const validates = /safeParse|\.parse\(|from\s+["'][^"']*schemas?["']/.test(src);
    if (!validates) offenders.push(p);
  };
  walk(repo("app/api"), check);
  walk(repo("lib"), (p, src) => {
    if (/endpoint|route|handler/i.test(p)) check(p, src);
  });
  assert.deepEqual(offenders, [], `route reads a body without Zod validation: ${offenders.join(", ")}`);
});

test("no SQL is assembled by string concatenation or interpolation", () => {
  const offenders: string[] = [];
  // e.g.  "SELECT ... " + x   |   `... WHERE id = ${x}`
  const concat = /["'`]\s*(select|insert into|update|delete from|where)\b[^"'`]*["'`]\s*\+/i;
  const interp = /`[^`]*\b(select|insert into|update|delete from|where)\b[^`]*\$\{/i;
  for (const root of ["app", "lib"]) walk(repo(root), (p, src) => {
    if (concat.test(src) || interp.test(src)) offenders.push(p);
  });
  assert.deepEqual(offenders, [], `hand-built SQL in: ${offenders.join(", ")}`);
});

test("privacy schemas still parse a valid payload and reject junk (smoke)", async () => {
  const { consentRequestSchema } = await import("../../lib/privacy/schemas.ts");
  assert.equal(
    consentRequestSchema.safeParse({
      categories: { essential: true, analytics: true, marketing: false },
      action: "accept_all",
    }).success,
    true,
  );
  assert.equal(consentRequestSchema.safeParse({ action: "accept_all" }).success, false);
});
