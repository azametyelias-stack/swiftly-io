import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SESSION_POLICY,
  decodeJwtPayload,
  jwtExpiry,
  isExpired,
  shouldRefresh,
  classifyAuthFailure,
} from "../../lib/auth/session.ts";

const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

/** Minimal fake JWT: `header.payload.sig` (signature is never checked here). */
const fakeJwt = (payload: Record<string, unknown>) => `${b64url({ alg: "HS256" })}.${b64url(payload)}.sig`;

const NOW = 1_000_000_000;

test("policy: access token is 15 min, refresh token is 30 days", () => {
  assert.equal(SESSION_POLICY.accessTokenTtlSeconds, 900);
  assert.equal(SESSION_POLICY.refreshTokenTtlSeconds, 2_592_000);
});

test("decodeJwtPayload returns the claims / null on garbage", () => {
  assert.deepEqual(decodeJwtPayload(fakeJwt({ sub: "u1", exp: NOW })), { sub: "u1", exp: NOW });
  assert.equal(decodeJwtPayload("not-a-jwt"), null);
  assert.equal(decodeJwtPayload("a.b"), null);
});

test("jwtExpiry reads the exp claim, null when missing", () => {
  assert.equal(jwtExpiry(fakeJwt({ exp: NOW })), NOW);
  assert.equal(jwtExpiry(fakeJwt({ sub: "u1" })), null);
});

test("isExpired: past exp is expired, future is not, no exp is expired", () => {
  assert.equal(isExpired(fakeJwt({ exp: NOW - 1 }), NOW), true);
  assert.equal(isExpired(fakeJwt({ exp: NOW + 1000 }), NOW), false);
  assert.equal(isExpired(fakeJwt({ sub: "u1" }), NOW), true);
});

test("shouldRefresh fires inside the proactive skew window", () => {
  const skew = SESSION_POLICY.proactiveRefreshSkewSeconds;
  assert.equal(shouldRefresh(fakeJwt({ exp: NOW + skew + 5 }), NOW), false);
  assert.equal(shouldRefresh(fakeJwt({ exp: NOW + skew - 5 }), NOW), true);
  assert.equal(shouldRefresh(fakeJwt({ exp: NOW - 1 }), NOW), true);
});

test("classifyAuthFailure maps status/code to an action", () => {
  assert.equal(classifyAuthFailure({ status: 401, code: "TOKEN_EXPIRED" }), "refresh");
  assert.equal(classifyAuthFailure({ status: 401, code: "UNAUTHORIZED" }), "reauth");
  assert.equal(classifyAuthFailure({ status: 401 }), "reauth");
  assert.equal(classifyAuthFailure({ status: 403, code: "FORBIDDEN" }), "none");
  assert.equal(classifyAuthFailure({ status: 200 }), "none");
});
