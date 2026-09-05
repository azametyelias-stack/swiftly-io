"use client";

import { useEffect, useState } from "react";

import { ChevronDownIcon } from "@/components/nav/icons";

export interface TocSection {
  id: string;
  title: string;
}

/**
 * SCREEN-20's table of contents. Reconciled onto Swiftly's grammar for Lot 6:
 * the artboard is blunt that "le sommaire sticky de 250 px n'existe pas sur
 * 375" — so the desktop sidebar is gone and what remains is the collapsible
 * block at the head of the page, which is the mobile behaviour the screen doc
 * already described. One layout instead of two means one thing to keep right.
 *
 * Entries are numbered the way the artboard draws them (1…8): in a list of
 * eight long section titles, the number is what the eye comes back to.
 * Scroll-spy stays — it is what tells the reader where they are in a long
 * document.
 */
export function PolicyToc({ sections }: { sections: TocSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Sommaire">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[var(--size-list-button)] w-full items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)] text-[16px] font-semibold"
      >
        Sommaire
        <ChevronDownIcon
          width={18}
          height={18}
          className={`text-text-quaternary transition-transform ${open ? "rotate-180" : ""}`}
          style={{
            transitionDuration: "var(--dur-toggle)",
            transitionTimingFunction: "var(--ease-standard)",
          }}
        />
      </button>

      {open ? (
        <ul className="mt-2 overflow-hidden rounded-[var(--radius-card)] bg-surface-card px-[var(--pad-card)]">
          {sections.map((s, i) => (
            <li key={s.id} className="border-b border-surface-hairline last:border-b-0">
              <a
                href={`#${s.id}`}
                onClick={() => setOpen(false)}
                aria-current={active === s.id ? "true" : undefined}
                className="flex min-h-[var(--row-setting)] items-center gap-3 py-2"
              >
                <span
                  aria-hidden="true"
                  className={`grid size-7 flex-none place-items-center rounded-full text-[13px] font-bold ${
                    active === s.id
                      ? "bg-brand-accent text-ink-on-surface"
                      : "bg-surface-field text-text-tertiary"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`t-body ${active === s.id ? "font-semibold text-text-primary" : "text-text-secondary"}`}
                >
                  {s.title}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </nav>
  );
}
