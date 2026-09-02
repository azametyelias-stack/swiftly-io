-- ============================================================================
-- public.invitation_codes  — closed-beta sign-up (SECURITY MASTERPLAN Point 19)
-- ============================================================================
--
--   STATUS: TEMPLATE — *not* a migration, not run by `supabase db push`.
--
--   MVP-ONLY, THROWAWAY. The 6-digit invite code is the single way into the app
--   for the ~5-tester closed beta. Phase 2 DROPS it (this table included) and
--   moves to real auth (phone + SMS OTP, then OAuth). Do not extend it.
--
--   The auth screens (SCREEN-2 code d'invitation, SCREEN-3 username) and the
--   `public.users` profile table are a later lot. Apply this file — or fold it
--   into that migration — when they land. `used_by` references `auth.users`
--   directly, so this table can also ship on its own if invitations are needed
--   before the profile table exists.
--
--   Model:
--   * Codes are 6 digits (SCREEN-2 decision). `code_hash` stores an
--     **HMAC-SHA256 keyed with a server-side pepper** (INVITE_CODE_PEPPER, NOT
--     in this DB) — a plain hash of a 6-digit code is broken by a 10^6 rainbow
--     table instantly. Plaintext codes exist only in the admin's create response
--     and the user's input. See lib/auth/invite-codes.ts.
--   * A 6-digit space is only safe behind a hard rate-limit + per-code lockout
--     on the redeem endpoint (SECURITY MASTERPLAN Point 3) — enforce it there.
--   * Server-write-only: RLS on, NO policies ⇒ hard deny for anon +
--     authenticated. The admin endpoint (create) and the redeem endpoint both
--     use the service-role client, which bypasses RLS.
-- ----------------------------------------------------------------------------

create table if not exists public.invitation_codes (
  id           uuid primary key default gen_random_uuid(),
  code_hash    text not null unique,                       -- HMAC-SHA256(normalizeInviteCode(code), INVITE_CODE_PEPPER), hex
  created_by   uuid references auth.users(id) on delete set null,
  used_by      uuid references auth.users(id) on delete set null,
  used_at      timestamptz,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  note         text,
  created_at   timestamptz not null default now(),
  constraint invitation_codes_used_consistent
    check ((used_by is null) = (used_at is null))
);

comment on table public.invitation_codes is
  'Closed-beta invite codes (Point 19). code_hash only; server-write-only via service role.';

alter table public.invitation_codes enable row level security;
-- No policies on purpose — deny-all for anon + authenticated.

revoke update, delete on public.invitation_codes from anon, authenticated;

create index if not exists invitation_codes_expires_at_idx on public.invitation_codes (expires_at);
create index if not exists invitation_codes_used_by_idx    on public.invitation_codes (used_by);

-- ----------------------------------------------------------------------------
-- Redeeming a code (run server-side, service role). Atomic claim so the same
-- code can't be spent twice under a race:
--
--   update public.invitation_codes
--      set used_by = :user_id, used_at = now()
--    where code_hash = :hash
--      and used_at is null
--      and expires_at > now()
--   returning id;
--   -- 0 rows back ⇒ unknown / used / expired (map to AUTH_MESSAGES.invalidInviteCode)
-- ----------------------------------------------------------------------------
