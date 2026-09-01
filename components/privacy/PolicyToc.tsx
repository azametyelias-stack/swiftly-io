"use client";

import { useEffect, useState } from "react";

export interface TocSection {
  id: string;
  title: string;
}

/**
 * SCREEN-21 table of contents: sticky on desktop, collapsible on mobile,
 * with scroll-spy highlighting the section currently in view.
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

  const links = (
    <ul className="flex flex-col gap-1">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            onClick={() => setOpen(false)}
            aria-current={active === s.id ? "true" : undefined}
            className={`block border-l-2 py-1 pl-3 text-sm transition-colors ${
              active === s.id
                ? "border-sf-blue bg-[#eff6ff] font-semibold text-sf-blue"
                : "border-transparent text-sf-body hover:border-sf-blue hover:text-sf-blue"
            }`}
          >
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <nav aria-label="Table des matières" className="lg:w-[250px] lg:shrink-0">
      {/* Mobile: collapsible */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-lg bg-sf-subtle px-4 py-3 text-sm font-semibold text-sf-ink"
        >
          📑 Table des matières
          <span aria-hidden="true">{open ? "▲" : "▼"}</span>
        </button>
        {open && <div className="mt-2 rounded-lg bg-sf-subtle p-3">{links}</div>}
      </div>

      {/* Desktop: sticky */}
      <div className="sticky top-20 hidden max-h-[calc(100vh-6rem)] overflow-auto rounded-lg bg-sf-subtle p-4 lg:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sf-muted">
          Table des matières
        </p>
        {links}
      </div>
    </nav>
  );
}
