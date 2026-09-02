"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthButton } from "@/components/auth/AuthButton";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { useSession } from "@/components/auth/SessionProvider";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * SCREEN-3 — Connexion (nom). One field, same sheet as SCREEN-2. Requires the
 * session issued at SCREEN-2; without it, back to the code screen (§ 5). On
 * success: profile saved, Compte Principal created server-side (D5), → Dashboard.
 */

type Phase = "idle" | "submitting" | "done";

export default function ConnexionNomPage() {
  const m = useMessages();
  const router = useRouter();
  const { status, accessToken } = useSession();

  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/connexion");
  }, [status, router]);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const trimmed = name.trim();
  const busy = phase !== "idle";

  const submit = async () => {
    if (busy) return;
    if (!trimmed) {
      setError(m.auth.name.errorRequired);
      return;
    }
    setPhase("submitting");
    setError(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.status === 401) {
        router.replace("/connexion");
        return;
      }

      const body = (await res.json().catch(() => null)) as
        | { success: true }
        | { success: false; code?: string }
        | null;

      if (!res.ok || !body?.success) {
        setPhase("idle");
        setError(
          body && !body.success && body.code === "VALIDATION_ERROR"
            ? m.auth.name.errorRequired
            : m.auth.name.errorServer,
        );
        return;
      }

      setPhase("done");
      window.setTimeout(() => router.replace("/dashboard"), 240);
    } catch {
      setPhase("idle");
      setError(m.auth.name.errorServer);
    }
  };

  const help =
    phase === "submitting"
      ? m.auth.name.helpCreating
      : phase === "done"
        ? m.auth.name.welcomeHelp
        : m.auth.name.help;

  return (
    <AuthScreen heading={m.auth.name.heading} help={help} backTo="/connexion">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="t-secondary font-semibold text-text-secondary">
            {m.auth.name.label}
          </span>
          <input
            ref={fieldRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder={m.auth.name.placeholder}
            disabled={busy}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "nom-error" : undefined}
            className={[
              "h-[var(--size-primary-button)] rounded-[var(--radius-icon)] bg-surface-card px-4",
              "text-[17px] text-text-primary outline-none transition-[border-color,box-shadow] duration-[var(--dur-tap)]",
              "border disabled:opacity-60",
              error
                ? "border-semantic-out"
                : "border-surface-rail focus:border-brand-accent focus:shadow-[var(--ring-brand)]",
            ].join(" ")}
          />
        </label>

        {error ? (
          <p id="nom-error" role="alert" className="flex items-center gap-2 text-[13px] text-semantic-out">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        ) : null}

        <AuthButton
          type="submit"
          disabled={!trimmed}
          loading={phase === "submitting"}
          loadingLabel={m.auth.name.submitting}
        >
          {phase === "done" ? m.auth.name.saved : m.auth.name.submit}
        </AuthButton>
      </form>
    </AuthScreen>
  );
}
