"use client";

import { useId } from "react";

import { currencySymbol, formatMoney, type CurrencyCode } from "@/lib/format/money";
import { parseAmount, type TxDirection } from "@/lib/transactions/model";

/**
 * The one field that grows (Lot 3 dc.html — "montant 64"): a big centred amount.
 * Native numeric keyboard (no custom keypad in the mockups); the value is stored
 * as raw whole-unit digits and shown grouped with the currency suffix.
 */
export function AmountField({
  raw,
  onChange,
  currency = "XOF",
  direction = "neutral",
  ariaLabel,
}: {
  raw: string;
  onChange: (raw: string) => void;
  currency?: CurrencyCode;
  direction?: TxDirection;
  ariaLabel: string;
}) {
  const id = useId();
  const parsed = parseAmount(raw);
  const grouped =
    parsed === null
      ? ""
      : formatMoney(parsed, {
          currency,
          sign: direction === "in" ? "in" : "none",
          withCurrency: false,
        });
  const color = direction === "in" ? "text-semantic-in" : "text-text-primary";

  return (
    <div className="relative flex h-16 items-center justify-center rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card">
      <label htmlFor={id} className="sr-only">
        {ariaLabel}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={grouped}
        onChange={(e) => {
          onChange(e.target.value.replace(/[^\d]/g, ""));
          const el = e.target;
          requestAnimationFrame(() => {
            el.setSelectionRange(el.value.length, el.value.length);
          });
        }}
        placeholder="0"
        className={`w-full bg-transparent text-center text-[26px] font-bold tabular tracking-[-0.01em] outline-none placeholder:text-text-quaternary ${color}`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-4 text-[15px] font-semibold ${
          parsed === null ? "text-text-quaternary" : "text-text-tertiary"
        }`}
      >
        {currencySymbol(currency)}
      </span>
    </div>
  );
}
