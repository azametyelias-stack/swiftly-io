# Supabase — database migrations

## Applying migrations

**Option A — Supabase CLI** (recommended once the CLI is set up):

```bash
supabase db push
```

**Option B — SQL editor** (no CLI): open the Supabase dashboard →
_SQL Editor_ → paste the contents of each file in `migrations/` in order and run.

## Migrations

| File | Purpose |
| --- | --- |
| `0001_privacy_consent.sql` | `consent_logs` (append-only audit trail) + `privacy_settings` (current state) for the GDPR/CCPA consent system. |
| `0002_core_schema.sql` | Core app schema (`users`, `accounts`, `categories`, `people`, `transactions`, `templates`, `budgets`, `projects`, `alerts`, `reports`) + RLS + system-category seed + `public.account_balance()` (derived balance, no `balance` column). See `docs/3-PRODUCT (Design et Wireframes)/BUILD-PLAN.md` § P1. |

Not a migration:

| File | Purpose |
| --- | --- |
| `rls-core-tables.sql` | **Superseded by `0002_core_schema.sql`** (which writes the same policies inline). Kept for reference only. |
| `invitation-codes.sql` | **Template** — `public.invitation_codes` (closed-beta sign-up, SECURITY MASTERPLAN Point 19). Hash-at-rest, server-write-only. Apply with the auth-screens lot (Lot 1). Not run by `supabase db push`. |

## Backups & disaster recovery (SECURITY MASTERPLAN — Point 20)

See [`BACKUPS.md`](./BACKUPS.md) — plan verification, recovery objectives, the
**restore runbook** (read it before you need it), and the Phase 2 off-Supabase
encrypted-backup scripts in [`../scripts/backup/`](../scripts/backup/).

> ⚠️ The Supabase **Free** plan has **no** automated backups. Swiftly.io's MVP
> runs on Free by decision (2026-09-02) — accepted and non-blocking for Days
> 9-30. Backups get turned on at the Pro upgrade (~Day 30): dashboard toggle
> and/or the `scripts/backup/` job. See [`BACKUPS.md`](./BACKUPS.md).

## Row-Level Security (SECURITY MASTERPLAN — Point 4)

RLS is the **second** line of defence. The **first** is the API layer (see
"Backend verification" below). Rule for this repo:

> **Every `create table public.<t>` enables RLS in the same migration.**
> Enforced by `tests/db/rls.test.ts` (`npm test`).

- **Owner-scoped table** (`user_id uuid references auth.users`): enable RLS and
  add the 4 owner policies from `rls-core-tables.sql`
  (`auth.uid() = user_id` for select / insert / update / delete).
- **Server-write-only table** (e.g. `consent_logs`, `privacy_settings`): enable
  RLS and add **no** policies — that is a hard deny for `anon` + `authenticated`.
  Writes go through the service-role key, which bypasses RLS.

### Current state (audited 2026-09-02)

| Table | RLS | Policies | Notes |
| --- | --- | --- | --- |
| `consent_logs` | ✅ on | none (deny-all) + `revoke update,delete,truncate` | append-only, server-write-only — correct |
| `privacy_settings` | ✅ on | none (deny-all) | server-write-only — correct |
| `users` | ✅ on | select/insert/update self; no delete | owner col is `id` |
| `accounts`, `categories`, `people`, `transactions`, `templates`, `budgets`, `projects`, `alerts`, `reports` | ✅ on | 4 owner policies (`auth.uid() = user_id`) | `categories` also allows reading system rows (`user_id is null`) |

Core tables created in `0002_core_schema.sql` (2026-09-02). `public.account_balance(uuid)`
is `security invoker`, so RLS on the underlying tables still applies.

`refresh_tokens`: handled by Supabase Auth in the `auth` schema. Do **not**
create a `public.refresh_tokens` table.

## Session config (SECURITY MASTERPLAN — Point 9)

Supabase Auth *is* the "access token 15 min + revocable refresh token 30 j" system.
Set in the dashboard (no code, no migration):

| Dashboard → Authentication → Sessions | Value | Why |
| --- | --- | --- |
| Access token (JWT) expiry | `900` (15 min) | Matches `SESSION_POLICY.accessTokenTtlSeconds`. Short window if a token leaks. |
| Refresh token rotation | **enabled** | Each refresh issues a new refresh token; the old one dies. |
| Detect & revoke compromised refresh tokens (reuse detection) | **enabled** | Replaying an old refresh token kills the whole session. |
| Time-box user sessions / inactivity timeout | optional — 30 d inactivity | Matches `SESSION_POLICY.refreshTokenTtlSeconds`. |

App side: `authenticate()` returns `401 { code: "TOKEN_EXPIRED" }` for an expired
JWT, and `lib/http/client.ts` refreshes + retries transparently. See
[`lib/auth/README.md`](../lib/auth/README.md#sessions--refresh--security-masterplan-point-9).

## Anti-enumeration (SECURITY MASTERPLAN — Point 16)

| Dashboard → Authentication | Value | Why |
| --- | --- | --- |
| Providers → Email → **Confirm email** | **ON** | An already-registered address then gets the same "check your inbox" response as a new one — sign-up can't be used to test which e-mails have accounts. |

Supabase's sign-in already returns one generic `"Invalid login credentials"` for
unknown-email and wrong-password alike, and `resetPasswordForEmail` always
reports success. The app maps any sign-in failure to `InvalidCredentialsError`
(`401 AUTH_INVALID`) and never forwards Supabase's raw message. Details +
constant-time helpers for our own credential checks (invite codes):
[`lib/auth/README.md`](../lib/auth/README.md#single-auth-error-message--security-masterplan-point-16).

### Backend verification (Point 4, step 5 — non-negotiable)

RLS does not replace API-side checks. Every route handler must:

1. Resolve the user id from the verified session/JWT — **never** from the request body.
2. Scope every query by that id (`.eq("user_id", session.user.id)`).
3. On writes, set `user_id` server-side; reject or ignore any `user_id` in the payload.
4. Use the service-role client only for trusted server logic, never to run
   user-supplied filters unscoped.

### Verifying RLS works

Run as an authenticated user (JS client with a real session), not the service role:

```sql
select count(*) from public.transactions;                       -- only your rows
select count(*) from public.transactions where user_id <> auth.uid();  -- 0
insert into public.accounts (user_id, name, type, balance)
  values ('00000000-0000-0000-0000-000000000000','x','Cash',0);  -- WITH CHECK violation
```

## Required environment variable

The consent endpoints write with the **service-role** key so they can bypass RLS.
Add to `.env.local` (see [`.env.example`](../.env.example) for the full list; also
add it to the Vercel project env):

```
SUPABASE_SERVICE_ROLE_KEY=<Supabase dashboard → Project Settings → API → service_role secret>
```

Without it the app still runs — consent is stored client-side and the API responds
`{ "data": { "persisted": false } }` with a one-time server warning — but nothing
is written to the database.
