# Input validation — SECURITY MASTERPLAN Point 10

> **NEVER use a user input directly. Validate EVERY input.**

## Status: IMPLEMENTED (BUILD-PLAN.md § P2 — "PROMPT #INPUT")

**One validation technology in the entire codebase: [Zod](https://zod.dev).**
Never `express-validator`, `joi`, `yup`, `class-validator`. Locked by
`tests/validation/inputs.test.ts`.

## Files

| File | Role |
| --- | --- |
| `schemas.ts` | The registry. Field primitives (`amount`, `uuid`, `isoDate`, `note`, …) + entity schemas (`accountCreateSchema`, `transactionCreateSchema`, `budgetCreateSchema`, …). Imports **only `zod`** so it stays unit-testable. |
| `parse.ts` | `parseJsonBody(request, schema)` / `parseParams(obj, schema)` — throw `ValidationError` (400 `VALIDATION_ERROR`) on bad JSON or a schema failure. |
| `index.ts` | Barrel — `import { … } from "@/lib/validation"`. |

## Usage in a route handler

```ts
// app/api/accounts/route.ts
import { withAuth } from "@/lib/auth/with-auth";
import { ok } from "@/lib/http/respond";
import { parseJsonBody, accountCreateSchema } from "@/lib/validation";
import { getAuthClient } from "@/lib/supabase/server";

export const POST = withAuth(async (req, { user }) => {
  const input = await parseJsonBody(req, accountCreateSchema); // typed + validated
  const db = await getAuthClient(req);
  const { data, error } = await db
    .from("accounts")
    .insert({ ...input, user_id: user.id })   // user_id server-side, never from body
    .select()
    .single();
  if (error) throw error;                       // → generic 500 (Point 14)
  return ok({ account: data });
});
```

Rules:

1. **Body, query params and route params are all user input** — validate all three
   (`parseJsonBody`, `parseParams`).
2. **Identity is never an input**: `user_id` comes from `authenticate()` / `withAuth`
   (Point 6), never from the validated body. Same for `id`, `is_primary`,
   `is_archived`, `usage_count`, `scoring_axis`.
3. **Field names are snake_case** = the DB columns
   (`supabase/migrations/0002_core_schema.sql`), so `parsed.data` inserts directly.
4. Every schema is `.strict()` — unknown keys are rejected.
5. Amounts are **whole XOF francs** as `number` (`.int().positive()`), matching the
   `bigint` columns (DESIGN-RECONCILIATION.md D1).

## Parameterized queries — no SQL string-building

All DB access goes through the **Supabase JS client** (`.from(...).eq(...)`,
`.insert(obj)`), which binds every value as a parameter. Never build SQL by
concatenation/interpolation, and never pass user input into `supabase.rpc(name, args)`
as a raw SQL fragment. Locked by `tests/validation/inputs.test.ts`.
