import { TxTypePicker } from "@/components/transactions/TxTypePicker";
import { TxWizard } from "@/components/transactions/TxWizard";
import { isTxType } from "@/lib/transactions/model";

// SCREEN-8/9/10 — Créer une transaction (Lot 3). `?type` picks the flow;
// without it, the "Que voulez-vous enregistrer ?" chooser.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (!type || !isTxType(type)) return <TxTypePicker />;
  return <TxWizard type={type} />;
}
