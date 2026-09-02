import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time primitives for the auth endpoints (SECURITY MASTERPLAN —
 * Point 16: a timing difference must not reveal whether an account exists).
 *
 * Dependency-free apart from `node:crypto` — unit-tested in
 * `tests/auth/timing.test.ts`. Runs in the Node.js runtime (auth routes set
 * `export const runtime = "nodejs"`).
 */

/**
 * Constant-time string equality. Compares SHA-256 digests with
 * `crypto.timingSafeEqual`, so neither the length nor the content of the inputs
 * leaks through comparison time.
 *
 * Use for every server-side secret check we perform ourselves: invite codes,
 * password-reset tokens, e-mail-confirmation tokens, webhook signatures
 * (Point 17). Passwords themselves are hashed + verified by Supabase Auth, not
 * here.
 */
export function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a, "utf8").digest();
  const db = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(da, db);
}

const now = (): number =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Run `work`, then pad the total elapsed time up to `floorMs` (plus a little
 * jitter) so a fast "nothing to do" branch (identifier not found) is
 * indistinguishable from a slow "verify the secret" branch. This is the
 * masterplan's "always run bcrypt against a dummy hash" trick, generalised —
 * useful when the slow path calls out to Supabase and the fast path returns
 * immediately.
 *
 *   const user = await findUserByEmail(email);        // may be null
 *   return withMinimumDuration(150, async () => {
 *     if (!user) return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidCredentials, 401);
 *     const okd = await verifyWithSupabase(user, secret);
 *     if (!okd) return fail(AUTH_INVALID_CODE, AUTH_MESSAGES.invalidCredentials, 401);
 *     …
 *   });
 *
 * The value (or rejection) of `work` is passed through unchanged; the padding
 * happens either way.
 */
export async function withMinimumDuration<T>(
  floorMs: number,
  work: () => Promise<T>,
): Promise<T> {
  const started = now();
  try {
    return await work();
  } finally {
    const elapsed = now() - started;
    // Timing jitter only — not a secret; a CSPRNG would add nothing here.
    const jitter = Math.random() * Math.min(15, Math.max(0, floorMs) * 0.1); // nosemgrep: swiftly-insecure-random-in-auth
    const remaining = floorMs + jitter - elapsed;
    if (remaining > 0) await sleep(remaining);
  }
}
