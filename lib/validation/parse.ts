import "server-only";

import type { ZodType } from "zod";

import { ValidationError } from "@/lib/http/errors";

/**
 * Parse a JSON request body against a Zod schema. Throws `ValidationError`
 * (400 VALIDATION_ERROR) on malformed JSON or a schema failure — `withAuth`
 * turns it into the standard REST envelope. Only the parsed value flows on;
 * the raw body is never touched by callers.
 *
 *   export const POST = withAuth(async (req, { user }) => {
 *     const input = await parseJsonBody(req, accountCreateSchema);
 *     // input is fully typed and validated
 *   });
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ValidationError("Corps de requête JSON invalide.", {
      formErrors: ["JSON invalide."],
      fieldErrors: {},
    });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("Données invalides.", parsed.error.flatten());
  }
  return parsed.data;
}

/**
 * Same, for URL search params / route params (also user input — Point 10).
 * Pass a plain object (e.g. `Object.fromEntries(new URL(req.url).searchParams)`).
 */
export function parseParams<T>(
  input: Record<string, unknown>,
  schema: ZodType<T>,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Paramètres invalides.", parsed.error.flatten());
  }
  return parsed.data;
}
