import { LaunchTemplate } from "@/components/templates/LaunchTemplate";
import { TxModal } from "@/components/transactions/TxModal";
import { TxTypePicker } from "@/components/transactions/TxTypePicker";
import { TxWizard } from "@/components/transactions/TxWizard";
import { isTxType } from "@/lib/transactions/model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Intercepted SCREEN-8/9/10 — the "Nouvelle transaction" wizard as a slide-up
// overlay over the screen it was opened from. Hard load / refresh falls through
// to the full page at app/(app)/transactions/nouvelle/page.tsx.
export default async function InterceptedNewTransaction({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; template?: string }>;
}) {
  const { type, template } = await searchParams;

  return (
    <TxModal>
      {template && UUID.test(template) ? (
        <LaunchTemplate id={template} />
      ) : !type || !isTxType(type) ? (
        <TxTypePicker />
      ) : (
        <TxWizard type={type} />
      )}
    </TxModal>
  );
}
