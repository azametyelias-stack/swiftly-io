import { test } from "node:test";
import assert from "node:assert/strict";

import { getServiceClient } from "../../lib/supabase/server.ts";

test("getServiceClient returns null when SUPABASE_SERVICE_ROLE_KEY is unset", () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal(getServiceClient(), null);
});
