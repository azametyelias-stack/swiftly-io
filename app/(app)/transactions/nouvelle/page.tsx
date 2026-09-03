import { AppHeader } from "@/components/nav/AppHeader";

// Stub — the transaction flow (SCREEN-8/9/10) is built in Lot 3. Kept so the
// dashboard's "+ Nouvelle transaction" button has somewhere to land.
export default function Page() {
  return (
    <>
      <AppHeader title="Nouvelle transaction" />
      <main className="mx-[var(--margin-screen)] py-16">
        <p className="t-body text-text-secondary">
          « Nouvelle transaction » — écran construit au Lot 3.
        </p>
      </main>
    </>
  );
}
