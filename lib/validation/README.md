# Input validation — SECURITY MASTERPLAN Point 10

> **NEVER use a user input directly. Validate EVERY input.**

## Status: FOUNDATION — owned by PROMPT #INPUT (Day 10)

Point 10 is **not implemented here**. The whole project's input validation is built
in one dedicated session — **PROMPT #INPUT, Section 7, Day 10** — and today is before
Day 10.

**One validation technology in the entire codebase: [Zod](https://zod.dev).**
Never `express-validator`, `joi`, `yup`, `class-validator`. This is locked by
`tests/validation/inputs.test.ts`.

### What PROMPT #INPUT (Day 10) will add

- 50+ shared Zod schemas — `Amount`, `Phone`, `Email`, `Currency`, `Category`,
  `Transaction`, `Payment`, … in `lib/validation/` as the single registry.
- A validation wrapper applied to **every** route handler (parse body / query /
  params before any logic runs).
- User-friendly error messages in French, with stable error codes.
- Unit tests covering every edge case.

## Interim pattern (any route added BEFORE Day 10)

Follow what the privacy endpoints already do — reference implementation:
[`lib/privacy/endpoint.ts`](../privacy/endpoint.ts) + [`lib/privacy/schemas.ts`](../privacy/schemas.ts).

```ts
// 1. define a Zod schema (.strict() so unknown keys are rejected)
const bodySchema = z.object({ amount: z.number().positive(), note: z.string().max(140) }).strict();

// 2. in the handler: parse the raw JSON, never touch it directly
let raw: unknown;
try {
  raw = await request.json();
} catch {
  return fail("INVALID_JSON", "Corps de requête JSON invalide.", 400);
}

const parsed = bodySchema.safeParse(raw);
if (!parsed.success) {
  return fail("VALIDATION_ERROR", "Données invalides.", 400, parsed.error.flatten());
}

// 3. only parsed.data flows onward
const { amount, note } = parsed.data;
```

Rules:

1. Every schema file carries the `FOUNDATION Day 10 (PROMPT #INPUT)` header so it is
   folded into the shared registry later and does not become a second source of truth.
2. Validate **body, query params, and route params** — all three are user input.
3. Identity is still never an input: `user_id` comes from `authenticate()`
   (Point 6), never from the validated body.

## Parameterized queries — no SQL string-building

All DB access goes through the **Supabase JS client** (`.from(...).select().eq(...)`,
`.insert(obj)`), which binds every value as a parameter. Never:

- build SQL by concatenating or interpolating user input,
- pass user input into `supabase.rpc(name, args)` as a raw SQL fragment,
- use a template literal to assemble a query string.

Locked by `tests/validation/inputs.test.ts`.
