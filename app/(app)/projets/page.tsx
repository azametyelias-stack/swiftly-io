import { AppHeader } from "@/components/nav/AppHeader";

// Stub — the real screen is built in Lot 5 (see BUILD-PLAN.md). Kept so the menu
// route resolves and the nav shell has somewhere to land.
export default function Page() {
  return (
    <>
      <AppHeader title="Projet" />
      <main className="mx-[var(--margin-screen)] py-16">
        <p className="t-body text-text-secondary">« Projet » — écran construit au Lot 5.</p>
      </main>
    </>
  );
}
