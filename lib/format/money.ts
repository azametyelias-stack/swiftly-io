/**
 * Money formatting — the ONE place an amount becomes a string.
 *
 * Spec: DESIGN-HANDOFF/README.md § "Format des montants" + § "Typographie".
 * Model: DESIGN-RECONCILIATION.md D1 — amounts are whole currency units (no
 * minor unit), stored as `bigint` whole XOF; a per-account currency is a
 * display label only, there is NO FX conversion at MVP. So every value here is
 * an integer number of francs/euros/dollars and only the suffix changes.
 *
 * Self-contained (imports nothing) so it is unit-testable via `node --test`.
 */

export type CurrencyCode = "XOF" | "EUR" | "USD";

/** U+2009 THIN SPACE — thousands separator. Never a comma, never a period. */
const GROUP = " ";
/** U+2212 MINUS SIGN — the typographic minus, not the ASCII hyphen "-". */
const MINUS = "−";
/** A normal space (U+0020) sets the currency suffix off — never glued. */
const SUFFIX_GAP = " ";

/** Privacy mask — two bullets, thin space, three bullets. Fixed length. `•• •••` */
export const MASKED_AMOUNT = "•• •••";

const SYMBOL: Record<CurrencyCode, string> = { XOF: "F", EUR: "€", USD: "$" };

/** "F" / "€" / "$". Unknown code falls back to the XOF franc. */
export function currencySymbol(currency: CurrencyCode = "XOF"): string {
  return SYMBOL[currency] ?? SYMBOL.XOF;
}

/** 1234567 -> "1 234 567" (U+2009 groups). Absolute value, rounded to integer. */
function groupDigits(value: number): string {
  const digits = Math.abs(Math.round(value)).toString();
  let out = "";
  for (let i = 0; i < digits.length; i += 1) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += GROUP;
    out += digits[i];
  }
  return out;
}

export type MoneySign =
  | "auto" /* balance: no sign when >= 0, U+2212 when < 0 */
  | "in" /* income: always a leading "+" */
  | "out" /* expense: always a leading U+2212 */
  | "none"; /* magnitude only, never a sign */

export interface FormatMoneyOptions {
  currency?: CurrencyCode;
  sign?: MoneySign;
  /** Privacy mode — render `•• •••` (+ suffix) whatever the value. */
  masked?: boolean;
  /** Drop the currency suffix (e.g. a numpad that shows "F" separately). */
  withCurrency?: boolean;
}

/**
 * `formatMoney(250000)` -> "250 000 F"
 * `formatMoney(-12000)` -> "−12 000 F"                 (sign: "auto", negative)
 * `formatMoney(67000, { sign: "in" })` -> "+67 000 F"
 * `formatMoney(32200, { sign: "out" })` -> "−32 200 F"
 * `formatMoney(5000, { currency: "EUR" })` -> "5 000 €"
 * `formatMoney(0, { masked: true })` -> "•• ••• F"
 */
export function formatMoney(value: number, options: FormatMoneyOptions = {}): string {
  const {
    currency = "XOF",
    sign = "auto",
    masked = false,
    withCurrency = true,
  } = options;

  const suffix = withCurrency ? `${SUFFIX_GAP}${currencySymbol(currency)}` : "";

  if (masked) return `${MASKED_AMOUNT}${suffix}`;

  const rounded = Math.round(value);

  let prefix = "";
  if (sign === "in") prefix = "+";
  else if (sign === "out") prefix = MINUS;
  else if (sign === "auto" && rounded < 0) prefix = MINUS;

  return `${prefix}${groupDigits(rounded)}${suffix}`;
}

/** Dashboard balance: `343 100 F`, or `−12 000 F` only when negative. */
export function formatBalance(value: number, currency: CurrencyCode = "XOF"): string {
  return formatMoney(value, { currency, sign: "auto" });
}

/** A transaction amount shown with its direction: `+67 000 F` / `−32 200 F`. */
export function formatSigned(
  magnitude: number,
  direction: "in" | "out",
  currency: CurrencyCode = "XOF",
): string {
  return formatMoney(magnitude, { currency, sign: direction });
}
