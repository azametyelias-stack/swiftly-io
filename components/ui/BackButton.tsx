"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  className,
  children = "👈 Retour",
  fallback = "/",
}: {
  className?: string;
  children?: React.ReactNode;
  fallback?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
