/**
 * CORS allow-list (SECURITY MASTERPLAN — Point 13).
 *
 * Swiftly.io's API is first-party only: it is called by the Swiftly.io web app
 * and nothing else. This module is the single source of truth for which origins
 * the browser is allowed to read an API response from.
 *
 * It is pure and dependency-free (no `@/` imports, no `next/*`, no side effects)
 * so it is unit-tested directly with `node --test` AND can be imported from
 * `proxy.ts`, which runs at the network edge before any route handler.
 *
 * There is deliberately **no wildcard branch**. An unknown origin gets no
 * `Access-Control-Allow-Origin` header at all, so the browser blocks the
 * response. `Access-Control-Allow-Origin: *` is never emitted — it is
 * incompatible with `Access-Control-Allow-Credentials: true` and would defeat
 * the point of an allow-list.
 */

type Env = Record<string, string | undefined>;

/** Methods the API exposes. Mirrors the REST conventions doc. */
export const CORS_ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/** Request headers the browser may send cross-origin. `Authorization` = Bearer JWT. */
export const CORS_ALLOWED_HEADERS = "Content-Type, Authorization";

/** How long the browser may cache a preflight result. */
export const CORS_MAX_AGE_SECONDS = 600; // 10 min

/**
 * Built-in origin lists per environment (from the SECURITY MASTERPLAN).
 * Preview / staging deployments override this with `CORS_ALLOWED_ORIGINS`.
 */
const ORIGINS_BY_ENV = {
  development: ["http://localhost:3000", "http://localhost:3001"],
  production: [
    "https://swiftly.io",
    "https://www.swiftly.io",
    "https://app.swiftly.io",
    "https://admin.swiftly.io",
  ],
} as const;

/** Split a comma/whitespace separated origin list; trim, drop blanks + trailing `/`. */
export function parseOriginList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/**
 * The effective allow-list.
 *
 * `CORS_ALLOWED_ORIGINS` (comma-separated env var), when set, **replaces** the
 * built-in list — this is how a preview or staging deployment declares its own
 * origins without a code change. Otherwise the list is chosen by `NODE_ENV`
 * (anything that isn't `development` is treated as production: strictest wins).
 */
export function allowedOrigins(env: Env = process.env): string[] {
  const override = parseOriginList(env.CORS_ALLOWED_ORIGINS);
  if (override.length > 0) return override;
  const mode = env.NODE_ENV === "development" ? "development" : "production";
  return [...ORIGINS_BY_ENV[mode]];
}

/** True only for an exact match against {@link allowedOrigins}. */
export function isAllowedOrigin(origin: string | null | undefined, env: Env = process.env): boolean {
  if (!origin) return false;
  return allowedOrigins(env).includes(origin.replace(/\/+$/, ""));
}

export type CorsDecision = {
  /** The request carries an `Origin` we recognise. */
  allowed: boolean;
  /** The request carries an `Origin` header at all (i.e. it is cross-origin-ish). */
  hasOrigin: boolean;
  /** CORS preflight: `OPTIONS` + `Access-Control-Request-Method`. */
  isPreflight: boolean;
  /** Headers to merge onto the response. Never contains `*`. */
  headers: Record<string, string>;
};

type RequestLike = {
  method: string;
  headers: { get(name: string): string | null };
};

/**
 * Decide what CORS headers a request should get. Pure — no I/O, no logging.
 * `proxy.ts` turns this into an actual `Response`.
 */
export function evaluateCors(request: RequestLike, env: Env = process.env): CorsDecision {
  const origin = request.headers.get("origin");
  const hasOrigin = Boolean(origin);
  const allowed = isAllowedOrigin(origin, env);
  const isPreflight =
    request.method === "OPTIONS" && request.headers.get("access-control-request-method") !== null;

  // `Vary: Origin` always — the response body/headers depend on the Origin, so
  // shared caches must key on it.
  const headers: Record<string, string> = { Vary: "Origin" };

  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (isPreflight) {
    headers["Access-Control-Allow-Methods"] = CORS_ALLOWED_METHODS;
    headers["Access-Control-Allow-Headers"] =
      request.headers.get("access-control-request-headers") ?? CORS_ALLOWED_HEADERS;
    headers["Access-Control-Max-Age"] = String(CORS_MAX_AGE_SECONDS);
  }

  return { allowed, hasOrigin, isPreflight, headers };
}
