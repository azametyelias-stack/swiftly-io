import { TransactionDetail } from "@/components/transactions/TransactionDetail";

// SCREEN-7 — Détails transaction (Lot 3).
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransactionDetail id={id} />;
}
