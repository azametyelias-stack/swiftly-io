import { test } from "node:test";
import assert from "node:assert/strict";

import { serverEnv, requireServerEnv } from "../../lib/env/server.ts";

test("serverEnv returns undefined when the variable is unset", () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(serverEnv("SUPABASE_SERVICE_ROLE_KEY"), undefined);
});

test("serverEnv treats an empty string as not configured", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  assert.equal(serverEnv("SUPABASE_SERVICE_ROLE_KEY"), undefined);
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test("serverEnv returns the value when set", () => {
  process.env.SUPABASE_SERVICE_ROLE_KEY = "secret-value";
  assert.equal(serverEnv("SUPABASE_SERVICE_ROLE_KEY"), "secret-value");
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

test("requireServerEnv throws with the var name when missing", () => {
  delete process.env.PAYSTACK_WEBHOOK_SECRET;
  assert.throws(() => requireServerEnv("PAYSTACK_WEBHOOK_SECRET"), /PAYSTACK_WEBHOOK_SECRET/);
});

test("requireServerEnv returns the value when present", () => {
  process.env.PAYSTACK_WEBHOOK_SECRET = "whsec_test";
  assert.equal(requireServerEnv("PAYSTACK_WEBHOOK_SECRET"), "whsec_test");
  delete process.env.PAYSTACK_WEBHOOK_SECRET;
});
