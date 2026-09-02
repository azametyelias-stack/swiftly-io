import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // SECURITY MASTERPLAN — Point 7: keep secrets off the client.
  // Files under components/** are Client Components; they must read config from
  // lib/env/public.ts (NEXT_PUBLIC_* only), never from a server-only module.
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/env/server",
              message:
                "Server-only secrets. Client components read config from @/lib/env/public.",
            },
            {
              name: "@/lib/supabase/server",
              message:
                "Server-only Supabase client (service role / token verify). Not for client components.",
            },
          ],
        },
      ],
    },
  },
  // SECURITY MASTERPLAN — Point 15: application code logs through @/lib/log/logger
  // (which redacts every payload), never raw console.* (unredacted, and useless on
  // Vercel's serverless stdout without structure).
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "proxy.ts"],
    rules: { "no-console": "error" },
  },
  {
    // The logger itself is the one place console.* is the sink.
    files: ["lib/log/**/*.ts"],
    rules: { "no-console": "off" },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested tooling submodule — not part of the Swiftly.io codebase.
    "ecc/**",
    // Test files run via `node --test`, not linted with the app rules.
    "tests/**",
  ]),
]);

export default eslintConfig;
