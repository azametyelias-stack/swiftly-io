-- Privacy & consent system (GDPR / CCPA)
-- SCREEN-20 (banner), SCREEN-21 (/privacy), SCREEN-22 (/privacy-settings)
--
-- Two tables:
--   consent_logs      append-only audit trail of every consent decision
--   privacy_settings  current consent state per subject (upserted)
--
-- Writes happen server-side only, with the service-role key (RLS bypassed).
-- No anon / authenticated policies are granted.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- consent_logs : immutable audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.consent_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete set null,
  subject_id      text        not null,           -- anonymous sf_sid cookie
  consent_version text        not null,
  essential       boolean     not null,
  analytics       boolean     not null,
  marketing       boolean     not null,
  location        boolean     not null,
  action          text        not null
    check (action in ('accept_all', 'customize', 'reject', 'update')),
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

comment on table public.consent_logs is
  'Append-only GDPR/CCPA consent audit trail. Rows are never updated or deleted.';

create index if not exists consent_logs_subject_id_idx
  on public.consent_logs (subject_id);
create index if not exists consent_logs_user_id_idx
  on public.consent_logs (user_id);
create index if not exists consent_logs_created_at_idx
  on public.consent_logs (created_at desc);

alter table public.consent_logs enable row level security;

-- Enforce append-only at the privilege level too (defence in depth; the
-- service role still bypasses RLS but not table grants applied to it directly).
revoke update, delete, truncate on public.consent_logs from anon, authenticated;

-- ---------------------------------------------------------------------------
-- privacy_settings : current state per subject
-- ---------------------------------------------------------------------------
create table if not exists public.privacy_settings (
  subject_id      text        primary key,
  user_id         uuid references auth.users (id) on delete set null,
  essential       boolean     not null default true,
  analytics       boolean     not null default false,
  marketing       boolean     not null default false,
  location        boolean     not null default false,
  consent_version text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.privacy_settings is
  'Latest consent state per subject. Source of truth is consent_logs; this is a fast-read projection.';

create index if not exists privacy_settings_user_id_idx
  on public.privacy_settings (user_id);

alter table public.privacy_settings enable row level security;

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists privacy_settings_set_updated_at on public.privacy_settings;
create trigger privacy_settings_set_updated_at
  before update on public.privacy_settings
  for each row execute function public.set_updated_at();
