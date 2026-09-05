-- ============================================================================
-- Preferences that actually follow the account — theme 'system'
-- Audit 2026-09-05, point 3.
-- ============================================================================
--
--   `users.theme` accepted only 'light' | 'dark', but the app has always had a
--   third state: the drawer's quick switch cycles Système → Clair → Sombre, and
--   `readThemeChoice()` falls back to "system" when nothing is stored. So the
--   most common state — "follow the OS", the default for every fresh browser —
--   was the one state the account could not record.
--
--   The consequence was a preference that silently lied: picking "Système" in
--   the drawer wrote localStorage and nothing else, so the next device fell
--   back to whatever the row happened to hold, and SCREEN-22's switch showed a
--   value the app was not applying.
--
--   Two changes, both additive:
--     * the check accepts 'system';
--     * the default becomes 'system' for NEW rows, so a fresh account and a
--       fresh browser agree from the first paint instead of disagreeing until
--       the user touches the setting.
-- ----------------------------------------------------------------------------

alter table public.users drop constraint if exists users_theme_check;
alter table public.users add constraint users_theme_check
  check (theme in ('system', 'light', 'dark'));

alter table public.users alter column theme set default 'system';

-- ── the transition ─────────────────────────────────────────────────────────
--
--   From now on the row wins on load, which is the whole point: a preference
--   that does not follow you to a new device is not a preference. But every
--   existing row holds 'light' — the OLD COLUMN DEFAULT, not a choice anyone
--   made, because until today nothing but SCREEN-22 ever wrote this column and
--   SCREEN-22 shipped hours ago. Left alone, "the row wins" would mean every
--   user who picked dark from the drawer (localStorage only, never persisted)
--   silently loses it on their next load.
--
--   So rows still sitting on the old default are moved to 'system': each
--   device keeps painting exactly what it paints today, and the first explicit
--   choice from either control takes over from there.
--
--   ⚠️  ONE-TIME statement, and NOT safe to re-run once the beta has real data:
--   it cannot tell the old default apart from a deliberate "Clair", so a later
--   re-run would reset every explicit light choice to 'system'. The rest of
--   this file is idempotent; this line is not. Delete it once it has run.
--   Today it is safe because the setting is one day old and untouched in
--   production.
update public.users set theme = 'system' where theme = 'light';

comment on column public.users.theme is
  'system | light | dark. "system" = no data-theme attribute, follow the OS (globals.css handles it).';
