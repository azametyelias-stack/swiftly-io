import type { ReactNode } from "react";

import { RequireSession } from "@/components/auth/RequireSession";
import { NavShell } from "@/components/nav/NavShell";

/**
 * The authenticated app. The browser session lives in the root
 * `<SessionProvider>` (app/layout.tsx); here we add:
 *  - the client-side gate that bounces logged-out visitors to "/" (RequireSession),
 *  - the swipe-in menu shell (NavShell),
 *  - the `@modal` parallel slot, rendered OUTSIDE NavShell so an intercepted
 *    `/transactions/...` route overlays the whole app (SCREEN-8/9 overlay).
 *
 * Each screen renders its own <AppHeader>. Lot 1 fills the session by redeeming
 * the invite code; the API is the real security boundary (every route: withAuth).
 */
export default function AppLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <RequireSession>
      <NavShell>{children}</NavShell>
      {modal}
    </RequireSession>
  );
}
