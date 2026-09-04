import type { NextConfig } from "next";

import { buildSecurityHeaders, SECURITY_HEADERS_SOURCE } from "./lib/security/headers";

const nextConfig: NextConfig = {
  // Don't advertise the framework (SECURITY MASTERPLAN — Point 8 / Point 14).
  poweredByHeader: false,

  // Dev only: let a phone on the LAN load `next dev` assets/HMR without the
  // cross-origin block. No effect on the production build.
  allowedDevOrigins: ["192.168.1.70"],

  // Security headers on every response (Point 8). HTTPS/TLS itself is handled by
  // Vercel (Let's Encrypt, auto-renew, HTTP→HTTPS redirect); HSTS below tells the
  // browser to never fall back to HTTP.
  async headers() {
    return [
      {
        source: SECURITY_HEADERS_SOURCE,
        headers: buildSecurityHeaders({
          isDev: process.env.NODE_ENV === "development",
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
      },
    ];
  },
};

export default nextConfig;
