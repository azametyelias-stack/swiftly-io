# Transport security & response headers

**SECURITY MASTERPLAN — Point 8: HTTPS Required.**

## HTTPS / TLS — handled by the platform

Vercel terminates TLS for every deployment:

- Free certificate via **Let's Encrypt**, auto-renewed.
- Plain `http://` requests get a **308 redirect** to `https://`.
- HTTP/2 + HTTP/3.

Nothing to build for the certificate. Custom domain `swiftly.io`: add it in Vercel →
Domains, point DNS, the cert is issued automatically.

## Response headers — `next.config.ts`

The masterplan says `npm install helmet`. Helmet is Express-only; the Next.js
equivalent is the `headers()` key in `next.config.ts`. [`headers.ts`](./headers.ts)
(`buildSecurityHeaders`) builds the list; `next.config.ts` applies it to `/:path*`.

| Header | Value | Purpose |
| --- | --- | --- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Browser refuses HTTP for 2 years, all subdomains. |
| `Content-Security-Policy` | see below | Blocks XSS / injection / clickjacking. |
| `X-Frame-Options` | `DENY` | No framing (legacy backstop for CSP `frame-ancestors`). |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak full URLs cross-origin. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Deny powerful APIs. |
| `X-DNS-Prefetch-Control` | `on` | Perf; harmless. |

`poweredByHeader: false` also removes `X-Powered-By: Next.js`.

### About HSTS `preload`

`preload` makes the domain eligible for the [browser preload list](https://hstspreload.org/)
— **irreversible-ish** (removal takes months). Fine for `swiftly.io` which is HTTPS-only
from day one. Drop `preload` if you ever need an HTTP subdomain.

### CSP

Nonce-less policy (a nonce forces every page to dynamic rendering — not worth it for
MVP). `'unsafe-inline'` is allowed for scripts/styles because GA ships an inline
bootstrap and Next injects an inline runtime; `'unsafe-eval'` is **dev-only**.
Allowed external origins: Google Analytics (`googletagmanager.com`,
`google-analytics.com`) and the Supabase project URL (added to `connect-src` as
`https://` + `wss://` from `NEXT_PUBLIC_SUPABASE_URL` at build time).

When adding a third-party script/API later, add its origin to the right directive in
`buildContentSecurityPolicy()` and add a test case.

## Verifying (Point 8, step 4)

After deploy:

1. Open `https://swiftly.io` → padlock 🔒 → "Certificate valid".
2. `https://www.ssllabs.com/ssltest/` → target **A / A+**.
3. `https://securityheaders.com/` → target **A+** (all headers above present).
4. `curl -sI https://swiftly.io | grep -i 'strict-transport\|content-security\|x-frame'` → all present.
5. `curl -sI http://swiftly.io` → `HTTP/1.1 308` to the `https://` URL.
