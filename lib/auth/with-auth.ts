import "server-only";

import { authenticate, type AuthUser } from "@/lib/auth/authenticate";
import { ApiError, toErrorResponse } from "@/lib/http/errors";
import { log } from "@/lib/log/logger";

/**
 * Wrap an App Router route handler so it (1) authenticates the caller before the
 * body runs and (2) turns any thrown `ApiError` into the standard REST envelope.
 * SECURITY MASTERPLAN — Point 6: this is how "every endpoint" gets the check
 * without copy-pasting it.
 *
 *   // app/api/accounts/[id]/route.ts
 *   export const GET = withAuth(async (req, { params, user }) => {
 *     const account = await getAccount(params.id);        // fetch
 *     assertOwnership(account, user, { resource: "account", resourceId: params.id });
 *     return ok({ account });
 *   });
 *
 * Unauthenticated -> 401 before `handler` is ever called.
 */

type RouteContext = { params: Promise<Record<string, string | string[]>> };

type AuthedHandler = (
  request: Request,
  ctx: { params: Record<string, string | string[]>; user: AuthUser },
) => Response | Promise<Response>;

export function withAuth(handler: AuthedHandler) {
  return async function authedRoute(
    request: Request,
    context: RouteContext,
  ): Promise<Response> {
    try {
      const user = await authenticate(request);
      const params = context?.params ? await context.params : {};
      return await handler(request, { params, user });
    } catch (err) {
      if (!(err instanceof ApiError)) {
        log.error("route.unhandled_error", { method: request.method, err });
      }
      return toErrorResponse(err);
    }
  };
}
