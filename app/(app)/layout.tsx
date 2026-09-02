import type { ReactNode } from "react";

import { SessionProvider } from "@/components/auth/SessionProvider";
import { RequireSession } from "@/components/auth/RequireSession";
import { NavShell } from "@/components/nav/NavShell";

/**
 * The authenticated app. Everything under `(app)` gets:
 *  - a browser session (SessionProvider),
 *  - the client-side gate that bounces logged-out visitors to "/" (RequireSession),
 *  - the swipe-in menu shell (NavShell).
 *
 * Each screen renders its own <AppHeader>. Lot 1 fills the session by signing in
 * with the invite code; until then every route here redirects to the landing page.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <RequireSession>
        <NavShell>{children}</NavShell>
      </RequireSession>
    </SessionProvider>
  );
}
