import { AppHeader } from "@/components/nav/AppHeader";

// Stub — the real screen is built in Lot 2 (see BUILD-PLAN.md). Kept so the menu
// route resolves and the nav shell has somewhere to land.
export default function Page() {
  return (
    <>
      <AppHeader title="Dashboard" />
      <main className="mx-[var(--margin-screen)] py-16">
        <p className="t-body text-text-secondary">« Dashboard » — écran construit au Lot 2.</p>
      </main>
    </>
  );
}
