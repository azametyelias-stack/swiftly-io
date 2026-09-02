import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { evaluateCors } from "@/lib/http/cors";
import { log } from "@/lib/log/logger";

/**
 * Proxy (Next.js 16's renamed `middleware`) — SECURITY MASTERPLAN Point 13: CORS.
 *
 * Runs at the edge before every `/api/*` route. It is the one place that decides
 * whether a cross-origin browser may read an API response. All the logic lives
 * in the pure, unit-tested `lib/http/cors.ts`; this file only turns a decision
 * into a `Response` and logs blocked attempts.
 *
 * Note: this is NOT authentication or rate limiting — those stay in the route
 * handlers (`lib/auth`, Point 6) and Upstash (Point 3). CORS only governs what
 * the *browser* is allowed to do with the response.
 */
export function proxy(request: NextRequest): NextResponse {
  const { allowed, hasOrigin, isPreflight, headers } = evaluateCors(request);

  if (hasOrigin && !allowed) {
    // Monitor CORS violations (Point 13 checklist). Non-browser clients (curl,
    // server-to-server) send no Origin and are not logged or blocked here —
    // they are still gated by auth in the route handler.
    log.warn("cors.blocked_cross_origin", {
      origin: request.headers.get("origin"),
      method: request.method,
      path: request.nextUrl.pathname,
    });
  }

  if (isPreflight) {
    // Answer the preflight directly. A disallowed origin gets 403 with no
    // Access-Control-Allow-Origin, so the browser never sends the real request.
    return new NextResponse(null, { status: allowed ? 204 : 403, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Constant string literal so Next can statically analyse it at build time.
  matcher: "/api/:path*",
};
