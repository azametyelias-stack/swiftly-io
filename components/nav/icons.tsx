/**
 * Minimal line icons for the nav shell. 24×24, `currentColor`, stroke width from
 * the design system (`--stroke-svg`, 1.7). Placeholder set — Claude Design owns
 * the final glyphs (SCREEN-05 § 7).
 */
import type { SVGProps } from "react";

import type { NavIcon } from "@/lib/nav/items";

function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth="var(--stroke-svg, 1.7)"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function BellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </Svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </Svg>
  );
}

const PATHS: Record<NavIcon, React.ReactNode> = {
  dashboard: <path d="M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 8h7V4h-7z" />,
  stats: <path d="M5 20V10M12 20V4M19 20v-7" />,
  accounts: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  templates: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
    </>
  ),
  budgets: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12 12 5M12 12l6 3" />
    </>
  ),
  projects: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5" />,
  alerts: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
    </>
  ),
  report: (
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M9 12h6M9 16h6M9 8h3" />
    </>
  ),
};

export function NavGlyph({ id, ...props }: { id: NavIcon } & SVGProps<SVGSVGElement>) {
  return <Svg {...props}>{PATHS[id]}</Svg>;
}
