/**
 * Pure helpers for the six-box invite-code field (SCREEN-2 § 3 — "auto-advance,
 * backspace recule, paste réparti"). No React here so the tricky bits are
 * unit-tested in `tests/auth/code-input.test.ts`; the component only wires these
 * to focus + DOM events.
 */

export const CODE_LENGTH = 6;

/** Keep only digits, capped at `max`. Applies to both typing and pasting. */
export function sanitizeDigits(raw: string, max = CODE_LENGTH): string {
  return raw.replace(/\D+/g, "").slice(0, Math.max(0, max));
}

/** `""` → 6 empty cells; `"492"` → `["4","9","2","","",""]`. Always length 6. */
export function toCells(code: string): string[] {
  const digits = sanitizeDigits(code);
  return Array.from({ length: CODE_LENGTH }, (_, i) => digits[i] ?? "");
}

/** Canonical code string from cells (digits only). */
export function fromCells(cells: readonly string[]): string {
  return sanitizeDigits(cells.join(""));
}

export function isComplete(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Typing or pasting `input` while the caret is on cell `index`. One digit and a
 * full "123456" paste are handled the same way: fill forward from `index`, move
 * the caret to just after the last filled cell.
 */
export function applyInput(
  cells: readonly string[],
  index: number,
  input: string,
): { cells: string[]; focus: number } {
  const digits = sanitizeDigits(input, CODE_LENGTH - index);
  if (!digits) return { cells: [...cells], focus: index };

  const next = [...cells];
  for (let i = 0; i < digits.length; i++) next[index + i] = digits[i]!;
  const focus = Math.min(index + digits.length, CODE_LENGTH - 1);
  return { cells: next, focus };
}

/**
 * Backspace on cell `index`: if it holds a digit, clear it and stay; if it is
 * already empty, clear the previous cell and step back onto it.
 */
export function applyBackspace(
  cells: readonly string[],
  index: number,
): { cells: string[]; focus: number } {
  const next = [...cells];
  if (next[index]) {
    next[index] = "";
    return { cells: next, focus: index };
  }
  const prev = Math.max(0, index - 1);
  next[prev] = "";
  return { cells: next, focus: prev };
}
