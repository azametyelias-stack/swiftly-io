import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildSecurityHeaders,
  buildContentSecurityPolicy,
} from "../../lib/security/headers.ts";

const get = (headers: { key: string; value: string }[], key: string) =>
  headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

test("HSTS is set for 2 years, includeSubDomains, preload", () => {
  const v = get(buildSecurityHeaders(), "Strict-Transport-Security");
  assert.ok(v, "Strict-Transport-Security missing");
  assert.match(v!, /max-age=63072000/);
  assert.match(v!, /includeSubDomains/);
  assert.match(v!, /preload/);
});

test("clickjacking + MIME-sniffing + referrer headers are present", () => {
  const h = buildSecurityHeaders();
  assert.equal(get(h, "X-Frame-Options"), "DENY");
  assert.equal(get(h, "X-Content-Type-Options"), "nosniff");
  assert.equal(get(h, "Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.match(get(h, "Permissions-Policy")!, /geolocation=\(\)/);
});

test("every header has a non-empty value", () => {
  for (const { key, value } of buildSecurityHeaders()) {
    assert.ok(value && value.length > 0, `empty value for ${key}`);
  }
});

test("CSP: no 'unsafe-eval' in production, present in dev", () => {
  assert.ok(!buildContentSecurityPolicy({ isDev: false }).includes("'unsafe-eval'"));
  assert.ok(buildContentSecurityPolicy({ isDev: true }).includes("'unsafe-eval'"));
});

test("CSP: locks framing, objects and base-uri; upgrades insecure requests", () => {
  const csp = buildContentSecurityPolicy();
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /upgrade-insecure-requests/);
});

test("CSP: the Supabase origin is added to connect-src (http + wss)", () => {
  const csp = buildContentSecurityPolicy({ supabaseUrl: "https://abc123.supabase.co" });
  const connect = csp.split(";").find((d) => d.trim().startsWith("connect-src"))!;
  assert.match(connect, /https:\/\/abc123\.supabase\.co/);
  assert.match(connect, /wss:\/\/abc123\.supabase\.co/);
});

test("CSP: a malformed Supabase URL is ignored, not crashed on", () => {
  assert.doesNotThrow(() => buildContentSecurityPolicy({ supabaseUrl: "not a url" }));
  const csp = buildContentSecurityPolicy({ supabaseUrl: "not a url" });
  assert.match(csp, /connect-src 'self'/);
});

test("CSP: Google Analytics origins are allowed for script/img/connect", () => {
  const csp = buildContentSecurityPolicy();
  assert.match(csp, /script-src[^;]*googletagmanager\.com/);
  assert.match(csp, /img-src[^;]*google-analytics\.com/);
  assert.match(csp, /connect-src[^;]*google-analytics\.com/);
});
