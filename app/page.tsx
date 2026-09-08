"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthButton } from "@/components/auth/AuthButton";
import { useSession } from "@/components/auth/SessionProvider";
import { useMessages } from "@/lib/i18n/useMessages";
import { hasOfflineData } from "@/lib/offline/cache";
import { useOfflineState } from "@/lib/offline/status";

/**
 * SCREEN-1 — Landing. Full-bleed night hero, content bottom-aligned, one button.
 * 100 % static (screen doc § 3): no data, no API. "Démarrer" navigates to the
 * invite-code screen; repeat taps during the transition are ignored (§ 5).
 *
 * Already-signed-in visitors skip straight to the app (SCREEN-2 § 5 — don't
 * re-show onboarding once a session exists).
 */

/**
 * How long the button stays locked before it will accept a second tap.
 *
 * Measured against a production build: the navigation lands in ~1 s online, and
 * ~1 s offline too (the worker serves `/offline` and this screen unmounts). So
 * eight seconds is well past "slow" and firmly into "something is wrong".
 */
const REARM_AFTER_MS = 8000;

export default function LandingPage() {
  const m = useMessages();
  const router = useRouter();
  const { status } = useSession();
  const { online } = useOfflineState();
  const [leaving, setLeaving] = useState(false);
  const rearm = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/dashboard");
      return;
    }
    // `start_url` du manifeste vaut "/", donc l'app installée s'ouvre ici. Hors
    // ligne le jeton peut être expiré sans pouvoir être rafraîchi : la session
    // ressort `null` alors que l'appareil a bien des données. Ouvrir sur la
    // Landing serait faux — c'est le dashboard qu'on attend, daté par le bandeau.
    if (status === "unauthenticated" && !online && hasOfflineData()) {
      router.replace("/dashboard");
    }
  }, [status, online, router]);

  // A pending re-arm must not outlive the screen.
  useEffect(
    () => () => {
      if (rearm.current) clearTimeout(rearm.current);
    },
    [],
  );

  const start = () => {
    if (leaving) return;
    setLeaving(true);
    router.push("/connexion");
    // `router.push` returns nothing and never rejects, and the RSC fetch behind
    // it has no timeout of its own. On a link that is slow rather than dead,
    // `leaving` would otherwise stay true for good — and this is the only
    // button on the only way into the app. Re-arm so a second tap is possible.
    rearm.current = setTimeout(() => setLeaving(false), REARM_AFTER_MS);
  };

  return (
    <main className="relative flex min-h-dvh flex-col justify-end overflow-hidden bg-brand-deep text-ink-on-surface">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,6,15,0.15) 0%, rgba(5,6,15,0) 22%, rgba(5,6,15,0.72) 58%, #05060F 82%)",
        }}
      />

      <div
        className="relative flex flex-col gap-8 px-6 pt-24"
        style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-4">
          <span className="font-logo text-[26px] tracking-[-0.015em]">
            {m.landing.logo}
          </span>
          <h1 className="flex flex-col text-[34px] font-semibold uppercase leading-[1.06] tracking-[0.005em]">
            <span>{m.landing.titleLine1}</span>
            <span className="text-brand-on-night">{m.landing.titleLine2}</span>
          </h1>
          <p className="max-w-[300px] text-[17px] leading-[1.45] text-ink-on-surface/70">
            {m.landing.tagline}
          </p>
        </div>

        <AuthButton onClick={start} loading={leaving} loadingLabel={m.landing.start}>
          {m.landing.start}
        </AuthButton>
      </div>
    </main>
  );
}
