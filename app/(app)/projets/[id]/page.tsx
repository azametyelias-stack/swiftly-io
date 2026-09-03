import { ProjectDetailScreen } from "@/components/projects/ProjectDetailScreen";

// SCREEN-16 § 9 — Détails du projet (Lot 5).
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectDetailScreen id={id} />;
}
