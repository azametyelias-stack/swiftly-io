import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ApiError,
  ForbiddenError,
  UnauthorizedError,
  TokenExpiredError,
  NotFoundError,
  toErrorResponse,
} from "../../lib/http/errors.ts";

test("known ApiError keeps its status, code and message", async () => {
  const res = toErrorResponse(new ForbiddenError());
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.deepEqual(body, { success: false, error: "Accès refusé.", code: "FORBIDDEN" });
});

test("UnauthorizedError maps to 401", () => {
  assert.equal(toErrorResponse(new UnauthorizedError()).status, 401);
});

test("NotFoundError maps to 404", () => {
  assert.equal(toErrorResponse(new NotFoundError()).status, 404);
});

test("TokenExpiredError is a distinct 401 with code TOKEN_EXPIRED", async () => {
  const res = toErrorResponse(new TokenExpiredError());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "TOKEN_EXPIRED");
});

test("ApiError details are passed through", async () => {
  const res = toErrorResponse(new ApiError(400, "X", "msg", { field: "amount" }));
  const body = await res.json();
  assert.deepEqual(body.details, { field: "amount" });
});

test("an unknown error collapses to a generic 500 in production (no leak)", async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const res = toErrorResponse(new Error("ECONNREFUSED postgres://user:pw@db.internal:5432"));
    assert.equal(res.status, 500);
    const body = await res.json();
    assert.deepEqual(body, {
      success: false,
      error: "Une erreur est survenue.",
      code: "SERVER_ERROR",
    });
    const raw = JSON.stringify(body);
    for (const leak of ["ECONNREFUSED", "postgres", "db.internal", "5432", "pw"]) {
      assert.ok(!raw.includes(leak), `response leaked "${leak}"`);
    }
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test("in development the generic 500 carries details for debugging", async () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const body = await toErrorResponse(new TypeError("boom at line 42")).json();
    assert.equal(body.error, "Une erreur est survenue.");
    assert.equal(body.code, "SERVER_ERROR");
    assert.deepEqual(body.details, { name: "TypeError", message: "boom at line 42" });
  } finally {
    process.env.NODE_ENV = prev;
  }
});

test("a non-error value also collapses to 500", () => {
  assert.equal(toErrorResponse("boom").status, 500);
});

test("UnauthorizedError message does not distinguish the failure cause (Point 14/16)", () => {
  const msg = new UnauthorizedError().message.toLowerCase();
  for (const tell of ["not found", "unknown", "password", "user", "email", "signature", "revoked"]) {
    assert.ok(!msg.includes(tell), `auth error message reveals "${tell}"`);
  }
  // identical every time — no per-cause variants
  assert.equal(new UnauthorizedError().message, new UnauthorizedError().message);
});
