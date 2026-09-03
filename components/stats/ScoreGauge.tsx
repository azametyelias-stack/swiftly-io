"use client";

/**
 * The Score Financier gauge (SCREEN-11 § 7 / SCREEN-12 § 2). A single green arc
 * on a rail, score number in the centre. Green is reserved for the score.
 */
export function ScoreGauge({
  score,
  size = 132,
  outOf = "/100",
}: {
  score: number;
  size?: number;
  outOf?: string;
}) {
  const stroke = size >= 120 ? 14 : 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <div
      className="relative flex-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-rail)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--semantic-in)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[38px] font-bold leading-none tabular tracking-[-0.04em]">
          {score}
        </span>
        <span className="text-[12px] font-semibold text-text-tertiary">{outOf}</span>
      </div>
    </div>
  );
}
