"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";

import { useMessages } from "@/lib/i18n/useMessages";

/**
 * "Objectif du mois" banner (SCREEN-4 § 7). Items rotate every 30 s, can be
 * swiped, show position dots, pause on interaction, and — for a ready-but-unread
 * report — blink and sort first. Urgent items (low balance…) sort ahead of tips.
 *
 * Lot 2 feeds it `[]` (no projects / alerts / reports yet) → the "Fixez un
 * objectif" placeholder. The real item sources are wired in Lots 4-6.
 */

const ROTATE_MS = 30_000;
const RESUME_AFTER_MS = 20_000;
const SWIPE_PX = 40;

export interface BannerItem {
  id: string;
  label: string;
  title: string;
  caption?: string;
  /** 0–100; renders the progress rail */
  progress?: number;
  href?: string;
  urgent?: boolean;
  blink?: boolean;
}

function ordered(items: BannerItem[]): BannerItem[] {
  return [...items].sort((a, b) => {
    const rank = (i: BannerItem) => (i.blink ? 0 : i.urgent ? 1 : 2);
    return rank(a) - rank(b);
  });
}

export function RotatingBanner({ items }: { items: BannerItem[] }) {
  const m = useMessages();
  const sorted = ordered(items);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStart = useRef<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused || sorted.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sorted.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, sorted.length]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const interact = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = e.clientX;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null || sorted.length <= 1) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) < SWIPE_PX) return;
    interact();
    setIndex((i) =>
      dx < 0 ? (i + 1) % sorted.length : (i - 1 + sorted.length) % sorted.length,
    );
  };

  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-4">
        <p className="t-body font-semibold text-text-primary">{m.dashboard.banner.emptyTitle}</p>
        <p className="t-secondary mt-1 text-text-secondary">{m.dashboard.banner.emptyBody}</p>
      </div>
    );
  }

  const active = sorted[Math.min(index, sorted.length - 1)]!;

  const card = (
    <div
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onClick={interact}
      className={[
        "flex flex-col gap-2 rounded-[16px] bg-brand-accent p-3.5 text-ink-on-surface",
        "bg-[linear-gradient(100deg,rgba(15,32,150,0.9)_0%,rgba(21,43,199,0.62)_48%,rgba(6,9,45,0.55)_100%)]",
        active.blink ? "animate-[sf-blink_1.2s_ease-in-out_infinite] motion-reduce:animate-none" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-white/15 text-[13px]">
          {active.urgent ? "!" : "★"}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="t-label text-ink-on-surface/60">{active.label}</span>
          <span className="truncate text-[15px] font-semibold">{active.title}</span>
        </span>
        {active.caption ? (
          <span className="ml-auto flex-none text-[12px] text-ink-on-surface/75 tabular">
            {active.caption}
          </span>
        ) : null}
      </div>

      {typeof active.progress === "number" ? (
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <span
              className="block h-full rounded-full bg-ink-in"
              style={{ width: `${Math.max(0, Math.min(100, active.progress))}%` }}
            />
          </span>
          <span className="flex-none text-[12px] font-semibold text-ink-on-surface/80 tabular">
            {Math.round(active.progress)} %
          </span>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {active.href ? (
        <Link href={active.href} className="block">
          {card}
        </Link>
      ) : (
        card
      )}
      {sorted.length > 1 ? (
        <div className="flex justify-center gap-1.5">
          {sorted.map((it, i) => (
            <span
              key={it.id}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-3.5 bg-text-primary" : "w-1 bg-text-quaternary"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
