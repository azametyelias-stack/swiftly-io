import { EditTransactionScreen } from "@/components/transactions/EditTransactionScreen";

// SCREEN-8/9/10 (edit) — the wizard pre-filled from an existing transaction.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditTransactionScreen id={id} />;
}
