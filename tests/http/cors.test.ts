import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  allowedOrigins,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  evaluateCors,
  isAllowedOrigin,
  parseOriginList,
} from "../../lib/http/cors.ts";

const repo = (rel: string) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));

/** Minimal request stub matching what evaluateCors reads. */
const req = (method: string, headers: Record<string, string>) =>
  new Request("https://swiftly.io/api/accounts", { method, headers });

const dev = { NODE_ENV: "development" } as Record<string, string | undefined>;
const prod = { NODE_ENV: "production" } as Record<string, string | undefined>;

test("an allowed origin is echoed back with credentials + Vary", () => {
  const d = evaluateCors(req("POST", { origin: "http://localhost:3000" }), dev);
  assert.equal(d.allowed, true);
  assert.equal(d.headers["Access-Control-Allow-Origin"], "http://localhost:3000");
  assert.equal(d.headers["Access-Control-Allow-Credentials"], "true");
  assert.equal(d.headers["Vary"], "Origin");
});

test("a disallowed origin gets no Access-Control-Allow-Origin", () => {
  const d = evaluateCors(req("POST", { origin: "https://evil.example" }), dev);
  assert.equal(d.allowed, false);
  assert.equal(d.hasOrigin, true);
  assert.equal(d.headers["Access-Control-Allow-Origin"], undefined);
  assert.equal(d.headers["Access-Control-Allow-Credentials"], undefined);
  assert.equal(d.headers["Vary"], "Origin");
});

test("a same-origin request with no Origin header is not granted CORS headers", () => {
  const d = evaluateCors(req("GET", {}), dev);
  assert.equal(d.hasOrigin, false);
  assert.equal(d.allowed, false);
  assert.equal(d.headers["Access-Control-Allow-Origin"], undefined);
});

test("wildcard '*' is never emitted", () => {
  for (const env of [dev, prod]) {
    for (const origin of ["https://swiftly.io", "https://evil.example", "*"]) {
      const d = evaluateCors(req("POST", { origin }), env);
      assert.notEqual(d.headers["Access-Control-Allow-Origin"], "*");
    }
  }
});

test("preflight from an allowed origin carries methods, headers and max-age", () => {
  const d = evaluateCors(
    req("OPTIONS", {
      origin: "http://localhost:3000",
      "access-control-request-method": "DELETE",
      "access-control-request-headers": "authorization, content-type",
    }),
    dev,
  );
  assert.equal(d.isPreflight, true);
  assert.equal(d.headers["Access-Control-Allow-Origin"], "http://localhost:3000");
  assert.equal(d.headers["Access-Control-Allow-Methods"], CORS_ALLOWED_METHODS);
  // reflects what the browser asked for, falling back to the static list
  assert.equal(d.headers["Access-Control-Allow-Headers"], "authorization, content-type");
  assert.ok(Number(d.headers["Access-Control-Max-Age"]) > 0);
});

test("preflight without requested headers falls back to the static allow list", () => {
  const d = evaluateCors(
    req("OPTIONS", {
      origin: "http://localhost:3000",
      "access-control-request-method": "POST",
    }),
    dev,
  );
  assert.equal(d.headers["Access-Control-Allow-Headers"], CORS_ALLOWED_HEADERS);
});

test("OPTIONS without Access-Control-Request-Method is not a preflight", () => {
  const d = evaluateCors(req("OPTIONS", { origin: "http://localhost:3000" }), dev);
  assert.equal(d.isPreflight, false);
});

test("preflight from a disallowed origin still has no Access-Control-Allow-Origin", () => {
  const d = evaluateCors(
    req("OPTIONS", {
      origin: "https://evil.example",
      "access-control-request-method": "POST",
    }),
    dev,
  );
  assert.equal(d.isPreflight, true);
  assert.equal(d.headers["Access-Control-Allow-Origin"], undefined);
});

test("localhost is only allowed in development, real domains only in production", () => {
  assert.equal(isAllowedOrigin("http://localhost:3000", dev), true);
  assert.equal(isAllowedOrigin("http://localhost:3000", prod), false);
  assert.equal(isAllowedOrigin("https://swiftly.io", prod), true);
  assert.equal(isAllowedOrigin("https://app.swiftly.io", prod), true);
  // an unknown NODE_ENV is treated as production (strictest)
  assert.equal(isAllowedOrigin("http://localhost:3000", { NODE_ENV: "staging" }), false);
});

test("CORS_ALLOWED_ORIGINS replaces the built-in list (preview/staging)", () => {
  const env = {
    NODE_ENV: "production",
    CORS_ALLOWED_ORIGINS: "https://staging.swiftly.io, https://pr-42.vercel.app",
  } as Record<string, string | undefined>;
  assert.deepEqual(allowedOrigins(env), [
    "https://staging.swiftly.io",
    "https://pr-42.vercel.app",
  ]);
  assert.equal(isAllowedOrigin("https://staging.swiftly.io", env), true);
  assert.equal(isAllowedOrigin("https://swiftly.io", env), false); // built-in no longer applies
});

test("parseOriginList splits on comma/space and strips trailing slashes", () => {
  assert.deepEqual(parseOriginList("https://a.com/,  https://b.com https://c.com/"), [
    "https://a.com",
    "https://b.com",
    "https://c.com",
  ]);
  assert.deepEqual(parseOriginList(""), []);
  assert.deepEqual(parseOriginList(undefined), []);
});

test("an Origin with a trailing slash still matches", () => {
  assert.equal(isAllowedOrigin("https://swiftly.io/", prod), true);
});

test("the CORS method list is complete and includes OPTIONS", () => {
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    assert.ok(CORS_ALLOWED_METHODS.includes(m), `missing ${m}`);
  }
});

test("proxy.ts wires CORS on /api and lib/http/cors.ts stays dependency-free", () => {
  const proxySrc = readFileSync(repo("proxy.ts"), "utf8");
  assert.match(proxySrc, /matcher:\s*["']\/api\/:path\*["']/);
  assert.match(proxySrc, /evaluateCors/);

  const corsSrc = readFileSync(repo("lib/http/cors.ts"), "utf8");
  assert.doesNotMatch(corsSrc, /from\s+["']@\//, "cors.ts must not import from @/");
  assert.doesNotMatch(corsSrc, /from\s+["']next/, "cors.ts must not import from next/*");
  assert.doesNotMatch(corsSrc, /import\s+["']server-only["']/);
});
