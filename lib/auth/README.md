# `lib/auth` — server-side authorization

SECURITY MASTERPLAN — **Point 6: Rights Verified on Server.**
**MANTRA: NEVER TRUST THE CLIENT.**

RLS (Point 4) is the safety net. These checks run *first*, in every route handler.

## Building blocks

| Export | From | Does |
| --- | --- | --- |
| `authenticate(request)` | `authenticate.ts` | Verifies the `Authorization: Bearer <jwt>` via Supabase Auth. Returns `{ id, email }` or throws `UnauthorizedError` (401). The **only** source of the caller's identity. |
| `withAuth(handler)` | `with-auth.ts` | Wraps a route handler: authenticates before the body, maps thrown `ApiError`s to the REST envelope. |
| `assertOwnership(row, user, meta)` | `guard.ts` | `NotFoundError` if `row` is null, `ForbiddenError` + security log if `row.user_id !== user.id`. Narrows `row` to non-null. |
| `requireAdmin(user)` | `guard.ts` | `ForbiddenError` unless `user.id` is in `ADMIN_USER_IDS` (env allow-list; no roles table in MVP). |
| `assertStepUp(confirmed, user)` | `guard.ts` | `ReauthRequiredError` (403) when a high-risk action wasn't freshly confirmed. |
| `isOwner(row, userId)` | `ownership.ts` | Pure boolean. Unit-tested. |
| `isExpired` / `shouldRefresh` / `classifyAuthFailure` | `session.ts` | Pure token-lifetime helpers (Point 9). Unit-tested. |
| `toErrorResponse(err)` | `../http/errors.ts` | `ApiError` → its status/code/message; anything else → opaque 500 (Point 14). |
| `AUTH_MESSAGES` / `AUTH_INVALID_CODE` | `responses.ts` | The one message per auth-failure category — no enumeration (Point 16). |
| `safeEqual` / `withMinimumDuration` | `timing.ts` | Constant-time compare + duration-floor for credential checks (Point 16). Unit-tested. |
| `generateInviteCode` / `inviteCodeHash` / `verifyInviteCode` / `classifyInviteCode` | `invite-codes.ts` | Closed-beta invite codes — 6-digit, HMAC-peppered hash, pure verdict (Point 19). Unit-tested. |
| `inviteSignupSchema` / `createInvitationsSchema` | `schemas.ts` | Zod request shapes for the two Point 19 endpoints. |

## The mandatory pattern for every endpoint

```ts
// app/api/accounts/[id]/route.ts
import { withAuth } from "@/lib/auth/with-auth";
import { assertOwnership } from "@/lib/auth/guard";
import { ok } from "@/lib/http/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req, { params, user }) => {
  const id = String(params.id);
  const account = await fetchAccount(id);                 // 1. fetch by id only
  assertOwnership(account, user, { resource: "account", resourceId: id }); // 2. verify
  return ok({ account });                                 // 3. THEN return data
});

export const DELETE = withAuth(async (req, { params, user }) => {
  const id = String(params.id);
  const account = await fetchAccount(id);
  assertOwnership(account, user, { resource: "account", resourceId: id });

  const confirmed = await verifyDeleteConfirmation(req, user); // 4. step-up (high-risk)
  assertStepUp(confirmed, user);

  await deleteAccount(id);
  return ok({ deleted: true });
});
```

Rules:

1. **Identity comes from `user`, never from the request body / query.** On writes,
   set `user_id = user.id` server-side; ignore or reject any `user_id` in the payload.
2. **Fetch by resource id, then verify ownership.** Never `WHERE id = ? AND user_id = ?`
   as the *only* check and return 404 silently — use `assertOwnership` so the attempt
   is logged.
3. **High-risk endpoints** (delete account, change payout details, export all data,
   disable 2FA): add `assertStepUp` after ownership. The confirmation mechanism is
   route-specific (re-enter password, one-time code) and must be verified server-side.
4. Admin-only endpoints: `requireAdmin(user)` right after `withAuth`.

## Testing (Point 6, step 3)

Pure logic is unit-tested in `tests/auth/`:
- `ownership.test.ts` — `isOwner` matrix (match / mismatch / null row / empty id).
- `errors.test.ts` — `toErrorResponse`: `ApiError` passthrough, unknown → generic 500.

End-to-end ("User 1 → `GET /api/accounts/<User 2's id>` → 403 + log") runs once the
accounts endpoints exist (built with PROMPT #PAYMENT, Day 9).

## Sessions & refresh — SECURITY MASTERPLAN Point 9

The masterplan describes a hand-rolled `jsonwebtoken` + `refresh_tokens` table.
**Swiftly.io uses Supabase Auth**, which already is that system:

| Masterplan step | Supabase equivalent |
| --- | --- |
| `createTokens()` — access 15 min + refresh 30 j, refresh stored in DB | Supabase issues both on sign-in. Access JWT lifetime = **Dashboard → Authentication → Sessions → "Access token (JWT) expiry" = `900`**. Refresh token lives in `auth.refresh_tokens` (Supabase-managed). |
| Refresh stored in DB for revocation | `auth.refresh_tokens` — **never create `public.refresh_tokens`**. Enable **"Detect and revoke potentially compromised refresh tokens"** + refresh-token rotation in the dashboard. |
| Login → tokens in `httpOnly`, `secure`, `sameSite:'strict'` cookies | MVP: the browser Supabase client holds the session and sends `Authorization: Bearer <access_token>`. Cookie-based sessions come with `@supabase/ssr` when SSR-authenticated pages land — that package sets `httpOnly` + `secure` + `sameSite=lax` automatically. |
| Protect endpoints; expired → `401 TOKEN_EXPIRED` | `authenticate()` checks `isExpired(token)` first → throws `TokenExpiredError` (`401 { code: "TOKEN_EXPIRED" }`). Bad/revoked token → `UnauthorizedError`. |
| Frontend calls `/api/auth/refresh` → retry, user notices nothing | `lib/http/client.ts` → `createApiClient({ refreshSession })`. On `401 TOKEN_EXPIRED` it calls `refreshSession` once (`supabase.auth.refreshSession()`) and replays the request. Concurrent 401s share one refresh. Non-expiry 401 → `onSessionExpired()` (go to login). |
| Logout → mark refresh `is_valid=false`, clear cookies | `supabase.auth.signOut()` — revokes the refresh token server-side and clears local storage / cookies. A `/api/auth/logout` route is only needed once we hold server cookies. |

Client wiring (once a session exists):

```ts
"use client";
import { createApiClient } from "@/lib/http/client";
import { createClient } from "@/lib/supabase/client"; // browser client, added with auth screens

const supabase = createClient();

// keep the current access token in memory, updated by Supabase's own listener
let accessToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? null;
});

export const api = createApiClient({
  refreshSession: async () => !(await supabase.auth.refreshSession()).error,
  authHeader: () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  onSessionExpired: () => { window.location.href = "/connexion"; },
});
```

Pure logic is unit-tested in `tests/auth/session.test.ts` and `tests/http/client.test.ts`
(expiry math, refresh-once-and-retry, no infinite loop, concurrent de-dupe). The
end-to-end "login → wait 15 min → auto-refresh → old token rejected" test runs once
the auth screens (invite-code sign-in) exist.

## Single auth error message — SECURITY MASTERPLAN Point 16

Goal: a response must not tell an attacker whether an e-mail / account exists
(enumeration), and must not be distinguishable by **timing**.

### What Supabase Auth already gives us

The credential endpoints are Supabase GoTrue, not code in this repo:

| Flow | Supabase behaviour | Config |
| --- | --- | --- |
| Sign-in (`signInWithPassword` / `verifyOtp`) | one `"Invalid login credentials"` for unknown e-mail **and** wrong secret; roughly constant-time | default |
| Sign-up | with **"Confirm email" ON**, an existing address gets the same "check your inbox" response as a new one (no 409) | Dashboard → Auth → Providers → Email → *Confirm email* = ON |
| Forgot password (`resetPasswordForEmail`) | always returns success, e-mail only sent if the address exists | default |
| Leaked-password / breach messages | keep generic | — |

So for the standard flows, Point 16 = **turn on "Confirm email"** and never
surface Supabase's raw error to the client — map any sign-in failure to
`InvalidCredentialsError` (`401 AUTH_INVALID`, `AUTH_MESSAGES.invalidCredentials`).

### For any credential check we write ourselves

Mainly the invite-code redemption (`POST /api/auth/verify-code`, SCREEN-2) and
later reset/confirm-token endpoints:

```ts
export const runtime = "nodejs";

export async function POST(request: Request) {
  const { code } = parsed.data;                       // Zod-validated
  const row = await lookupInviteCode(code);           // fetch by code

  return withMinimumDuration(150, async () => {       // floor the wall-clock
    const valid =
      row != null &&
      !row.is_used &&
      row.expires_at > new Date() &&
      safeEqual(code, row.code);                       // constant-time
    if (!valid) {
      log.info("auth.invite_code_rejected", { reason: row ? "used_or_expired" : "unknown" });
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }
    …redeem, create the Supabase user…
  });
}
```

Rules:

1. **One message + one code per category** — from `AUTH_MESSAGES`. Log the real
   reason (`log.info("auth.…", { email: masked, reason })`), never return it.
2. **`safeEqual`** for comparing the submitted secret to the stored one — never
   `===` (length + content leak through comparison time).
3. **`withMinimumDuration(floorMs, …)`** around the whole check so "not found"
   (fast) and "found, verifying" (slow, hits Supabase) take the same time. This
   is the generalised "always run bcrypt against a dummy hash".
4. **Rate-limit** these endpoints hard (Point 3) — a 6-digit invite code is 10⁶,
   brute-forceable without it.
5. Status codes don't leak either: sign-up is `200/201` whether or not the
   address existed; never `409`.

### Open decision for the auth-screens session

SCREEN-2 specs **differentiated** invite-code errors ("Code expiré",
"Ce code a déjà été utilisé"). Invite codes aren't an e-mail-enumeration target,
so that's defensible **if** the endpoint is constant-time + hard rate-limited.
Otherwise collapse to `AUTH_MESSAGES.invalidInviteCode`. Decide then; the
primitives support both.

### Tests

`tests/auth/responses.test.ts` (messages identical + non-revealing, error class
in sync) and `tests/auth/timing.test.ts` (`safeEqual` correctness + no length
throw; `withMinimumDuration` floors the fast path; "not found" vs "slow verify"
land in the same window). The end-to-end timing test runs once the endpoints exist.

## Invite-code auth — SECURITY MASTERPLAN Point 19

The MVP is a **closed beta** for ~5 testers: the **6-digit invite code is the ONE
and only way into the app**. No sign-up, no password, no OAuth, no phone.

It is a **throwaway mechanism**. Once the idea is validated, **Phase 2 retires the
invite code entirely** and moves to the real auth in the masterplan (phone + SMS
verification, then OAuth Google/Apple). The invite code is not maintained
alongside real auth — it is removed. Nothing here should grow features on the
assumption it lives past the MVP.

**What exists now (Lot 1, 2026-09-02):** the primitives in `invite-codes.ts` +
`schemas.ts`, `supabase/migrations/0003_invitation_codes.sql`, `POST
/api/auth/verify-code` (redeem → magic-link session handoff via
`invite-session.ts`) and `POST /api/auth/profile` (SCREEN-3 + Compte Principal,
D5). Session issuing = **OTP / magic-link exchange** (Elias, 2026-09-02):
`admin.createUser` (synthetic e-mail) → `admin.generateLink` → the browser runs
`verifyOtp({ type: "magiclink", token_hash })`. **Still missing before prod:**
Point 3 rate-limiting (`lib/auth/rate-limit.ts` is a no-op placeholder).

### Code format — 6 digits (SCREEN-2), with a hard rate-limit dependency

**Decision (2026-09-02, Elias): 6-digit code**, matching SCREEN-2's six-box UI and
verbal shareability. This **deviates from the masterplan's "length 32"**.

`generateInviteCode()` returns a uniformly-random 6-digit string (leading zeros
kept). The space is only 10⁶, so:

> ⚠️ **Security rests on rate-limiting + lockout (Point 3), not on the code's
> entropy.** `POST /api/auth/verify-code` MUST, before it ships, enforce: a low
> per-IP attempt rate, a per-code attempt ceiling (lock the code after ~5 bad
> tries), and a global failed-attempt alarm. Without that, 10⁶ is brute-forceable.

Because SCREEN-2 shows three distinct errors ("Code invalide", "Code expiré",
"Ce code a déjà été utilisé"), the UI may surface `classifyInviteCode`'s verdict
directly — invite codes aren't an e-mail-enumeration target and the rate-limit
covers brute force. The API layer still has one code (`AUTH_INVALID_CODE`).

### The hash is HMAC-peppered, not plain

`inviteCodeHash(code, pepper)` = **HMAC-SHA256** keyed with `INVITE_CODE_PEPPER`
(a long random server secret, **never stored in the DB**). A plain SHA-256 of a
6-digit code is broken by a 10⁶-entry rainbow table in milliseconds; the pepper
means a **database-only** leak still can't recover the codes. `verifyInviteCode`
compares constant-time. Pass the pepper from `serverEnv("INVITE_CODE_PEPPER")`.

### Endpoint template — `POST /api/admin/create-invitations`

```ts
// app/api/admin/create-invitations/route.ts  (later lot)
import { withAuth } from "@/lib/auth/with-auth";
import { requireAdmin } from "@/lib/auth/guard";
import { createInvitationsSchema } from "@/lib/auth/schemas";
import { generateInviteCodes, inviteCodeHash, inviteExpiresAt } from "@/lib/auth/invite-codes";
import { serverEnv } from "@/lib/env/server";
import { getServiceClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (request, { user }) => {
  requireAdmin(user);                                        // 403 unless in ADMIN_USER_IDS

  const parsed = createInvitationsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Requête invalide.", 400, parsed.error.flatten());

  const pepper = serverEnv("INVITE_CODE_PEPPER");
  const db = getServiceClient();
  if (!pepper || !db) return fail("SERVER_ERROR", "Une erreur est survenue.", 500);

  const codes = generateInviteCodes(parsed.data.count);
  const expiresAt = inviteExpiresAt();
  const { error } = await db.from("invitation_codes").insert(
    codes.map((code) => ({
      code_hash: inviteCodeHash(code, pepper),
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      note: parsed.data.note ?? null,
    })),
  );
  if (error) {
    log.error("auth.invitations_insert_failed", { reason: error.message });
    return fail("SERVER_ERROR", "Une erreur est survenue.", 500);
  }

  log.info("auth.invitations_created", { admin: user.id, count: codes.length });
  // Plaintext codes are returned ONCE, here, and never again.
  return ok({ codes, expiresAt: expiresAt.toISOString() }, { status: 201 });
});
```

### Endpoint template — `POST /api/auth/verify-code` (SCREEN-2)

```ts
// app/api/auth/verify-code/route.ts  (later lot)
import { inviteSignupSchema } from "@/lib/auth/schemas";
import { normalizeInviteCode, isValidInviteCodeShape, inviteCodeHash } from "@/lib/auth/invite-codes";
import { AUTH_MESSAGES, AUTH_INVALID_CODE } from "@/lib/auth/responses";
import { withMinimumDuration } from "@/lib/auth/timing";
import { serverEnv } from "@/lib/env/server";
import { getServiceClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // FIRST: hard rate-limit by IP (Point 3 / Upstash) — a 6-digit code is only
  // safe behind this. Reject with 429 before doing any work.

  const parsed = inviteSignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("VALIDATION_ERROR", "Requête invalide.", 400, parsed.error.flatten());

  const pepper = serverEnv("INVITE_CODE_PEPPER");
  const db = getServiceClient();
  if (!pepper || !db) return fail("SERVER_ERROR", "Une erreur est survenue.", 500);

  return withMinimumDuration(200, async () => {              // flat timing: unknown == used == expired
    const code = normalizeInviteCode(parsed.data.code);
    if (!isValidInviteCodeShape(code)) {
      return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400);
    }

    // Atomic claim — see supabase/migrations/0003_invitation_codes.sql. 0 rows ⇒ unknown/used/expired.
    const { data: claimed, error } = await db
      .from("invitation_codes")
      .update({ used_at: new Date().toISOString() /* used_by set after user creation */ })
      .eq("code_hash", inviteCodeHash(code, pepper))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();

    if (error) { log.error("auth.verify_code_failed", { reason: error.message }); return fail("SERVER_ERROR", "Une erreur est survenue.", 500); }
    if (!claimed) { log.info("auth.invite_code_rejected"); return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidInviteCode, 400); }

    // …create the Supabase user (supabase.auth.admin.createUser), link used_by,
    //   issue a session (generateLink / signInWithPassword-less flow — TBD with
    //   the auth-screens lot), then:
    const session = { /* access_token, refresh_token from Supabase */ };
    log.info("auth.verify_code_ok", { invitation: claimed.id });
    return ok({ session }, { status: 201 });
  });
}
```

`createTokens()` from the masterplan = **Supabase issues the session** (Point 9).
Swiftly.io never hand-rolls JWTs or a `refresh_tokens` table. The open question
for the later lot: `admin.createUser` doesn't return a session, so the redeem
endpoint needs `generateLink` + a client exchange, or a first-party sign-in.

### Rules

1. Codes are minted **only** by `POST /api/admin/create-invitations`
   (`withAuth` + `requireAdmin`). Never a public endpoint.
2. Store `inviteCodeHash(code, pepper)`, never the code. Return plaintext exactly once.
3. Redeem is a **single atomic UPDATE** with `used_at is null and expires_at > now()`
   in the WHERE — never read-then-write (double-spend race).
4. **Rate-limit `verify-code` hard** (Point 3): per-IP rate + per-code lockout
   after ~5 fails + a global alarm. This is not optional — the 6-digit space
   depends on it.
5. Wrap the check in `withMinimumDuration` so a DB hit (found) and an early
   return (unknown) take the same wall-clock time.

### Phase 2 — invite code is REMOVED, real auth takes over (not built)

Once the MVP validates the idea, the whole invite-code path — this section's
primitives, the `invitation_codes` table, both route templates — is **deleted**,
not kept as a fallback. Phase 2 auth = **phone + SMS OTP**, Supabase-native, no
Twilio SDK in our code: enable **Dashboard → Auth → Providers → Phone**, plug
Twilio credentials there, then `supabase.auth.signInWithOtp({ phone })` →
`supabase.auth.verifyOtp({ phone, token, type: "sms" })`. Rate-limit the send
endpoint hard (cost + abuse). Keep the single-message rule (Point 16): "code
envoyé si le numéro est valide".

### Phase 3 — OAuth Google / Apple (not built)

`supabase.auth.signInWithOAuth({ provider: "google" | "apple" })` + a
`/auth/callback` route running `exchangeCodeForSession`. Providers configured in
the Supabase dashboard.

### Tests

`tests/auth/invite-codes.test.ts` (6-digit shape / uniformity / HMAC pepper /
constant-time verify / `classifyInviteCode` matrix incl. exact-instant expiry)
and `tests/auth/invite-schemas.test.ts` (6 digits accepted, non-digits & wrong
lengths rejected, `count` bounds, `.strict()`). The end-to-end "admin mints 10 →
user redeems 1 → reuse rejected → >30 d rejected → brute force locked out" test
runs once the endpoints + tables exist.

## Env

```
ADMIN_USER_IDS=<uuid>,<uuid>      # optional, comma-separated. Empty ⇒ no admins.
```
