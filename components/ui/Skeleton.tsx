import type { CSSProperties } from "react";

/**
 * Skeleton block (§ Transverse: "squelettes aux dimensions réelles, pulsation
 * 1 → 0,45, jamais de spinner centré"). Give it the size of the thing it stands
 * in for so nothing jumps when the data lands.
 */
export function Skeleton({
  className = "",
  style,
  rounded = "rounded-[12px]",
}: {
  className?: string;
  style?: CSSProperties;
  rounded?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-[sf-pulse_1.4s_ease-in-out_infinite] bg-surface-rail motion-reduce:animate-none ${rounded} ${className}`}
      style={style}
    />
  );
}
