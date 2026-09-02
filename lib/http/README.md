# `lib/http` — HTTP layer helpers

| Module | Purpose |
| --- | --- |
| `respond.ts` | `ok(data)` / `fail(code, message, status)` — the REST envelope every route returns. |
| `errors.ts` | Typed `ApiError` classes + `toErrorResponse()` (generic 500 for anything unexpected — Point 14). |
| `client.ts` | Browser API client: transparent `TOKEN_EXPIRED` refresh-and-retry (Point 9). |
| `cors.ts` | CORS allow-list — pure logic behind `proxy.ts` (Point 13). |

---

## Generic error messages — SECURITY MASTERPLAN Point 14

> **Never reveal technical detail. Generic message to the user, real error logged
> server-side.**

One collapse point: **`toErrorResponse(err)`** in `errors.ts`.

| Thrown value | Client sees |
| --- | --- |
| an `ApiError` subclass (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `TokenExpiredError`, …) | its own `status` / `code` / `message` — all deliberately generic |
| anything else (`Error`, DB driver failure, `ECONNREFUSED`, a string) | `500 { error: "Une erreur est survenue.", code: "SERVER_ERROR" }` — **dev only** also gets `details.{name,message}` |

Rules:

1. **To send a specific message, throw an `ApiError` subclass.** Its message is
   what the client gets, so keep it generic and non-probing.
2. **Never put `err.message`, `err.stack`, a SQL string, a file path, a connection
   string, or a library version into a response.** Log it (`console.error(...)`)
   and let `toErrorResponse` return the opaque 500. Locked by
   `tests/http/error-leakage.test.ts`.
3. `withAuth` already does this for wrapped handlers: `console.error("[route]", err)`
   then `toErrorResponse(err)`. Hand-written `try/catch` routes (e.g.
   `lib/privacy/endpoint.ts`) do the same — log `err`, respond `fail("SERVER_ERROR",
   "<generic French sentence>", 500)`.
4. **Auth never says which half was wrong.** `UnauthorizedError` is identical for
   missing / malformed / bad-signature / revoked / unknown-user. The login
   endpoint's "e-mail ou mot de passe incorrect" (same message + constant time for
   *user-not-found* and *wrong-password*) is **Point 16**, wired with the auth
   screens.
5. Framework fingerprinting is off: `poweredByHeader: false` in `next.config.ts`
   (no `X-Powered-By`).

### Tests

- `tests/auth/errors.test.ts` — `toErrorResponse` behaviour: `ApiError`
  passthrough, unknown → generic 500 with no leak in production, `details` in dev,
  auth message doesn't distinguish the cause.
- `tests/http/error-leakage.test.ts` — repo scan: no route feeds `err.message` /
  `.stack` into `Response.json` / `fail` / `ok`.

---

## CORS — SECURITY MASTERPLAN Point 13

> **Whitelist strict — only first-party front-ends may read an API response.**

The masterplan describes `npm install cors` + `app.use(cors(...))`. That is Express.
Next.js 16 has no Express app; the equivalent is **`proxy.ts`** (the renamed
`middleware`) at the repo root, scoped to `/api/:path*`.

### How it's split

- **`lib/http/cors.ts`** — pure, dependency-free (no `@/`, no `next/*`). The single
  source of truth for the allow-list and the header logic. Unit-tested in
  `tests/http/cors.test.ts`.
- **`proxy.ts`** — turns a `evaluateCors()` decision into a `Response`: answers
  preflights (`204` allowed / `403` blocked), attaches `Access-Control-*` headers
  to real responses, and `console.warn`s every blocked cross-origin attempt.

### Allowed origins

| Environment | Origins |
| --- | --- |
| `development` | `http://localhost:3000`, `http://localhost:3001` |
| `production` (default for anything not `development`) | `https://swiftly.io`, `https://www.swiftly.io`, `https://app.swiftly.io`, `https://admin.swiftly.io` |
| preview / staging | set `CORS_ALLOWED_ORIGINS` (comma-separated) — it **replaces** the built-in list |

Rules baked into `cors.ts` (and locked by the tests):

1. **No wildcard.** `Access-Control-Allow-Origin: *` is never emitted — it is
   incompatible with `Access-Control-Allow-Credentials: true` and defeats the
   allow-list. An unknown origin simply gets no ACAO header and the browser blocks
   the read.
2. **Credentials on** (`Access-Control-Allow-Credentials: true`) so cookie-bearing
   requests (`sf_sid`, `sf_consent`, and later `@supabase/ssr` session cookies) work
   for allowed origins.
3. **Echo the exact origin**, never a normalised or wildcarded value, and always
   send `Vary: Origin` so shared caches don't leak one origin's response to another.
4. Preflight `Access-Control-Allow-Methods` = `GET, POST, PUT, PATCH, DELETE, OPTIONS`;
   `Access-Control-Allow-Headers` reflects the browser's
   `Access-Control-Request-Headers`, falling back to `Content-Type, Authorization`.
5. **No blocklist.** An allow-list already denies everything not on it; maintaining a
   separate list of "known bad" origins adds nothing.

Non-browser callers (curl, server-to-server, health checks) send no `Origin`; they
are neither blocked nor logged here — they are still gated by `authenticate()`
(Point 6) and rate limiting (Point 3) in the route handler.

### Adding an origin

Edit `ORIGINS_BY_ENV` in `lib/http/cors.ts` (permanent) **or** set
`CORS_ALLOWED_ORIGINS` in the Vercel environment (per-deployment, no code change).

### Verifying (Point 13 checklist)

```bash
# allowed → echoed back
curl -sI -X OPTIONS https://swiftly.io/api/privacy/consent \
  -H 'Origin: https://swiftly.io' \
  -H 'Access-Control-Request-Method: POST'
# → HTTP/2 204 ; access-control-allow-origin: https://swiftly.io ; access-control-allow-credentials: true

# random domain → rejected (403, no ACAO)
curl -sI -X OPTIONS https://swiftly.io/api/privacy/consent \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: POST'
# → HTTP/2 403 ; (no access-control-allow-origin header)
```
