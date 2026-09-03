/** Progression dots above the wizard buttons (Lot 3 dc.html § "Progression en bas"). */
export function StepDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={
            i + 1 === current
              ? "h-1.5 w-6 rounded-full bg-text-primary"
              : "h-1.5 w-1.5 rounded-full bg-text-quaternary"
          }
        />
      ))}
    </div>
  );
}
