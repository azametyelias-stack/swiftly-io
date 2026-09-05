import { AlertDetailScreen } from "@/components/alerts/AlertDetailScreen";

// SCREEN-18 § 8 — the read-only detail of one alert.
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlertDetailScreen id={id} />;
}
