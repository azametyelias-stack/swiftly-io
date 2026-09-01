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

## Required environment variable

The consent endpoints write with the **service-role** key so they can bypass RLS.
Add to `.env.local` (and to the Vercel project env):

```
SUPABASE_SERVICE_ROLE_KEY=<Supabase dashboard → Project Settings → API → service_role secret>
```

Without it the app still runs — consent is stored client-side and the API responds
`{ "data": { "persisted": false } }` with a one-time server warning — but nothing
is written to the database.
