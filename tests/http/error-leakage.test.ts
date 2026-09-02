import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guardrail for SECURITY MASTERPLAN — Point 14 (Generic Error Messages).
 *
 * The framework already collapses every non-`ApiError` to an opaque 500 via
 * `toErrorResponse()`. These tests make sure no route handler bypasses it by
 * putting a raw error / stack / DB detail into a response body.
 */

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

const walk = (dir: string, hit: (rel: string, src: string) => void) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(full, hit);
    else if (/\.(ts|tsx)$/.test(e.name)) hit(full.replace(repo(""), ""), readFileSync(full, "utf8"));
  }
};

test("no route passes a raw error message / stack into a response helper", () => {
  const offenders: string[] = [];
  const responseCall = /\b(Response\.json|NextResponse\.json|fail|ok)\s*\(/;
  const errAccess = /\b(err|error|e)\.(message|stack|cause|code|name)\b/;
  const stackAnywhere = /\.stack\b/;

  for (const root of ["app", "lib"]) {
    walk(repo(root), (rel, src) => {
      const norm = rel.replace(/\\/g, "/");
      if (norm.endsWith("lib/http/errors.ts")) return; // the sanctioned collapse point
      src.split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "");
        if (code.trimStart().startsWith("*")) return; // jsdoc line
        if (responseCall.test(code) && errAccess.test(code)) {
          offenders.push(`${norm}:${i + 1}  ${line.trim()}`);
        }
        if (stackAnywhere.test(code) && /(Response|NextResponse|fail\(|ok\(|body)/.test(code)) {
          offenders.push(`${norm}:${i + 1}  (stack near a response)  ${line.trim()}`);
        }
      });
    });
  }
  assert.deepEqual(offenders, [], `raw error surfaced to the client:\n${offenders.join("\n")}`);
});

test("the collapse point exists and is generic", () => {
  const src = read("lib/http/errors.ts");
  assert.match(src, /code:\s*"SERVER_ERROR"/);
  assert.match(src, /Une erreur est survenue\./);
  // dev-only details are gated on NODE_ENV
  assert.match(src, /process\.env\.NODE_ENV === "development"/);
});

test("withAuth logs the real error server-side before returning the generic one", () => {
  const src = read("lib/auth/with-auth.ts");
  assert.match(src, /log\.error\(/);
  assert.match(src, /toErrorResponse/);
  // it must not return err.message to the client itself
  assert.doesNotMatch(src, /Response\.json\([^)]*err\.message/);
});

test("privacy endpoint returns a generic SERVER_ERROR, not the DB error", () => {
  const src = read("lib/privacy/endpoint.ts");
  // the catch block logs err but responds with a fixed string + code
  assert.match(src, /log\.error\([^)]*err\s*\}\)/);
  assert.match(src, /fail\(\s*"SERVER_ERROR"/);
  assert.doesNotMatch(src, /fail\([^)]*err\.message/);
});
