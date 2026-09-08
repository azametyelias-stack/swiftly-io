"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/components/auth/SessionProvider";
import { hasOfflineData } from "@/lib/offline/cache";
import { useOfflineState } from "@/lib/offline/status";

/**
 * Client-side guard for the `(app)` route group. The auth model is a
 * browser-held Supabase session + per-request `Authorization: Bearer` on the API
 * (there is no cookie for a Server Component to read), so the gate lives here.
 * The API is the real security boundary — every route still runs `withAuth`.
 *
 * `unauthenticated` → back to the landing page. `loading` → a plain page-colour
 * screen (no spinner — Swiftly never centres a spinner).
 *
 * Une exception, et une seule : hors ligne. Le jeton d'accès Supabase vit une
 * heure ; passé ce délai `getSession()` tente un rafraîchissement, qui échoue
 * faute de réseau, et la session ressort `null`. Ce n'est pas une déconnexion,
 * c'est une absence de réponse — renvoyer sur la Landing viderait l'écran de
 * quelqu'un qui a justement installé l'app pour la consulter dans le métro.
 * Tant que le réseau manque ET que cet appareil a des données en cache, on
 * affiche l'app ; le bandeau dit depuis quand elle date. Rien n'est affaibli
 * côté sécurité : l'API reste la vraie frontière (chaque route fait `withAuth`),
 * et sans jeton valide elle ne répondra rien au retour du réseau.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const { online } = useOfflineState();
  const router = useRouter();

  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (!online && hasOfflineData()) return;
    router.replace("/");
  }, [status, online, router]);

  if (status === "authenticated") return <>{children}</>;

  // `online` vaut `true` au premier rendu (et côté serveur), donc `hasOfflineData()`
  // — qui lit `localStorage` — n'est jamais évalué pendant le rendu serveur.
  if (status === "unauthenticated" && !online && hasOfflineData()) return <>{children}</>;

  return <div className="min-h-dvh bg-surface-page" aria-busy="true" />;
}
