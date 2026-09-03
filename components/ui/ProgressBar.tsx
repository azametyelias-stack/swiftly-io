"use client";

/**
 * Budget / project progress bar (SCREEN-15 § 5, SCREEN-16 § 5). Colour by ratio:
 * green 0-50 %, orange 51-91 %, red 92 %+. The bar fills to 100 % max; an
 * over-budget state stays red and full.
 */
const TONE_COLOR = {
  green: "var(--semantic-in)",
  orange: "#F5A524",
  red: "var(--semantic-out)",
} as const;

export function ProgressBar({
  ratio,
  tone,
  height = 8,
}: {
  ratio: number;
  tone: "green" | "orange" | "red";
  height?: number;
}) {
  const width = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-surface-rail"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${width}%`, background: TONE_COLOR[tone] }}
      />
    </div>
  );
}
