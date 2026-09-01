/**
 * Shared REST response envelope.
 *
 * Every Swiftly.io API route returns one of these two shapes
 * (see docs/2-ARCHITECTURE/UPDATE-ARCHITECTURE-REST-API.md):
 *
 *   success -> { "success": true,  "data": { ... } }
 *   error   -> { "success": false, "error": "message", "code": "ERROR_CODE" }
 */

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: string;
  code: string;
  details?: unknown;
};

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, {
    status: 200,
    ...init,
  });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  const body: ApiError = { success: false, error: message, code };
  if (details !== undefined) body.details = details;
  return Response.json(body, { status });
}
