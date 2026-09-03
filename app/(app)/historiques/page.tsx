import { HistoryScreen } from "@/components/transactions/HistoryScreen";
import { isTxType } from "@/lib/transactions/model";

// SCREEN-6 — Historiques (Lot 3). `?type=` pre-filters (from the Statistiques
// breakdown lists); `?account=` scopes to one account (from Gestion des comptes).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; account?: string }>;
}) {
  const { type, account } = await searchParams;
  return (
    <HistoryScreen
      initialType={isTxType(type) ? type : undefined}
      account={account && UUID.test(account) ? account : undefined}
    />
  );
}
