import type { ReactNode } from "react";

import { RequireSession } from "@/components/auth/RequireSession";
import { NavShell } from "@/components/nav/NavShell";

/**
 * The authenticated app. The browser session lives in the root
 * `<SessionProvider>` (app/layout.tsx); here we add:
 *  - the client-side gate that bounces logged-out visitors to "/" (RequireSession),
 *  - the swipe-in menu shell (NavShell).
 *
 * Each screen renders its own <AppHeader>. Lot 1 fills the session by redeeming
 * the invite code; the API is the real security boundary (every route: withAuth).
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <NavShell>{children}</NavShell>
    </RequireSession>
  );
}
