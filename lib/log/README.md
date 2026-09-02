# `lib/log` — structured logging

SECURITY MASTERPLAN — **Point 15: Logging (No Secrets).**
Log actions, **never** passwords / tokens / keys.

## Why not `winston` + `winston-daily-rotate-file`

The masterplan sketch uses winston with a daily-rotating **file** transport.
Swiftly.io runs on **Vercel serverless functions**: no persistent writable
filesystem, so a file transport writes logs nowhere retrievable.

The platform-native path:

| Need | Swiftly.io |
| --- | --- |
| Where logs go | structured **JSON on stdout/stderr** → Vercel log drains (any host can pipe them onward) |
| Rotation / retention | the platform's concern, not the app's |
| Error aggregation + alerting | **Sentry** (`SENTRY_DSN`) — wired in the dedicated monitoring session (FEATURES-SCAN "System 5: MONITORING & ALERTING", Day 29) |
| Masking secrets | `redact()` in `logger.ts` — **built now**, this is the part that matters |

## API

```ts
import { log } from "@/lib/log/logger";

log.info("auth.login_ok", { userId, email });      // email → el***@swiftly.io
log.warn("security.rate_limited", { ip, endpoint, attempts });
log.error("route.unhandled_error", { err });        // Error → {name,message,stack}, secrets scrubbed
```

- `event` — a short stable slug (`domain.thing_happened`), not a sentence.
- `meta` — structured context. **Always run through `redact()`** before serialising.
- Output — one JSON line: `{"ts":"…","level":"info","event":"…","meta":{…}}`.
- `LOG_LEVEL` env (`debug|info|warn|error`, default `info`) sets the threshold.

## Redaction (`maskSensitiveData`, Point 15 step 3)

`redact(value)` deep-copies and:

| Rule | Example |
| --- | --- |
| **Drop** any key containing `password`, `token`, `secret`, `authorization`, `api_key`, `credential`, `jwt`, `cookie`, `service_role`, `anon_key`, `private_key`, `cvv`, `pin`, `otp`, … | `{ access_token: "…" }` → `{ access_token: "[REDACTED]" }` |
| **Mask** `email`-ish keys | `elias@swiftly.io` → `el***@swiftly.io` |
| **Mask** `phone`-ish keys | `+22890123456` → `+2***3456` |
| **Scrub** secret-shaped substrings out of free text (JWT `eyJ…`, `sk_`/`pk_`/`whsec_` keys, `SG.` SendGrid, `bearer …`) | inside any string value or `Error.message`/`.stack` |
| `Error` → `{ name, message, stack }` (stack kept — it's server-side, not a client response) | — |
| cycle-safe (`[Circular]`), depth-bounded (`[Truncated]` at 6) | — |

`redact` is defence-in-depth. The rule still stands: **pass only what you mean to
log.** Don't hand the logger a whole request body or user record.

## Enforcement

- `eslint.config.mjs` — `no-console: error` for `app/`, `lib/`, `components/`,
  `proxy.ts` (allowed only in `lib/log/`). Use `log.*`.
- `tests/log/logger.test.ts` — masking, deny-list at depth, cycle safety, a
  realistic auth payload proven to leak **no** credential through the logger.

## Wired call sites (Point 15)

`lib/auth/guard.ts` (`logSecurityEvent`), `lib/auth/with-auth.ts`,
`lib/auth/authenticate.ts`, `lib/supabase/server.ts`, `lib/privacy/endpoint.ts`,
`lib/privacy/audit.ts`, `proxy.ts`, `components/privacy/ConsentProvider.tsx`.

## Deferred to the monitoring session (Day 29)

Sentry SDK + error boundary, alert routing (critical errors → Elias), request/
response access logging, log-based metrics. This module is the seam they plug into.
