import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
