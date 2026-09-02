import type { ReactNode } from "react";

/**
 * Onboarding / auth route group (SCREEN-2, SCREEN-3). No nav shell, no
 * `RequireSession` gate — these screens are how a session gets created. The
 * browser Supabase session comes from the root `<SessionProvider>`; each page
 * decides for itself where to redirect based on `useSession()` status.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-surface-field">{children}</div>;
}
