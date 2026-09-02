"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/env/public";
import { getBrowserClient } from "@/lib/supabase/client";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionContextValue {
  status: SessionStatus;
  userId: string | null;
  /** Current access JWT — pass as `Authorization: Bearer` to the API. */
  accessToken: string | null;
  session: Session | null;
}

const INITIAL: SessionContextValue = {
  status: "loading",
  userId: null,
  accessToken: null,
  session: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the Supabase browser session and keeps it fresh (Supabase auto-refreshes
 * the access token). Lot 1's invite-code screens call `supabase.auth` to sign in;
 * everything downstream reads the result through `useSession()`.
 */
const SUPABASE_CONFIGURED = Boolean(
  publicEnv.supabaseUrl && publicEnv.supabaseAnonKey,
);

export function SessionProvider({ children }: { children: ReactNode }) {
  // If Supabase is not configured, start (and stay) logged out rather than
  // hang on "loading" — decided at init so the effect never sets state directly.
  const [state, setState] = useState<SessionContextValue>(() =>
    SUPABASE_CONFIGURED ? INITIAL : { ...INITIAL, status: "unauthenticated" },
  );

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return; // status is already "unauthenticated"

    let active = true;
    const apply = (session: Session | null) => {
      if (!active) return;
      setState({
        status: session ? "authenticated" : "unauthenticated",
        userId: session?.user.id ?? null,
        accessToken: session?.access_token ?? null,
        session,
      });
    };

    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      apply(session),
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within <SessionProvider>");
  return ctx;
}
