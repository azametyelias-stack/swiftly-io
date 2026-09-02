"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthButton } from "@/components/auth/AuthButton";
import { useSession } from "@/components/auth/SessionProvider";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * SCREEN-1 — Landing. Full-bleed night hero, content bottom-aligned, one button.
 * 100 % static (screen doc § 3): no data, no API. "Démarrer" navigates to the
 * invite-code screen; repeat taps during the transition are ignored (§ 5).
 *
 * Already-signed-in visitors skip straight to the app (SCREEN-2 § 5 — don't
 * re-show onboarding once a session exists).
 */
export default function LandingPage() {
  const m = useMessages();
  const router = useRouter();
  const { status } = useSession();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  const start = () => {
    if (leaving) return;
    setLeaving(true);
    router.push("/connexion");
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
