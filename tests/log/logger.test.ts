import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatRecord,
  log,
  maskEmail,
  maskPhone,
  redact,
  scrubString,
} from "../../lib/log/logger.ts";

// ---------------------------------------------------------------------------
// maskEmail / maskPhone
// ---------------------------------------------------------------------------

test("maskEmail keeps 2 chars + domain, hides the rest", () => {
  assert.equal(maskEmail("elias@swiftly.io"), "el***@swiftly.io");
  assert.equal(maskEmail("me@x.co"), "***@x.co"); // local part <= 2
  assert.equal(maskEmail("notanemail"), "no***");
});

test("maskPhone keeps first 2 + last 4", () => {
  assert.equal(maskPhone("+22890123456"), "+2***3456");
  assert.equal(maskPhone("0033 6 12 34 56 78"), "00***5678");
  assert.equal(maskPhone("1234"), "[REDACTED]");
});

// ---------------------------------------------------------------------------
// redact
// ---------------------------------------------------------------------------

test("redact drops deny-listed keys at any depth", () => {
  const out = redact({
    userId: "u_1",
    password: "hunter2",
    session: { access_token: "abc", refresh_token: "def", nested: { api_key: "k" } },
    items: [{ token: "t1" }, { ok: true }],
  }) as Record<string, unknown>;

  assert.equal(out.userId, "u_1");
  assert.equal(out.password, "[REDACTED]");
  const session = out.session as Record<string, Record<string, unknown>>;
  assert.equal(session.access_token, "[REDACTED]");
  assert.equal(session.refresh_token, "[REDACTED]");
  assert.equal(session.nested.api_key, "[REDACTED]");
  assert.deepEqual(out.items, [{ token: "[REDACTED]" }, { ok: true }]);
});

test("redact masks email + phone fields by key name", () => {
  const out = redact({
    email: "elias@swiftly.io",
    user_email: "someone@example.com",
    phone: "+22890123456",
    label: "elias@swiftly.io is the owner", // not a recognised key → scrubbed only for secrets, not emails
  }) as Record<string, string>;

  assert.equal(out.email, "el***@swiftly.io");
  assert.equal(out.user_email, "so***@example.com");
  assert.equal(out.phone, "+2***3456");
});

test("redact converts Error to name/message/stack with secrets scrubbed", () => {
  const err = new Error("failed for bearer eyJhbGciOi.JzdWIiOiIx.SIG token");
  const out = redact({ err }) as { err: { name: string; message: string; stack?: string } };
  assert.equal(out.err.name, "Error");
  assert.ok(!out.err.message.includes("eyJhbGciOi"));
  assert.ok(out.err.message.includes("[REDACTED]"));
});

test("redact is cycle-safe and does not mutate the input", () => {
  const input: Record<string, unknown> = { a: 1 };
  input.self = input;
  const out = redact(input) as Record<string, unknown>;
  assert.equal(out.a, 1);
  assert.equal(out.self, "[Circular]");
  assert.equal(input.self, input); // original untouched
});

test("scrubString removes JWTs and provider keys from free text", () => {
  assert.equal(
    scrubString("token is eyJa.eyJb.cccc done"),
    "token is [REDACTED] done",
  );
  assert.equal(scrubString("key sk_live_ABCDEFGH12345678 x"), "key [REDACTED] x");
});

// ---------------------------------------------------------------------------
// formatRecord / log
// ---------------------------------------------------------------------------

test("formatRecord emits one JSON line with ts + level + event + redacted meta", () => {
  const line = formatRecord("info", "auth.login_ok", {
    userId: "u_1",
    email: "elias@swiftly.io",
    password: "should-not-appear",
    accessToken: "eyJa.eyJb.cc",
  });
  const parsed = JSON.parse(line) as Record<string, unknown>;
  assert.equal(parsed.level, "info");
  assert.equal(parsed.event, "auth.login_ok");
  assert.match(String(parsed.ts), /^\d{4}-\d{2}-\d{2}T/);
  const meta = parsed.meta as Record<string, unknown>;
  assert.equal(meta.userId, "u_1");
  assert.equal(meta.email, "el***@swiftly.io");
  assert.equal(meta.password, "[REDACTED]");
  assert.equal(meta.accessToken, "[REDACTED]");

  // absolute guarantee: no secret substring anywhere in the serialised line
  for (const secret of ["should-not-appear", "eyJa.eyJb.cc", "hunter2"]) {
    assert.ok(!line.includes(secret), `log line leaked "${secret}"`);
  }
});

test("log.* honours LOG_LEVEL and writes to the right console sink", () => {
  const prev = process.env.LOG_LEVEL;
  const calls: Array<[string, string]> = [];
  const orig = { log: console.log, warn: console.warn, error: console.error, debug: console.debug };
  console.log = (l: string) => calls.push(["log", l]);
  console.warn = (l: string) => calls.push(["warn", l]);
  console.error = (l: string) => calls.push(["error", l]);
  console.debug = (l: string) => calls.push(["debug", l]);
  try {
    process.env.LOG_LEVEL = "warn";
    log.info("skipped.event", { a: 1 });
    log.warn("kept.warn", { a: 1 });
    log.error("kept.error", { a: 1 });
    assert.deepEqual(calls.map((c) => c[0]), ["warn", "error"]);
    assert.match(calls[0]![1], /"event":"kept\.warn"/);
  } finally {
    Object.assign(console, orig);
    process.env.LOG_LEVEL = prev;
  }
});

test("a realistic auth payload never leaks a credential through the logger", () => {
  const captured: string[] = [];
  const origError = console.error;
  console.error = (l: string) => captured.push(l);
  try {
    log.error("auth.login_failed", {
      email: "victim@example.com",
      phone: "+22899887766",
      password: "P@ssw0rd!",
      password_hash: "$2b$10$abcdefghijklmnopqrstuv",
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef",
      refresh_token: "v1.MRefreshTokenValue1234567890",
      authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.zzz",
      paystackSecretKey: "sk_live_0123456789ABCDEF",
      reason: "wrong_password",
      ip: "41.207.0.1",
    });
  } finally {
    console.error = origError;
  }
  const line = captured.join("\n");
  for (const secret of [
    "P@ssw0rd!",
    "$2b$10$abcdefghijklmnopqrstuv",
    "eyJhbGciOiJIUzI1NiJ9",
    "MRefreshTokenValue",
    "sk_live_0123456789ABCDEF",
    "victim@example.com",
    "99887766", // full phone tail beyond last 4
  ]) {
    assert.ok(!line.includes(secret), `logger leaked "${secret}"`);
  }
  // the useful, safe context survives
  assert.match(line, /"reason":"wrong_password"/);
  assert.match(line, /"ip":"41\.207\.0\.1"/);
  assert.match(line, /vi\*\*\*@example\.com/);
});
