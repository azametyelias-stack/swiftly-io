import { test } from "node:test";
import assert from "node:assert/strict";

import { createApiClient, type FetchLike } from "../../lib/http/client.ts";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const expired = () => json(401, { success: false, error: "Session expirée.", code: "TOKEN_EXPIRED" });
const ok = () => json(200, { success: true, data: {} });

/** A fake fetch that returns the queued responses in order and records calls. */
function stubFetch(responses: Response[]) {
  const calls: { input: string; init?: RequestInit }[] = [];
  const fn: FetchLike = async (input, init) => {
    calls.push({ input, init });
    return responses[calls.length - 1] ?? ok();
  };
  return { fn, calls };
}

test("refreshes once and retries after a TOKEN_EXPIRED response", async () => {
  const { fn, calls } = stubFetch([expired(), ok()]);
  let refreshes = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => (refreshes++, true),
  });

  const res = await client.fetch("/api/accounts");
  assert.equal(res.status, 200);
  assert.equal(refreshes, 1);
  assert.equal(calls.length, 2);
});

test("does not retry, and reports session lost, on a non-expiry 401", async () => {
  const { fn, calls } = stubFetch([json(401, { code: "UNAUTHORIZED" })]);
  let lost = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => true,
    onSessionExpired: () => lost++,
  });

  const res = await client.fetch("/api/accounts");
  assert.equal(res.status, 401);
  assert.equal(calls.length, 1);
  assert.equal(lost, 1);
});

test("gives up (no infinite loop) when refresh fails", async () => {
  const { fn, calls } = stubFetch([expired(), expired()]);
  let lost = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => false,
    onSessionExpired: () => lost++,
  });

  const res = await client.fetch("/api/accounts");
  assert.equal(res.status, 401);
  assert.equal(calls.length, 1); // never retried
  assert.equal(lost, 1);
});

test("retries at most once even if the replay also 401s TOKEN_EXPIRED", async () => {
  const { fn, calls } = stubFetch([expired(), expired()]);
  let lost = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => true,
    onSessionExpired: () => lost++,
  });

  const res = await client.fetch("/api/accounts");
  assert.equal(res.status, 401);
  assert.equal(calls.length, 2); // one retry, then stop
  assert.equal(lost, 1);
});

test("passes a 200 straight through without touching refresh", async () => {
  const { fn, calls } = stubFetch([ok()]);
  let refreshes = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => (refreshes++, true),
  });

  const res = await client.fetch("/api/accounts");
  assert.equal(res.status, 200);
  assert.equal(refreshes, 0);
  assert.equal(calls.length, 1);
});

test("concurrent expired requests share a single refresh", async () => {
  let refreshes = 0;
  let call = 0;
  const fn: FetchLike = async () => {
    call++;
    // first call of each of the 3 requests → expired; retries → ok
    return call <= 3 ? expired() : ok();
  };
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => {
      refreshes++;
      await new Promise((r) => setTimeout(r, 10));
      return true;
    },
  });

  const results = await Promise.all([
    client.fetch("/a"),
    client.fetch("/b"),
    client.fetch("/c"),
  ]);
  assert.deepEqual(results.map((r) => r.status), [200, 200, 200]);
  assert.equal(refreshes, 1);
});

test("re-reads auth headers on the retry (fresh token)", async () => {
  const { fn, calls } = stubFetch([expired(), ok()]);
  const tokens = ["old", "new"];
  let i = 0;
  const client = createApiClient({
    fetch: fn,
    refreshSession: async () => true,
    authHeader: () => ({ Authorization: `Bearer ${tokens[Math.min(i++, 1)]}` }),
  });

  await client.fetch("/api/accounts");
  const h0 = new Headers(calls[0]!.init!.headers as Record<string, string>);
  const h1 = new Headers(calls[1]!.init!.headers as Record<string, string>);
  assert.equal(h0.get("authorization"), "Bearer old");
  assert.equal(h1.get("authorization"), "Bearer new");
});
