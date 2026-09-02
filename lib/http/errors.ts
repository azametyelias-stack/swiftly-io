/**
 * Typed API errors + a single place that turns any thrown error into the
 * standard REST envelope (see `lib/http/respond.ts`).
 *
 * SECURITY MASTERPLAN — Point 6 (rights verified on server) and Point 14
 * (generic error messages): only `ApiError` instances expose their message to
 * the client. Anything else becomes an opaque 500 — the real error is logged
 * server-side, never sent back.
 *
 * This module is dependency-free on purpose (unit-tested in `tests/auth/`).
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** 400 — malformed request the client can fix. */
export class BadRequestError extends ApiError {
  constructor(message = "Requête invalide.", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
    this.name = "BadRequestError";
  }
}

/**
 * 400 — the request body / query / params failed Zod validation
 * (SECURITY MASTERPLAN — Point 10). `details` carries `error.flatten()` so the
 * client can map messages back to fields; the messages are already generic and
 * user-facing (French), never a raw parser dump.
 */
export class ValidationError extends ApiError {
  constructor(message = "Données invalides.", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

/** 401 — no valid session. The client should (re-)authenticate. */
export class UnauthorizedError extends ApiError {
  constructor(message = "Authentification requise.") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

/**
 * 401 — the token was well-formed but has expired (SECURITY MASTERPLAN — Point 9).
 * Distinct from `UnauthorizedError` so the client knows to call the refresh flow
 * and retry once, instead of bouncing the user to the login screen.
 */
export class TokenExpiredError extends ApiError {
  constructor(message = "Session expirée.") {
    super(401, "TOKEN_EXPIRED", message);
    this.name = "TokenExpiredError";
  }
}

/**
 * 401 — sign-in failed (SECURITY MASTERPLAN — Point 16: single auth error
 * message). ONE message + code for "unknown identifier" AND "wrong secret", so a
 * response can't be used to enumerate accounts. The real reason is logged
 * server-side, never returned. The message must stay equal to
 * `AUTH_MESSAGES.invalidCredentials` (checked in `tests/auth/responses.test.ts`).
 */
export class InvalidCredentialsError extends ApiError {
  constructor() {
    super(
      401,
      "AUTH_INVALID",
      "Identifiants incorrects. Vérifiez vos informations et réessayez.",
    );
    this.name = "InvalidCredentialsError";
  }
}

/** 403 — authenticated, but not allowed to touch this resource. */
export class ForbiddenError extends ApiError {
  constructor(message = "Accès refusé.") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/** 403 — a fresh confirmation (password / one-time code) is required first. */
export class ReauthRequiredError extends ApiError {
  constructor(message = "Confirmation requise pour cette action.") {
    super(403, "REAUTH_REQUIRED", message);
    this.name = "ReauthRequiredError";
  }
}

/** 404 — resource does not exist (or is hidden from this caller). */
export class NotFoundError extends ApiError {
  constructor(message = "Ressource introuvable.") {
    super(404, "NOT_FOUND", message);
    this.name = "NotFoundError";
  }
}

/**
 * Convert any error into a Response (SECURITY MASTERPLAN — Point 14: generic
 * error messages).
 *
 * - Known `ApiError`s are developer-authored: their status / code / message /
 *   details go to the client as-is. The messages are deliberately generic — e.g.
 *   `UnauthorizedError` says the same thing whether the token was missing,
 *   malformed, expired-past-refresh, or rejected — so a response can't be used to
 *   probe which accounts or resources exist.
 * - Anything else — a thrown `Error`, a DB driver blowing up, a string — collapses
 *   to an opaque `500 { error: "Une erreur est survenue.", code: "SERVER_ERROR" }`.
 *   The real message / stack / SQL / connection string is NEVER in the response;
 *   log it server-side before calling this (`withAuth` does).
 *
 * In development only, the generic 500 additionally carries `details` with the
 * underlying message so the cause is visible while debugging. That branch is
 * dead in production (`NODE_ENV !== "development"`).
 */
export function toErrorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    const body: Record<string, unknown> = {
      success: false,
      error: err.message,
      code: err.code,
    };
    if (err.details !== undefined) body.details = err.details;
    return Response.json(body, { status: err.status });
  }

  const body: Record<string, unknown> = {
    success: false,
    error: "Une erreur est survenue.",
    code: "SERVER_ERROR",
  };
  if (process.env.NODE_ENV === "development") {
    body.details = {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
    };
  }
  return Response.json(body, { status: 500 });
}
