import { EditTransactionScreen } from "@/components/transactions/EditTransactionScreen";
import { TxModal } from "@/components/transactions/TxModal";

// Intercepted SCREEN-8 (edit) — the wizard, pre-filled, as a slide-up overlay.
// Hard load / refresh falls through to app/(app)/transactions/[id]/modifier.
export default async function InterceptedEditTransaction({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <TxModal>
      <EditTransactionScreen id={id} />
    </TxModal>
  );
}
