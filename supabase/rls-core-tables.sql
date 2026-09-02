-- ============================================================================
-- RLS policies for the CORE application tables
-- SECURITY MASTERPLAN — Point 4 (Row-Level Security)
-- ============================================================================
--
--   ⚠️ SUPERSEDED (2026-09-02) by supabase/migrations/0002_core_schema.sql,
--   which creates the core tables AND writes these policies inline (explicit
--   per-table statements, so tests/db/rls.test.ts can verify them). This file
--   is kept for reference / history only — do not apply it separately.
--
--   STATUS: TEMPLATE — *not* a migration, not run by `supabase db push`.
--
--   The core schema (users, accounts, transactions, …) is created by
--   PROMPT #PAYMENT (Day 9). Apply THIS file immediately after that migration
--   — either append these statements to the schema migration, or paste this
--   whole file into the Supabase SQL editor once the tables exist.
--
-- ----------------------------------------------------------------------------
-- Model
-- ----------------------------------------------------------------------------
--   * Auth is Supabase Auth. `auth.uid()` returns the caller's user id (the
--     `sub` claim of their JWT), or NULL for anon.
--   * Every core table has an owner column: `user_id uuid references auth.users`.
--     The exception is `public.users` whose own primary key `id` IS the owner.
--   * RLS is the SECOND line of defence. The FIRST is the API layer: every
--     route handler must still scope queries by the authenticated user id and
--     never trust a `user_id` coming from the request body (see
--     `docs` / supabase/README.md → "Backend verification").
--   * The service-role key BYPASSES RLS. Only trusted server code uses it
--     (e.g. the consent audit trail, reconciliation jobs). Never ship it to the
--     browser and never use it to serve user-supplied filters unscoped.
--
-- ----------------------------------------------------------------------------
-- Convention for every NEW table from now on
-- ----------------------------------------------------------------------------
--   1. `alter table public.<t> enable row level security;` in the same
--      migration as the `create table` (enforced by tests/db/rls.test.ts).
--   2. Add the 4 owner policies below (select / insert / update / delete).
--   3. If the table is server-write-only (like consent_logs), enable RLS and
--      add NO policies — that is a hard deny for anon + authenticated.
-- ============================================================================

-- Helper: assert the row belongs to the caller. Kept as a plain expression
-- below rather than a function so the planner can use indexes on user_id.

-- ----------------------------------------------------------------------------
-- public.users  — 1 row per auth.users, owner column is `id`
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;

create policy "users_select_self" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy: account deletion goes through a server-side RPC / the
-- GDPR erasure flow, not a direct client DELETE.

-- ----------------------------------------------------------------------------
-- Owner-scoped tables: user_id = auth.uid()
--   accounts, transactions, budgets, projects, templates, people, alerts,
--   reports
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  owned_tables text[] := array[
    'accounts', 'transactions', 'budgets', 'projects',
    'templates', 'people', 'alerts', 'reports'
  ];
begin
  foreach t in array owned_tables loop
    execute format('alter table public.%I enable row level security;', t);

    execute format($f$
      create policy "%1$s_select_own" on public.%1$I
        for select using (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_insert_own" on public.%1$I
        for insert with check (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_update_own" on public.%1$I
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t);

    execute format($f$
      create policy "%1$s_delete_own" on public.%1$I
        for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- public.categories — user_id is NULLABLE (NULL = system/default category,
-- readable by everyone, writable by nobody through the client)
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;

create policy "categories_select_own_or_system" on public.categories
  for select using (user_id is null or auth.uid() = user_id);

create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);

create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- refresh_tokens — NOTHING TO DO HERE
-- ----------------------------------------------------------------------------
-- Supabase Auth stores refresh tokens in the `auth` schema (auth.refresh_tokens),
-- which is already locked down and not exposed via PostgREST. Do NOT create a
-- `public.refresh_tokens` table. If a custom token store is ever introduced it
-- must be server-write-only: enable RLS, add no policies.

-- ----------------------------------------------------------------------------
-- Manual verification (run as an authenticated user, e.g. via the JS client)
-- ----------------------------------------------------------------------------
--   -- returns only the caller's rows:
--   select count(*) from public.transactions;
--   -- returns 0 (RLS hides other users' rows):
--   select count(*) from public.transactions where user_id <> auth.uid();
--   -- fails the WITH CHECK (cannot insert a row owned by someone else):
--   insert into public.accounts (user_id, name, type, balance)
--     values ('00000000-0000-0000-0000-000000000000', 'x', 'Cash', 0);
