import "server-only";

import { getServiceClient } from "@/lib/supabase/server";
import { log } from "@/lib/log/logger";
import {
  buildConsentRow,
  withEssential,
  CONSENT_VERSION,
  type ConsentAction,
  type ConsentCategories,
  type ConsentMeta,
} from "@/lib/privacy/consent";

export interface RecordConsentInput {
  categories: ConsentCategories;
  action: ConsentAction;
}

/**
 * Append an immutable row to `consent_logs` (the GDPR/CCPA audit trail) and
 * upsert the current state into `privacy_settings`.
 *
 * Never throws: a DB problem must not block the user's consent decision. When
 * persistence is unavailable the caller still stores the decision client-side
 * and we return `{ persisted: false }` so the response is honest about it.
 */
export async function recordConsent(
  input: RecordConsentInput,
  meta: ConsentMeta,
): Promise<{ persisted: boolean }> {
  const supabase = getServiceClient();
  if (!supabase) return { persisted: false };

  const row = buildConsentRow(input, meta);
  const categories = withEssential(input.categories);

  try {
    const { error: logError } = await supabase.from("consent_logs").insert(row);
    if (logError) {
      log.error("privacy.consent_logs_insert_failed", { reason: logError.message });
      return { persisted: false };
    }

    const { error: settingsError } = await supabase
      .from("privacy_settings")
      .upsert(
        {
          subject_id: meta.subjectId,
          user_id: meta.userId ?? null,
          essential: categories.essential,
          analytics: categories.analytics,
          marketing: categories.marketing,
          location: categories.location,
          consent_version: CONSENT_VERSION,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "subject_id" },
      );
    if (settingsError) {
      log.error("privacy.privacy_settings_upsert_failed", { reason: settingsError.message });
      // The audit row is in — that's the legally important part.
      return { persisted: true };
    }

    return { persisted: true };
  } catch (err) {
    log.error("privacy.record_consent_error", { err });
    return { persisted: false };
  }
}
