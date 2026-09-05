import { initials } from "@/lib/settings/model";

/**
 * The profile avatar (artboard `Lot 9`: 72 in the list, 96 in the editor). No
 * photo is stored yet, so this is the initials on the brand accent — the
 * artboard's own placeholder ("KA" for Kossi Adjo). Sized by prop rather than a
 * class so the two call sites read the artboard's two numbers directly.
 */
export function Avatar({ name, size }: { name: string; size: number }) {
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-brand-accent font-bold text-ink-on-surface"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {text}
    </span>
  );
}
