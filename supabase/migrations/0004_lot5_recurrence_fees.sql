-- ============================================================================
-- Lot 5 — recurring templates + monthly account fees (D2)
-- BUILD-PLAN.md § LOT 5 · SCREEN-14 (templates) · SCREEN-17 (frais mensuels)
-- ============================================================================
--
--   D2 (decided 2026-09-03): recurring transactions are materialised by a
--   DAILY server cron (`POST /api/cron/run`, Vercel Cron), never lazily on read
--   and never client-side. Idempotency is a unique key per (rule, day) so a
--   double-fire of the cron cannot create a double prélèvement.
--
--   Added here:
--     * transactions.recurrence_key  — "tpl:<template_id>:<YYYY-MM-DD>" or
--       "fee:<account_id>:<YYYY-MM>". UNIQUE (partial) ⇒ the cron is idempotent.
--     * templates.next_run_on / last_run_on — the recurrence cursor.
--     * accounts.last_fee_on — the monthly-fee cursor.
--     * system category "Frais bancaires" (expense) for the generated fee rows.
--     * public.allocate_to_project() — atomic project allocation (D4): moves
--       money in/out of `projects.allocated_amount` with an insufficient-funds
--       guard, in ONE statement, so concurrent taps can't double-spend.
-- ----------------------------------------------------------------------------

-- ── transactions.recurrence_key ────────────────────────────────────────────
alter table public.transactions
  add column if not exists recurrence_key text;

comment on column public.transactions.recurrence_key is
  'Idempotency key for cron-generated rows (D2). NULL for hand-entered transactions.';

create unique index if not exists transactions_recurrence_key_uq
  on public.transactions (recurrence_key)
  where recurrence_key is not null;

-- ── templates recurrence cursor ───────────────────────────────────────────
alter table public.templates
  add column if not exists next_run_on date,
  add column if not exists last_run_on date;

comment on column public.templates.next_run_on is
  'Next date the daily cron should generate a transaction for this rule. NULL when recurrence = once.';

create index if not exists templates_due_idx
  on public.templates (next_run_on)
  where next_run_on is not null;

-- ── accounts monthly-fee cursor ───────────────────────────────────────────
alter table public.accounts
  add column if not exists last_fee_on date;

comment on column public.accounts.last_fee_on is
  'First-of-month date the last monthly fee was charged. NULL ⇒ never charged.';

-- ── system category for generated bank-fee rows ───────────────────────────
-- `categories` has no unique constraint, so a bare `on conflict do nothing`
-- would let a re-run add a duplicate. Guard on existence instead → idempotent.
insert into public.categories (user_id, name, kind, color, axis)
select null, 'Frais bancaires', 'expense', '#8A8C93', 'consumption'
where not exists (
  select 1 from public.categories
   where user_id is null and name = 'Frais bancaires' and kind = 'expense'
);

-- ============================================================================
-- account_balance() — net project allocations against project-linked spending
-- (🔎 LAYER 3, no double-counting).
--
--   Before: an account's balance subtracted the FULL `projects.allocated_amount`.
--   Problem: an expense transaction "Lié à" the project ALSO reduced the
--   balance, so reserving 100k then spending 50k against the project dropped the
--   balance by 150k.
--   After: the hold is `greatest(0, allocated_amount − Σ settled project-linked
--   expenses)` — the reserve shrinks as you actually spend it. Same shape as the
--   0002 function otherwise (D3 — nothing is stored).
-- ----------------------------------------------------------------------------
create or replace function public.account_balance(p_account_id uuid)
returns bigint
language sql
stable
security invoker
as $$
  with acct as (
    select id, user_id, initial_balance, is_primary
      from public.accounts
     where id = p_account_id
  ),
  tx as (
    select
      coalesce(sum(amount) filter (
        where type = 'income' and status in ('done', 'received')
          and destination_account_id = (select id from acct)
      ), 0)
      - coalesce(sum(amount) filter (
        where type = 'expense' and status = 'done'
          and source_account_id = (select id from acct)
      ), 0)
      + coalesce(sum(amount) filter (
        where type = 'transfer' and destination_account_id = (select id from acct)
      ), 0)
      - coalesce(sum(amount) filter (
        where type = 'transfer' and source_account_id = (select id from acct)
      ), 0) as net
    from public.transactions
    where user_id = (select user_id from acct)
  ),
  alloc as (
    select coalesce(sum(greatest(0,
             p.allocated_amount - coalesce((
               select sum(t.amount)
                 from public.transactions t
                where t.user_id = p.user_id
                  and t.type = 'expense' and t.status = 'done'
                  and t.linked_to_type = 'project' and t.linked_to_id = p.id
             ), 0)
           )), 0) as total
      from public.projects p
     where p.user_id = (select user_id from acct)
       and coalesce(
             p.account_id,
             (select a2.id from public.accounts a2
               where a2.user_id = (select user_id from acct) and a2.is_primary)
           ) = (select id from acct)
  )
  select (select initial_balance from acct)
       + (select net from tx)
       - (select total from alloc);
$$;

-- ============================================================================
-- Atomic project allocation (D4, 🔎 LAYER 3)
--   p_delta > 0 : "Affecter au solde" — refuse if the target account's derived
--                 balance is below p_delta (project allocation is a HARD block,
--                 never a warning — DESIGN-RECONCILIATION D4).
--   p_delta < 0 : "Retirer du solde" — floored so allocated_amount never goes
--                 negative.
--   Runs under the caller's RLS (`security invoker`); the API layer has already
--   proved ownership. `for update` serialises concurrent allocations.
-- ----------------------------------------------------------------------------
create or replace function public.allocate_to_project(
  p_project_id uuid,
  p_delta      bigint
)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_user_id   uuid;
  v_account   uuid;
  v_current   bigint;
  v_balance   bigint;
  v_new       bigint;
begin
  select user_id, allocated_amount,
         coalesce(account_id,
                  (select a.id from public.accounts a
                    where a.user_id = projects.user_id and a.is_primary))
    into v_user_id, v_current, v_account
    from public.projects
   where id = p_project_id
   for update;

  if v_user_id is null then
    raise exception 'project not found' using errcode = 'no_data_found';
  end if;

  v_new := v_current + p_delta;
  if v_new < 0 then
    v_new := 0;
  end if;

  if p_delta > 0 then
    -- account_balance() already subtracts current allocations, so this is the
    -- funds actually available to move.
    select public.account_balance(v_account) into v_balance;
    if v_balance < p_delta then
      raise exception 'insufficient funds' using errcode = 'check_violation';
    end if;
  end if;

  update public.projects
     set allocated_amount = v_new
   where id = p_project_id;

  return v_new;
end;
$$;

comment on function public.allocate_to_project(uuid, bigint) is
  'Atomic project allocation (D4). Raises check_violation when funds are insufficient for a positive delta.';
