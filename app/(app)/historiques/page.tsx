import { HistoryScreen } from "@/components/transactions/HistoryScreen";
import { isTxType } from "@/lib/transactions/model";

// SCREEN-6 — Historiques (Lot 3). `?type=` pre-filters (from the Statistiques
// breakdown lists).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <HistoryScreen initialType={isTxType(type) ? type : undefined} />
  );
}
