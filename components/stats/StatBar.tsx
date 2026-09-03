/**
 * A progress bar (BUILD-PLAN "barre de progression"). Green fill on a rail, with
 * an optional benchmark tick. `value` and `benchmark` are 0..100.
 */
export function StatBar({
  value,
  benchmark,
  height = 6,
  gradient = false,
}: {
  value: number;
  benchmark?: number;
  height?: number;
  gradient?: boolean;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative w-full rounded-full bg-surface-rail"
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${v}%`,
          background: gradient
            ? "linear-gradient(90deg, var(--semantic-in), color-mix(in srgb, var(--semantic-in) 55%, white))"
            : "var(--semantic-in)",
        }}
      />
      {benchmark !== undefined ? (
        <span
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-text-primary"
          style={{ left: `${Math.max(0, Math.min(100, benchmark))}%` }}
        />
      ) : null}
    </div>
  );
}
