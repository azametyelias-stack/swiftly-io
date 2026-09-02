-- ============================================================================
-- public.invitation_codes  —  closed-beta sign-in (SECURITY MASTERPLAN Point 19)
-- BUILD-PLAN.md § LOT 1 · SCREEN-2 "code d'invitation"
-- ============================================================================
--
--   MVP-ONLY, THROWAWAY. The 6-digit invite code is the single way into the app
--   for the ~5-tester closed beta. Phase 2 DROPS this table and moves to real
--   auth (phone + SMS OTP, then OAuth). Do not extend it. See lib/auth/README.md.
--
--   Model:
--   * `code_hash` = HMAC-SHA256(normalizeInviteCode(code), INVITE_CODE_PEPPER),
--     hex. The pepper is a server secret, NEVER in this DB — a plain hash of a
--     6-digit code is broken by a 10^6 rainbow table instantly. Plaintext codes
--     exist only in the admin create response and the user's input.
--     See lib/auth/invite-codes.ts.
--   * A 6-digit space is only safe behind a hard rate-limit + per-code lockout
--     on the redeem endpoint (Point 3) — enforced there, not here.
--   * Server-write-only: RLS on, NO policies => hard deny for anon +
--     authenticated. Both endpoints (admin create, user redeem) use the
--     service-role client, which bypasses RLS.
--
--   Redeem flow (POST /api/auth/verify-code, claim-first):
--     1. atomic UPDATE stamps `used_at` where code_hash = :hash
--        and used_at is null and expires_at > now()   -> 0 rows ⇒ invalid
--     2. Supabase user is created (synthetic e-mail, lib/auth/invite-session.ts)
--     3. `used_by` is linked back to the new auth.users id
--   so `used_by` implies `used_at`, but `used_at` may briefly stand alone.
-- ----------------------------------------------------------------------------

create table if not exists public.invitation_codes (
  id           uuid        primary key default gen_random_uuid(),
  code_hash    text        not null unique,
  created_by   uuid        references auth.users (id) on delete set null,
  used_by      uuid        references auth.users (id) on delete set null,
  used_at      timestamptz,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  note         text,
  created_at   timestamptz not null default now(),
  constraint invitation_codes_used_by_implies_used_at
    check (used_by is null or used_at is not null)
);

comment on table public.invitation_codes is
  'Closed-beta invite codes (Point 19). code_hash only; server-write-only via service role. Phase 2 drops this table.';

alter table public.invitation_codes enable row level security;
-- No policies on purpose — deny-all for anon + authenticated.

revoke update, delete on public.invitation_codes from anon, authenticated;

create index if not exists invitation_codes_expires_at_idx on public.invitation_codes (expires_at);
create index if not exists invitation_codes_used_by_idx    on public.invitation_codes (used_by);
-- Redeem looks codes up by hash among the still-claimable ones.
create index if not exists invitation_codes_unclaimed_idx  on public.invitation_codes (code_hash) where used_at is null;
