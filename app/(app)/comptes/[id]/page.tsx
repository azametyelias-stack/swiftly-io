import { AccountDetailScreen } from "@/components/accounts/AccountDetailScreen";

// SCREEN-17 § 8 — Page de détails du compte (Lot 5).
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccountDetailScreen id={id} />;
}
