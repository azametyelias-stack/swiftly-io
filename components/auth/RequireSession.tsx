"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/auth/SessionProvider";

/**
 * Client-side guard for the `(app)` route group. The auth model is a
 * browser-held Supabase session + per-request `Authorization: Bearer` on the API
 * (there is no cookie for a Server Component to read), so the gate lives here.
 * The API is the real security boundary — every route still runs `withAuth`.
 *
 * `unauthenticated` → back to the landing page. `loading` → a plain page-colour
 * screen (no spinner — Swiftly never centres a spinner).
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/");
  }, [status, router]);

  if (status !== "authenticated") {
    return <div className="min-h-dvh bg-surface-page" aria-busy="true" />;
  }

  return <>{children}</>;
}
