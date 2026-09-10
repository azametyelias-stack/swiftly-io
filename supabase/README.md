# Supabase — database migrations

> **Two databases since 2026-09-09.** `.env.local` points at the **dev**
> project, `.env.prod` at **production**, and no script touches production
> without `--target prod` plus a typed confirmation. Read
> [`../scripts/db/README.md`](../scripts/db/README.md) before applying anything.

## Applying migrations

**Option A — the repo's runner** (recommended):

```bash
npm run db:status                     # what is applied where
npm run db:migrate                    # apply what is missing (dev)
npm run db:migrate -- --only 0007     # one migration
```

It keeps a `public.schema_migrations` ledger, applies each file in a single
transaction, and refuses to replay a migration that has already run. That last
point matters: `0002` (system-category seed, no unique index to conflict on),
`0006` (`update users set theme …`) and `0007` (`update people set kind …`) all
corrupt data when replayed.

**Option B — SQL editor** (no direct connection): `npm run db:bundle` writes a
single transactional file to `supabase/.temp/` — paste it into the dashboard's
_SQL Editor_ and run.

**Option C — Supabase CLI** (not installed here): `supabase db push`. Note it
does not know about the ledger above.

## Migrations

| File | Purpose |
| --- | --- |
| `0001_privacy_consent.sql` | `consent_logs` (append-only audit trail) + `privacy_settings` (current state) for the GDPR/CCPA consent system. |
| `0002_core_schema.sql` | Core app schema (`users`, `accounts`, `categories`, `people`, `transactions`, `templates`, `budgets`, `projects`, `alerts`, `reports`) + RLS + system-category seed + `public.account_balance()` (derived balance, no `balance` column). See `docs/3-PRODUCT (Design et Wireframes)/BUILD-PLAN.md` § P1. |
| `0003_invitation_codes.sql` | `public.invitation_codes` (closed-beta sign-in, SECURITY MASTERPLAN Point 19). HMAC-peppered hash at rest, RLS deny-all (server-write-only via service role). Redeemed by `POST /api/auth/verify-code` (Lot 1, SCREEN-2). Phase 2 drops this table. |
| `0004_lot5_recurrence_fees.sql` | Lot 5 (D2). `transactions.recurrence_key` (+ partial UNIQUE index) for cron idempotency; `templates.next_run_on`/`last_run_on`; `accounts.last_fee_on`; "Frais bancaires" system category; `public.account_balance()` **rewritten** to net project allocations against project-linked spending (🔎 LAYER 3, no double-counting); `public.allocate_to_project()` (atomic allocation with an insufficient-funds guard, D4). Driven by `POST /api/cron/run` (Vercel Cron). |

| `0005_lot6_alerts.sql` | Lot 6. `alerts.value` / `tone` / `facts` (the chip and the detail screen of SCREEN-18) + `alerts.dedup_key` with a partial UNIQUE index, so the daily cron cannot write the same budget alert twice under a race. |
| `0006_theme_system.sql` | `users.theme` accepts `'system'` and defaults to it. Contains a **one-time, non-replayable** `update … where theme = 'light'` — see the file's own warning. |
| `0007_people_kind.sql` | `people.kind` (`expense` \| `income`) + `(user_id, kind)` index, so the "Lié à" picker stops mixing the two address books. Back-fills existing rows from real usage — **rewrites data, not replayable**. Test procedure: [`../scripts/db/README.md`](../scripts/db/README.md) § « La procédure 0007 ». |
| `0008_rls_auto_enable.sql` | Event trigger `ensure_rls` → `public.rls_auto_enable()`: forces `ENABLE ROW LEVEL SECURITY` on every `CREATE TABLE` in `public`, whether the author remembered it or not. Point 4 is a human discipline; this is the engine enforcing it. Was posted **by hand on production only** and found on 2026-09-10 by the dev ↔ prod comparison — this file exists so a rebuilt environment gets the same net. Replayable (`create or replace` + `drop … if exists`). |

Not a migration:

| File | Purpose |
| --- | --- |
| `rls-core-tables.sql` | **Superseded by `0002_core_schema.sql`** (which writes the same policies inline). Kept for reference only. |
| `public.schema_migrations` | Created by `scripts/db/migrate.ts`, not by a numbered file: it is tooling, not app schema. RLS on, no policies. Excluded from the dev ↔ prod schema comparison for that reason. |

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
