import "server-only";

import { cookies, headers } from "next/headers";
import type { z } from "zod";

import { isProduction } from "@/lib/env/public";
import { ok, fail } from "@/lib/http/respond";
import { log } from "@/lib/log/logger";
import { recordConsent } from "@/lib/privacy/audit";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
  SUBJECT_COOKIE,
  withEssential,
  type ConsentAction,
} from "@/lib/privacy/consent";

/** First public IP in `x-forwarded-for`, falling back to `x-real-ip`. */
function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return h.get("x-real-ip");
}

type ConsentBody = {
  categories: { essential: true; analytics: boolean; marketing: boolean; location: boolean };
  action: ConsentAction;
};

/**
 * Shared POST handler for /api/privacy/consent and /api/privacy/update-consent.
 * They differ only by the Zod schema (and therefore the allowed `action`s).
 */
export async function handleConsentPost(
  request: Request,
  schema: z.ZodType<ConsentBody>,
): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail("INVALID_JSON", "Corps de requête JSON invalide.", 400);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      "Les données de consentement sont invalides.",
      400,
      parsed.error.flatten(),
    );
  }

  const categories = withEssential(parsed.data.categories);
  const action = parsed.data.action;

  const jar = await cookies();
  const h = await headers();

  let subjectId = jar.get(SUBJECT_COOKIE)?.value;
  if (!subjectId) {
    subjectId = crypto.randomUUID();
    jar.set(SUBJECT_COOKIE, subjectId, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
      maxAge: CONSENT_MAX_AGE,
    });
  }

  let persisted = false;
  try {
    ({ persisted } = await recordConsent(
      { categories, action },
      {
        subjectId,
        userId: null,
        ip: clientIp(h),
        userAgent: h.get("user-agent"),
      },
    ));
  } catch (err) {
    log.error("privacy.consent_post_failed", { action, err });
    return fail("SERVER_ERROR", "Impossible d'enregistrer le consentement.", 500);
  }

  const stored = {
    categories,
    version: CONSENT_VERSION,
    action,
    updatedAt: new Date().toISOString(),
  };

  // Mirror the decision in a readable cookie so SSR knows one exists.
  jar.set(CONSENT_COOKIE, JSON.stringify(stored), {
    httpOnly: false,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });

  return ok({ consent: stored, persisted });
}
