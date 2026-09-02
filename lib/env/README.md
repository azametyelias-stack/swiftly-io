# Environment variables — public vs secret

**SECURITY MASTERPLAN — Point 1 (keys in env) + Point 7 (public vs secret keys).**

Two access modules, one rule each:

| Module | Contains | Reaches the browser? | Read it from |
| --- | --- | --- | --- |
| [`public.ts`](./public.ts) | `NEXT_PUBLIC_*` only — project URL, anon key, GA id, public app URL | **Yes** — inlined into the client bundle at build time | anywhere (client or server) |
| [`server.ts`](./server.ts) | secrets — `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, webhook secrets, `ADMIN_USER_IDS`, … | **Never** | server code only (Route Handlers, Server Components, server actions) |

## The naming rule

- A variable the frontend needs → prefix `NEXT_PUBLIC_`, add it to `publicEnv` in `public.ts`.
  Next.js **inlines** it, so treat it as printed on a billboard. Never a secret.
- Everything else → **no prefix**, add the key to the `ServerEnvKey` union in `server.ts`, read it
  with `serverEnv()` / `requireServerEnv()`.

Static references only: `public.ts` uses `process.env.NEXT_PUBLIC_FOO` literally. A computed
`process.env[key]` is **not** inlined by Next and ships `undefined` to the browser.

## Supabase: two keys, two clients

| Key | Prefix | Client | Bypasses RLS? |
| --- | --- | --- | --- |
| anon / publishable | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + `getAuthClient()` (token verify) | no — RLS applies |
| `service_role` secret | `SUPABASE_SERVICE_ROLE_KEY` | `getServiceClient()` in [`lib/supabase/server.ts`](../supabase/server.ts) (`import "server-only"`) | **yes** — full DB access |

The service-role key in a client bundle = every user's data readable by anyone. That is the
exact failure this split prevents.

## Enforcement (so it can't silently regress)

- `lib/supabase/server.ts` starts with `import "server-only"` → build fails if a Client Component imports it.
- ESLint (`eslint.config.mjs`) bans `@/lib/env/server` and `@/lib/supabase/server` imports from `components/**`.
- `tests/env/separation.test.ts` fails the build if: `public.ts` reads a non-`NEXT_PUBLIC_` var,
  a secret-looking key gets a `NEXT_PUBLIC_` name in `.env.example`, a client file imports a
  server-only module, or a Supabase JWT is hardcoded in source.
- `.env.example` documents which keys are public and which are secret.

## Verifying manually (DevTools — Point 7, step 3)

Run `npm run build && npm start`, open the app, press **F12**:

1. **Sources / Debugger** → search the bundled JS for the service-role key value → **0 hits**.
   (`NEXT_PUBLIC_SUPABASE_ANON_KEY` *will* appear — that is expected and safe.)
2. **Network** → responses carry no `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, etc.
3. **Application → Cookies / Local Storage / Session Storage** → no secret values.
4. **Console** → `Object.keys(process.env)` is not a thing in the browser; only inlined
   `NEXT_PUBLIC_*` literals exist, and only where referenced.

## Vercel (Point 7, step 4)

- Add secrets **without** the `NEXT_PUBLIC_` prefix. Scope them to the environments that need them
  (Production / Preview / Development).
- Only `NEXT_PUBLIC_*` vars are safe to expose; everything else stays server-side.
- Mirror the keys in `.env.example` so the required set stays documented.
