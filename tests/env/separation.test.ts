import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guardrail for SECURITY MASTERPLAN — Point 7 (Public vs Secret Keys).
 *
 * The rule: anything the browser can see is prefixed `NEXT_PUBLIC_` and lives in
 * `lib/env/public.ts`; every secret has NO `NEXT_PUBLIC_` prefix and is read only
 * through `lib/env/server.ts`. These tests fail the build the moment that line
 * is crossed — a secret gains a `NEXT_PUBLIC_` name, a client file imports a
 * server-only module, or `public.ts` starts reading a non-public variable.
 */

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const read = (rel: string) => readFileSync(repo(rel), "utf8");

/** Names that must never carry a NEXT_PUBLIC_ prefix, whatever the context. */
const SECRET_MARKERS = /(SERVICE_ROLE|SECRET|AUTH_TOKEN|_API_KEY|PRIVATE|WEBHOOK)/;

test("lib/env/public.ts only reads NEXT_PUBLIC_* variables (plus NODE_ENV)", () => {
  const src = read("lib/env/public.ts");
  const refs = [...src.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]!);
  assert.ok(refs.length > 0, "expected at least one process.env reference");
  const bad = refs.filter((name) => name !== "NODE_ENV" && !name.startsWith("NEXT_PUBLIC_"));
  assert.deepEqual(bad, [], `non-public vars read in public.ts: ${bad.join(", ")}`);
});

test("lib/env/public.ts never uses a dynamic process.env[...] lookup", () => {
  // Next.js only inlines *static* NEXT_PUBLIC_ references; a computed key would
  // silently ship `undefined` to the browser.
  const src = read("lib/env/public.ts").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/process\.env\[/.test(src), "dynamic process.env[...] access in public.ts");
});

test("lib/env/server.ts declares no NEXT_PUBLIC_ key", () => {
  const src = read("lib/env/server.ts");
  assert.ok(!src.includes("NEXT_PUBLIC_"), "server.ts references a NEXT_PUBLIC_ name");
});

test(".env.example: no secret-looking key is exposed as NEXT_PUBLIC_", () => {
  const lines = read(".env.example").split(/\r?\n/);
  const keys = lines
    .map((l) => l.replace(/^#\s*/, "").trim())
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => l.slice(0, l.indexOf("=")));
  assert.ok(keys.length > 0, "no KEY= lines parsed from .env.example");

  const leaked = keys.filter((k) => k.startsWith("NEXT_PUBLIC_") && SECRET_MARKERS.test(k));
  assert.deepEqual(leaked, [], `secret-looking keys exposed to the client: ${leaked.join(", ")}`);
});

test(".env.example: the Supabase service-role key is server-only", () => {
  const keys = read(".env.example");
  assert.ok(keys.includes("SUPABASE_SERVICE_ROLE_KEY"), "service-role key missing from template");
  assert.ok(
    !keys.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"),
    "service-role key must never be NEXT_PUBLIC_",
  );
});

test("no client component imports a server-only env/secret module", () => {
  const roots = ["components", "app", "lib"].map(repo).filter(existsSync);
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
      const src = readFileSync(full, "utf8");
      const isClient = /^\s*(['"])use client\1/m.test(src);
      if (!isClient) continue;
      if (/from\s+["']@\/lib\/(env\/server|supabase\/server)["']/.test(src)) {
        offenders.push(full.replace(repo(""), ""));
      }
    }
  };
  roots.forEach(walk);

  assert.deepEqual(
    offenders,
    [],
    `client files importing a server-only module: ${offenders.join(", ")}`,
  );
});

test("no source file hardcodes a Supabase JWT-style key", () => {
  // A leaked service_role / anon key would appear as an "eyJ..."-prefixed JWT.
  const roots = ["components", "app", "lib"].map(repo).filter(existsSync);
  const offenders: string[] = [];
  const jwt = /["']eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+["']/;

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) continue;
      if (jwt.test(readFileSync(full, "utf8"))) offenders.push(full.replace(repo(""), ""));
    }
  };
  roots.forEach(walk);

  assert.deepEqual(offenders, [], `hardcoded key material in: ${offenders.join(", ")}`);
});
