import { AppHeader } from "@/components/nav/AppHeader";

// Stub — the real screen is built in Lot 4 (see BUILD-PLAN.md). Kept so the menu
// route resolves and the nav shell has somewhere to land.
export default function Page() {
  return (
    <>
      <AppHeader title="Rapport" />
      <main className="mx-[var(--margin-screen)] py-16">
        <p className="t-body text-text-secondary">« Rapport » — écran construit au Lot 4.</p>
      </main>
    </>
  );
}
