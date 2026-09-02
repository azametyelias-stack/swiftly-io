-- ============================================================================
-- Core application schema  —  BUILD-PLAN.md § P1
-- SECURITY MASTERPLAN Point 4 (RLS) · replaces the template supabase/rls-core-tables.sql
-- ============================================================================
--
--   Tables: users, accounts, categories, people, transactions, templates,
--           budgets, projects, alerts, reports
--
--   Money convention (DESIGN-RECONCILIATION.md D1 — symbol-only, no FX at MVP):
--     * All amounts are stored as `bigint`, in whole XOF francs (XOF has no
--       sub-unit). `accounts.currency` is a DISPLAY LABEL ONLY at MVP — every
--       amount in the system is XOF. Real multi-currency + conversion is Phase 2.
--
--   Balance convention (DESIGN-RECONCILIATION.md D3 — always derived):
--     * There is NO `balance` column anywhere. An account's balance is computed
--       by `public.account_balance(account_id)` from its transactions and project
--       allocations. Editing/deleting a transaction changes the result with no
--       reconciliation step.
--
--   RLS: every table below is owner-scoped (`user_id = auth.uid()`) except
--   `categories`, whose system rows (`user_id is null`) are world-readable.
--   Policies are written out explicitly per table (not a loop) so
--   tests/db/rls.test.ts sees a literal `enable row level security` per table.
--
--   API layer still does its own checks (supabase/README.md → Backend
--   verification): resolve user id from the session, never from the body.
-- ----------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- `public.set_updated_at()` already exists (0001_privacy_consent.sql). Re-assert
-- it here so this migration is self-contained if 0001 is ever squashed.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- users  —  1 row per auth.users, owner column is `id`
-- ============================================================================
create table if not exists public.users (
  id                 uuid        primary key references auth.users (id) on delete cascade,
  name               text        not null check (char_length(btrim(name)) >= 2),
  preferred_currency text        not null default 'XOF' check (preferred_currency in ('XOF', 'EUR', 'USD')),
  theme              text        not null default 'light' check (theme in ('light', 'dark')),
  language           text        not null default 'fr' check (language in ('fr', 'en')),
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.users is
  'Profile row completing auth.users. Created by POST /api/auth/profile after the invite code is redeemed (SCREEN-3).';

alter table public.users enable row level security;

create policy "users_select_self" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_self" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_self" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No delete policy: account deletion goes through the GDPR erasure flow, not a client DELETE.

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ============================================================================
-- accounts  —  SCREEN-17. Compte Principal auto-created at 0 F on sign-up (D5).
-- ============================================================================
create table if not exists public.accounts (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  name            text        not null check (char_length(btrim(name)) >= 1),
  type            text        not null check (type in ('cash', 'mobile', 'bank', 'card')),
  initial_balance bigint      not null default 0,
  currency        text        not null default 'XOF' check (currency in ('XOF', 'EUR', 'USD')),
  provider        text,                       -- mobile: 'Wave', 'Orange Money', 'Moov Money', ...
  card_network    text,                       -- card: 'visa', 'mastercard', 'amex', 'other'
  account_number  text,                       -- bank: optional at MVP
  monthly_fee     bigint      check (monthly_fee is null or monthly_fee >= 0),  -- bank/card, optional
  fee_type        text        check (fee_type in ('fixed', 'percent')),
  is_primary      boolean     not null default false,
  is_favorite     boolean     not null default false,
  is_archived     boolean     not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint accounts_fee_consistent check ((monthly_fee is null) = (fee_type is null))
);

comment on table public.accounts is
  'Fictional accounts (no real bank link at MVP). Balance is derived — see public.account_balance().';

-- exactly one primary account per user
create unique index if not exists accounts_one_primary_per_user
  on public.accounts (user_id) where is_primary;
create index if not exists accounts_user_id_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts_delete_own" on public.accounts
  for delete using (auth.uid() = user_id);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ============================================================================
-- categories  —  user_id NULLABLE. NULL = system category (world-readable,
-- client-unwritable). `axis` is the scoring hint; the definitive scoring model
-- (investment/consumption, active/passive) is finalised in Lot 4 (see D6).
-- ============================================================================
create table if not exists public.categories (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users (id) on delete cascade,   -- NULL = system
  name       text        not null check (char_length(btrim(name)) >= 1),
  kind       text        not null check (kind in ('expense', 'income')),
  color      text        not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  axis       text        check (axis in ('investment', 'consumption', 'active', 'passive')),
  is_system  boolean     generated always as (user_id is null) stored,
  created_at timestamptz not null default now()
);

comment on table public.categories is
  'Category owns its hue (charts are legible without a legend). System rows (user_id null) are seeded below; hues beyond the 5 documented in "Documentation développeurs" are PROVISIONAL — confirm against Lot 3/4.';

create index if not exists categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy "categories_select_own_or_system" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- people  —  "Lié à" targets on the person side (SCREEN-8/9).
-- ============================================================================
create table if not exists public.people (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null check (char_length(btrim(name)) >= 1),
  created_at timestamptz not null default now()
);

create index if not exists people_user_id_idx on public.people (user_id);

alter table public.people enable row level security;

create policy "people_select_own" on public.people
  for select using (auth.uid() = user_id);
create policy "people_insert_own" on public.people
  for insert with check (auth.uid() = user_id);
create policy "people_update_own" on public.people
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "people_delete_own" on public.people
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- projects  —  SCREEN-16. Allocations move money OUT of available balance
-- WITHOUT creating a transaction (D4). Refused client/server-side if the
-- account balance is insufficient.
-- ============================================================================
create table if not exists public.projects (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  name             text        not null check (char_length(btrim(name)) >= 1),
  description      text        not null default '',
  category         text        not null default 'other',
  target_amount    bigint      check (target_amount is null or target_amount > 0),   -- NULL = no progress bar
  allocated_amount bigint      not null default 0 check (allocated_amount >= 0),
  start_date       date,
  end_date         date,
  status           text        not null default 'active' check (status in ('active', 'done', 'paused', 'onhold')),
  account_id       uuid        references public.accounts (id) on delete set null,   -- NULL = primary account
  is_favorite      boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

create policy "projects_select_own" on public.projects
  for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================================================
-- templates  —  SCREEN-14. Pre-filled transaction. The transaction form's
-- "recurrence" toggle (D2bis) also lives here: a recurring rule = a template
-- whose `recurrence` <> 'once'. Execution timing is D2 (decided at Lot 5).
-- ============================================================================
create table if not exists public.templates (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users (id) on delete cascade,
  name           text        not null check (char_length(btrim(name)) >= 1),
  description   text        not null default '',
  kind           text        not null check (kind in ('expense', 'income')),
  amount         bigint      not null check (amount > 0),
  category_id    uuid        references public.categories (id) on delete set null,
  linked_to_type text        check (linked_to_type in ('person', 'project')),
  linked_to_id   uuid,
  account_id     uuid        references public.accounts (id) on delete set null,
  recurrence     text        not null default 'once' check (recurrence in ('once', 'daily', 'monthly')),
  usage_count    integer     not null default 0 check (usage_count >= 0),
  is_favorite    boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint templates_linked_to_consistent check ((linked_to_type is null) = (linked_to_id is null))
);

create index if not exists templates_user_id_idx on public.templates (user_id);

alter table public.templates enable row level security;

create policy "templates_select_own" on public.templates
  for select using (auth.uid() = user_id);
create policy "templates_insert_own" on public.templates
  for insert with check (auth.uid() = user_id);
create policy "templates_update_own" on public.templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "templates_delete_own" on public.templates
  for delete using (auth.uid() = user_id);

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- transactions  —  SCREEN-6/7/8/9/10. One table, three types.
--   expense : source_account_id set, category on the expense side
--   income  : destination_account_id set, category on the income side
--   transfer: both accounts set, source <> destination, no category, no "lié à"
-- ============================================================================
create table if not exists public.transactions (
  id                     uuid        primary key default gen_random_uuid(),
  user_id                uuid        not null references auth.users (id) on delete cascade,
  type                   text        not null check (type in ('expense', 'income', 'transfer')),
  amount                 bigint      not null check (amount > 0),
  occurred_on            date        not null default current_date,
  category_id            uuid        references public.categories (id) on delete set null,
  scoring_axis           text        check (scoring_axis in ('investment', 'consumption', 'active', 'passive')),
  source_account_id      uuid        references public.accounts (id) on delete restrict,
  destination_account_id uuid        references public.accounts (id) on delete restrict,
  linked_to_type         text        check (linked_to_type in ('person', 'project')),
  linked_to_id           uuid,
  note                   text        check (note is null or char_length(note) <= 500),
  status                 text        not null default 'done'
                                     check (status in ('done', 'planned', 'refunded', 'received')),
  recurrence             text        not null default 'once' check (recurrence in ('once', 'daily', 'monthly')),
  template_id            uuid        references public.templates (id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  constraint tx_linked_to_consistent check ((linked_to_type is null) = (linked_to_id is null)),
  constraint tx_accounts_by_type check (
    (type = 'expense'  and source_account_id is not null and destination_account_id is null) or
    (type = 'income'   and destination_account_id is not null and source_account_id is null) or
    (type = 'transfer' and source_account_id is not null and destination_account_id is not null
                        and source_account_id <> destination_account_id)
  ),
  constraint tx_transfer_has_no_category check (type <> 'transfer' or (category_id is null and linked_to_type is null)),
  -- "Lié à" is required for income at the app layer (SCREEN-9); not hard-enforced
  -- here so a plain salary without a named source is still insertable.
  constraint tx_status_by_type check (
    (type = 'income'  and status in ('done', 'planned', 'received')) or
    (type = 'expense' and status in ('done', 'planned', 'refunded')) or
    (type = 'transfer' and status = 'done')
  )
);

comment on table public.transactions is
  'expense/income/transfer. Amounts in whole XOF. Only status in (done, received) count toward the derived balance; planned does not.';

create index if not exists transactions_user_id_idx      on public.transactions (user_id);
create index if not exists transactions_user_date_idx     on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_source_acct_idx   on public.transactions (source_account_id);
create index if not exists transactions_dest_acct_idx     on public.transactions (destination_account_id);
create index if not exists transactions_category_idx      on public.transactions (category_id);
create index if not exists transactions_linked_to_idx     on public.transactions (linked_to_type, linked_to_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- budgets  —  SCREEN-15. Monthly, one per category. Colour thresholds
-- 50 / 91 / 92 % and the 92 % alert live in the app, not here.
-- ============================================================================
create table if not exists public.budgets (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users (id) on delete cascade,
  category_id      uuid        not null references public.categories (id) on delete cascade,
  allocated_amount bigint      not null check (allocated_amount > 0),
  is_favorite      boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, category_id)
);

create index if not exists budgets_user_id_idx on public.budgets (user_id);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- alerts  —  SCREEN-18 inbox. Persistent items only (not transient toasts).
-- ============================================================================
create table if not exists public.alerts (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('alert', 'scheduled')),
  title      text        not null,
  body       text        not null default '',
  link_type  text        check (link_type in ('budget', 'report', 'project', 'transaction')),
  link_id    uuid,
  read       boolean     not null default false,
  created_at timestamptz not null default now(),
  constraint alerts_link_consistent check ((link_type is null) = (link_id is null))
);

create index if not exists alerts_user_unread_idx on public.alerts (user_id, read, created_at desc);

alter table public.alerts enable row level security;

create policy "alerts_select_own" on public.alerts
  for select using (auth.uid() = user_id);
create policy "alerts_insert_own" on public.alerts
  for insert with check (auth.uid() = user_id);
create policy "alerts_update_own" on public.alerts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "alerts_delete_own" on public.alerts
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- reports  —  SCREEN-12. Auto-generated monthly/annual. `payload` holds the
-- computed figures. MVP scope of the payload is D6 (decided at Lot 4).
-- ============================================================================
create table if not exists public.reports (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  period_type  text        not null check (period_type in ('monthly', 'annual')),
  period_start date        not null,                 -- first day of the month / year
  payload      jsonb       not null default '{}'::jsonb,
  read         boolean     not null default false,
  generated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

create index if not exists reports_user_idx on public.reports (user_id, period_start desc);

alter table public.reports enable row level security;

create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);
create policy "reports_update_own" on public.reports
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- Derived balance  (D3, handoff rule 1)
--   solde = initial_balance
--         + Σ income  landing in the account   (status done/received)
--         − Σ expense leaving the account       (status done)
--         + Σ transfer in  − Σ transfer out
--         − Σ project allocations tied to the account (account_id, or primary if null)
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
    select coalesce(sum(p.allocated_amount), 0) as total
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

comment on function public.account_balance(uuid) is
  'Derived account balance (D3). No balance is ever stored. RLS on the underlying tables still applies (security invoker).';

-- ============================================================================
-- Seed — system categories (user_id null)
--   The 5 hues below are the canonical ones from "Documentation développeurs"
--   (§ Catégories — teintes fixes). "Autre" is neutral. Additional system
--   categories get added once their hues are confirmed against Lot 3/4.
-- ----------------------------------------------------------------------------
insert into public.categories (user_id, name, kind, color, axis) values
  (null, 'Alimentation', 'expense', '#29ABE2', 'consumption'),
  (null, 'Transport',    'expense', '#A3121A', 'consumption'),
  (null, 'Loisirs',      'expense', '#152BC7', 'consumption'),
  (null, 'Loyer',        'expense', '#F5A524', 'consumption'),
  (null, 'Autre',        'expense', '#8A8C93', null),
  (null, 'Salaire',      'income',  '#006B3C', 'active'),
  (null, 'Autre',        'income',  '#8A8C93', null)
on conflict do nothing;
