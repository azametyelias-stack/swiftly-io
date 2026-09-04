/**
 * Security response headers (SECURITY MASTERPLAN — Point 8: HTTPS Required +
 * hardening headers).
 *
 * The masterplan says "npm install helmet" — that is Express-only. On Next.js the
 * equivalent is the `headers()` key in `next.config.ts`, which is what
 * `buildSecurityHeaders()` feeds. Same intent (HSTS, CSP, X-Frame-Options,
 * X-Content-Type-Options, Referrer-Policy, Permissions-Policy), no new dependency,
 * and it works with statically rendered pages.
 *
 * Pure and dependency-free so it can be unit-tested (`tests/security/headers.test.ts`)
 * and imported from `next.config.ts` without pulling in the app runtime.
 *
 * HTTPS itself: Vercel terminates TLS automatically (Let's Encrypt, auto-renew,
 * HTTP→HTTPS 308 redirect). Nothing to configure here — HSTS just tells browsers
 * to never try HTTP again.
 */

export type HttpHeader = { key: string; value: string };

export type SecurityHeadersOptions = {
  /** Loosen script-src/style-src for the dev server (React uses eval, HMR is inline). */
  isDev?: boolean;
  /** `NEXT_PUBLIC_SUPABASE_URL` — added to connect-src so the browser can reach the DB/API. */
  supabaseUrl?: string;
};

/** Build the Content-Security-Policy value for the given environment. */
export function buildContentSecurityPolicy(options: SecurityHeadersOptions = {}): string {
  const { isDev = false, supabaseUrl } = options;

  const supabaseOrigins: string[] = [];
  if (supabaseUrl) {
    try {
      const { origin, host } = new URL(supabaseUrl);
      supabaseOrigins.push(origin, `wss://${host}`);
    } catch {
      // malformed URL → skip; connect-src just stays 'self' + analytics
    }
  }

  const ga = ["https://www.googletagmanager.com", "https://www.google-analytics.com"];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // GA injects an inline bootstrap <Script>; Next injects an inline runtime.
    // Nonce-based CSP would force every page to dynamic rendering — not worth it for MVP.
    "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "blob:", "data:", ...ga],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...ga, ...supabaseOrigins],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");

  // Force any stray http:// subresource up to https:// — PRODUCTION ONLY.
  // In dev the server is plain HTTP; over a LAN IP (phone testing) browsers do
  // apply this upgrade (localhost is exempt, 192.168.x.x is not), which would
  // rewrite every same-origin asset to https:// and break the page. Prod is
  // always HTTPS via Vercel, so the directive still applies where it matters.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/** The full ordered list of security headers for `next.config.ts` → `headers()`. */
export function buildSecurityHeaders(options: SecurityHeadersOptions = {}): HttpHeader[] {
  return [
    {
      // 2 years, cover subdomains, eligible for the browser preload list.
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    { key: "X-DNS-Prefetch-Control", value: "on" },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(options) },
  ];
}

/** Apply to every route. */
export const SECURITY_HEADERS_SOURCE = "/:path*";
