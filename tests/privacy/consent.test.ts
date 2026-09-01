import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONSENT_VERSION,
  buildConsentRow,
  hasCurrentDecision,
  parseStoredConsent,
  withEssential,
} from "../../lib/privacy/consent.ts";

test("withEssential forces essential:true and location:false", () => {
  const out = withEssential({
    essential: false,
    analytics: true,
    marketing: true,
    location: true,
  });
  assert.deepEqual(out, {
    essential: true,
    analytics: true,
    marketing: true,
    location: false,
  });
});

test("withEssential coerces missing categories to false", () => {
  assert.deepEqual(withEssential({}), {
    essential: true,
    analytics: false,
    marketing: false,
    location: false,
  });
});

test("hasCurrentDecision is true only for the current version", () => {
  const base = {
    categories: withEssential({ analytics: true }),
    action: "accept_all" as const,
    updatedAt: new Date().toISOString(),
  };
  assert.equal(hasCurrentDecision({ ...base, version: CONSENT_VERSION }), true);
  assert.equal(hasCurrentDecision({ ...base, version: "0.9" }), false);
  assert.equal(hasCurrentDecision(null), false);
});

test("parseStoredConsent handles junk and stale data", () => {
  assert.equal(parseStoredConsent(null), null);
  assert.equal(parseStoredConsent("not json"), null);
  assert.equal(parseStoredConsent("{}"), null);
  const parsed = parseStoredConsent(
    JSON.stringify({ categories: { analytics: true }, version: "1.0" }),
  );
  assert.equal(parsed?.categories.analytics, true);
  assert.equal(parsed?.categories.essential, true);
});

test("buildConsentRow maps request + meta to the DB row shape", () => {
  const row = buildConsentRow(
    {
      categories: withEssential({ analytics: true, marketing: false }),
      action: "update",
    },
    {
      subjectId: "sub-123",
      userId: null,
      ip: "41.207.0.1",
      userAgent: "jest",
    },
  );
  assert.deepEqual(row, {
    user_id: null,
    subject_id: "sub-123",
    consent_version: CONSENT_VERSION,
    essential: true,
    analytics: true,
    marketing: false,
    location: false,
    action: "update",
    ip_address: "41.207.0.1",
    user_agent: "jest",
  });
});
