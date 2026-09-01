import { test } from "node:test";
import assert from "node:assert/strict";

import {
  consentRequestSchema,
  updateConsentRequestSchema,
} from "../../lib/privacy/schemas.ts";

const validCategories = {
  essential: true,
  analytics: true,
  marketing: false,
  location: false,
};

test("accepts a valid accept_all payload", () => {
  const result = consentRequestSchema.safeParse({
    categories: validCategories,
    action: "accept_all",
  });
  assert.equal(result.success, true);
});

test("rejects essential:false", () => {
  const result = consentRequestSchema.safeParse({
    categories: { ...validCategories, essential: false },
    action: "reject",
  });
  assert.equal(result.success, false);
});

test("location defaults to false when omitted", () => {
  const result = consentRequestSchema.safeParse({
    categories: { essential: true, analytics: false, marketing: false },
    action: "customize",
  });
  assert.equal(result.success, true);
  assert.equal(result.data?.categories.location, false);
});

test("rejects an unknown action", () => {
  const result = consentRequestSchema.safeParse({
    categories: validCategories,
    action: "accept_some",
  });
  assert.equal(result.success, false);
});

test("rejects unknown keys (strict)", () => {
  const result = consentRequestSchema.safeParse({
    categories: { ...validCategories, evil: true },
    action: "accept_all",
  });
  assert.equal(result.success, false);
});

test("update schema requires action:'update'", () => {
  assert.equal(
    updateConsentRequestSchema.safeParse({
      categories: validCategories,
      action: "accept_all",
    }).success,
    false,
  );
  assert.equal(
    updateConsentRequestSchema.safeParse({
      categories: validCategories,
      action: "update",
    }).success,
    true,
  );
});
