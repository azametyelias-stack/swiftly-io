import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INVITE_EMAIL_DOMAIN,
  syntheticInviteEmail,
} from "../../lib/auth/invite-codes.ts";

test("syntheticInviteEmail: deterministic, uses the invite domain", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const email = syntheticInviteEmail(id);
  assert.equal(email, `invite-${id}@${INVITE_EMAIL_DOMAIN}`);
  assert.equal(syntheticInviteEmail(id), email); // stable across calls
});

test("syntheticInviteEmail: different invitations get different e-mails", () => {
  assert.notEqual(syntheticInviteEmail("a"), syntheticInviteEmail("b"));
});

test("INVITE_EMAIL_DOMAIN is a real-looking, never-MX'd subdomain", () => {
  assert.match(INVITE_EMAIL_DOMAIN, /^[a-z0-9.-]+\.[a-z]{2,}$/);
});
