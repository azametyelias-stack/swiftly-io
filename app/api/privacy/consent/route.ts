import { handleConsentPost } from "@/lib/privacy/endpoint";
import { consentRequestSchema } from "@/lib/privacy/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Records the first consent decision made from the consent banner (SCREEN-20). */
export async function POST(request: Request): Promise<Response> {
  return handleConsentPost(request, consentRequestSchema);
}
