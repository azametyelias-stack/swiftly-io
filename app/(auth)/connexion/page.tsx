"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { CodeInput } from "@/components/auth/CodeInput";
import { useSession } from "@/components/auth/SessionProvider";
import { isComplete } from "@/lib/auth/code-input";
import { useMessages } from "@/lib/i18n/useMessages";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * SCREEN-2 — Connexion (code d'invitation). Six digits → POST /api/auth/verify-code
 * → exchange the magic-link handoff for a Supabase session → SCREEN-3.
 */

type Phase = "idle" | "submitting" | "verifying" | "done";

export default function ConnexionCodePage() {
  const m = useMessages();
  const router = useRouter();
  const { status } = useSession();

  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Session already live (came back here after step 2) → move on (SCREEN-2 § 5).
  useEffect(() => {
    if (status === "authenticated" && phase === "idle") {
      router.replace("/connexion/nom");
    }
  }, [status, phase, router]);

  const busy = phase !== "idle";

  const submit = async () => {
    if (busy || !isComplete(code)) return;
    setPhase("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => null)) as
        | { success: true; data: { verification: { email: string; tokenHash: string } } }
        | { success: false; code?: string }
        | null;

      if (!res.ok || !body?.success) {
        setPhase("idle");
        setCode("");
        setError(
          res.status >= 500 || res.status === 429
            ? m.auth.code.errorServer
            : m.auth.code.errorInvalid,
        );
        return;
      }

      setPhase("verifying");
      const supabase = getBrowserClient();
      if (!supabase) {
        setPhase("idle");
        setError(m.auth.code.errorServer);
        return;
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: body.data.verification.tokenHash,
      });
      if (otpError) {
        setPhase("idle");
        setCode("");
        setError(m.auth.code.errorServer);
        return;
      }

      setPhase("done");
      window.setTimeout(() => router.replace("/connexion/nom"), 240);
    } catch {
      setPhase("idle");
      setCode("");
      setError(m.auth.code.errorServer);
    }
  };

  const help =
    phase === "verifying" || phase === "submitting"
      ? m.auth.code.helpVerifying
      : phase === "done"
        ? m.auth.code.helpValidated
        : m.auth.code.help;

  return (
    <AuthScreen
      heading={m.auth.code.heading}
      help={help}
      backTo="/"
      footer={
        <Link
          href="/"
          className="text-[15px] font-semibold text-brand-accent"
        >
          {m.auth.code.noCode}
        </Link>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <CodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={() => void submit()}
          disabled={busy}
          invalid={Boolean(error)}
          autoFocus
        />

        {error ? (
          <p role="alert" className="flex items-center gap-2 text-[13px] text-semantic-out">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        ) : null}

        <AuthButton
          type="submit"
          disabled={!isComplete(code)}
          loading={phase === "submitting" || phase === "verifying"}
          loadingLabel={phase === "done" ? m.auth.code.confirmed : m.auth.code.submitting}
        >
          {phase === "done" ? m.auth.code.confirmed : m.auth.code.submit}
        </AuthButton>
      </form>
    </AuthScreen>
  );
}
