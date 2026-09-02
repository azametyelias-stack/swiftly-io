import { test } from "node:test";
import assert from "node:assert/strict";

import { AUTH_MESSAGES, AUTH_INVALID_CODE } from "../../lib/auth/responses.ts";
import { InvalidCredentialsError, toErrorResponse } from "../../lib/http/errors.ts";

test("every canonical auth message is a non-empty French sentence with no placeholder", () => {
  for (const [key, msg] of Object.entries(AUTH_MESSAGES)) {
    assert.ok(msg.length > 10, `${key} too short`);
    assert.doesNotMatch(msg, /\$\{|\{\{|%s|<[a-z]/i, `${key} looks like a template`);
    assert.match(msg, /[éèêàçùï'’]| un | une | vous /i, `${key} does not read as French`);
  }
});

test("the 'exists or not' messages are phrased conditionally", () => {
  assert.match(AUTH_MESSAGES.signupAccepted, /^Si /);
  assert.match(AUTH_MESSAGES.passwordResetRequested, /^Si /);
});

test("the sign-in message reveals neither which field was wrong nor that an account exists", () => {
  const m = AUTH_MESSAGES.invalidCredentials.toLowerCase();
  for (const tell of [
    "introuvable",
    "n'existe pas",
    "existe pas",
    "inconnu",
    "mot de passe incorrect",
    "utilisateur",
    "compte",
    "e-mail incorrect",
  ]) {
    assert.ok(!m.includes(tell), `invalidCredentials leaks "${tell}"`);
  }
});

test("InvalidCredentialsError carries the single message + code", () => {
  const err = new InvalidCredentialsError();
  assert.equal(err.status, 401);
  assert.equal(err.code, AUTH_INVALID_CODE);
  assert.equal(err.message, AUTH_MESSAGES.invalidCredentials);
});

test("InvalidCredentialsError maps to a 401 envelope", async () => {
  const res = toErrorResponse(new InvalidCredentialsError());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.code, "AUTH_INVALID");
  assert.equal(body.error, AUTH_MESSAGES.invalidCredentials);
});
