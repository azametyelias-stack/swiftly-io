-- ============================================================================
-- Lot 6 — SCREEN-18 (Alertes & Notifications)
-- BUILD-PLAN.md § LOT 6 · artboard `Swiftly - Lot 7 Comptes & Notifications`
-- ============================================================================
--
--   `public.alerts` was created in 0002 with the inbox's *identity* columns
--   (kind / title / body / link / read). Rendering the screen needs three more
--   things that cannot be derived at read time:
--
--     * value + tone — the coloured chip on the right of every row ("+16 %",
--       "92 %", "70/1000", "Prêt"). The artboard is explicit that there are four
--       tones, not three: a neutral grey for purely informative notifications,
--       "sans lui, un rapport disponible serait obligé de se colorer en vert et
--       diluerait la bonne nouvelle".
--
--     * facts — the labelled rows of the detail screen ("Budget concerné",
--       "Limite du mois", …). These are a SNAPSHOT, deliberately: an alert is a
--       historical record, so it must keep the limit that was in force when it
--       fired, not the one the budget carries today. Joining live rows at read
--       time would silently rewrite history.
--
--     * dedup_key — see below.
--
--   Everything here is additive (`add column if not exists`), so 0002 databases
--   already in use migrate without a rewrite.
-- ----------------------------------------------------------------------------

alter table public.alerts
  add column if not exists value      text,
  add column if not exists tone       text  not null default 'neutral',
  add column if not exists facts      jsonb not null default '[]'::jsonb,
  add column if not exists dedup_key  text;

comment on column public.alerts.value is
  'Short chip shown at the right of the row ("+16 %", "70/1000"). NULL = no chip.';
comment on column public.alerts.tone is
  'Colour of that chip. SCREEN-18 § 6 plus the neutral the artboard adds.';
comment on column public.alerts.facts is
  'Snapshot of the labelled facts of the detail screen: [{"label":…,"value":…}].';

alter table public.alerts drop constraint if exists alerts_tone_valid;
alter table public.alerts add constraint alerts_tone_valid
  check (tone in ('danger', 'warn', 'success', 'neutral'));

-- Facts must be an ARRAY of objects — a bare object or a string would render as
-- nothing on the detail screen, and the writer is server-side code, so the
-- cheapest place to catch a mistake is here.
alter table public.alerts drop constraint if exists alerts_facts_is_array;
alter table public.alerts add constraint alerts_facts_is_array
  check (jsonb_typeof(facts) = 'array');

-- ── idempotent generation ──────────────────────────────────────────────────
--
--   Alerts are written by the daily cron (`lib/recurrence/service.ts`), which
--   re-examines every budget every day. Until now it guarded against duplicates
--   by SELECTing an existing row and skipping — two problems:
--     1. racy: two cron invocations both see "none" and both insert;
--     2. it allowed exactly one alert per budget per month, so a budget that
--        crossed 92 % and *later* went over its limit could only ever report
--        the first of the two — the artboard shows both as distinct rows.
--
--   A unique key per (user, event) moves the guarantee into the database, where
--   a race cannot get around it. Shape: "budget:<id>:<YYYY-MM>:<threshold>".
--   Partial, so hand-written alerts (dedup_key NULL) are unconstrained.
create unique index if not exists alerts_dedup_key_uq
  on public.alerts (user_id, dedup_key)
  where dedup_key is not null;

comment on column public.alerts.dedup_key is
  'Idempotency key for cron-generated alerts. NULL for one-off alerts.';

-- Feeding the inbox: unread-first is already covered by alerts_user_unread_idx;
-- this one serves the plain reverse-chronological listing and the kind filter.
create index if not exists alerts_user_created_idx
  on public.alerts (user_id, created_at desc);
