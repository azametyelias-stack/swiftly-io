"use client";

/**
 * SCREEN-21 — the consent switch. Reconciled onto Swiftly's tokens for Lot 6.
 *
 * The active state is BLUE, not the #10B981 green the spec asked for. The
 * artboard's reasoning, and it holds across the whole app: green has meant
 * "money in / goal reached" for four lots, so spending it on an interface state
 * would break that reading everywhere else. `--brand-accent` is already the
 * system's active state.
 *
 * Geometry is the design system's switch (`--switch-w/h/knob`), the same one
 * SCREEN-22 uses — a consent switch and a settings switch that differed by a
 * few pixels would read as two different controls.
 *
 * Four states, per the artboard: on, off, "requis" (on but locked — desaturated
 * so it is visibly ON yet unturnoffable), and "bientôt".
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
      className={`relative inline-flex shrink-0 rounded-[var(--radius-pill)] transition-colors focus-visible:shadow-[var(--ring-brand)] focus-visible:outline-none ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
      style={{
        width: "var(--switch-w)",
        height: "var(--switch-h)",
        backgroundColor: checked
          ? "var(--brand-accent)"
          : "var(--surface-control-off)",
        transitionDuration: "var(--dur-toggle)",
        transitionTimingFunction: "var(--ease-standard)",
      }}
    >
      <span
        className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_3px_rgba(10,10,12,0.3)] transition-[left]"
        style={{
          width: "var(--switch-knob)",
          height: "var(--switch-knob)",
          left: checked
            ? "calc(var(--switch-w) - var(--switch-knob) - 3px)"
            : "3px",
          transitionDuration: "var(--dur-toggle)",
          transitionTimingFunction: "var(--ease-standard)",
          // "Requis, verrouillé": on, but visibly not yours to turn off.
          boxShadow: disabled ? "none" : undefined,
        }}
      />
    </button>
  );
}
