import { LaunchTemplate } from "@/components/templates/LaunchTemplate";
import { TxTypePicker } from "@/components/transactions/TxTypePicker";
import { TxWizard } from "@/components/transactions/TxWizard";
import { isTxType } from "@/lib/transactions/model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// SCREEN-8/9/10 — Créer une transaction (Lot 3). `?type` picks the flow;
// `?template=<id>` pre-fills it from a template (Lot 5, SCREEN-14 § 6); without
// either, the "Que voulez-vous enregistrer ?" chooser.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; template?: string }>;
}) {
  const { type, template } = await searchParams;
  if (template && UUID.test(template)) return <LaunchTemplate id={template} />;
  if (!type || !isTxType(type)) return <TxTypePicker />;
  return <TxWizard type={type} />;
}
