"use client";

/**
 * SCREEN-22 — cookie toggle switch.
 * States: on / off / disabled (essential) / coming-soon (location).
 */
export function ConsentToggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sf-blue ${
        checked ? "bg-sf-green" : "bg-sf-border"
      } ${
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
      }`}
    >
      <span
        className={`absolute h-6 w-6 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 ${
          checked ? "left-[calc(100%-1.625rem)]" : "left-0.5"
        }`}
      />
    </button>
  );
}
