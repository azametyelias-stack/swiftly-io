"use client";

import type { ReactNode } from "react";

/** The shared "Aucun X" encouraging empty state (Templates / Budgets / Projets / Comptes). */
export function ManageEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="max-w-[320px] t-body text-text-secondary">{body}</p>
      {action ? <div className="mt-2 w-full max-w-[320px]">{action}</div> : null}
    </div>
  );
}
