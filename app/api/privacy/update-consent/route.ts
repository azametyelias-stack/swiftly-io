import { handleConsentPost } from "@/lib/privacy/endpoint";
import { updateConsentRequestSchema } from "@/lib/privacy/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Records a later change to consent made from /privacy-settings (SCREEN-22). */
export async function POST(request: Request): Promise<Response> {
  return handleConsentPost(request, updateConsentRequestSchema);
}
