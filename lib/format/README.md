# `lib/format` — display formatting

## `money.ts` — BUILD-PLAN.md § P3

The **one** place an amount becomes a string. Never build a money string by hand
in a component or a route.

```ts
import { formatBalance, formatSigned, formatMoney } from "@/lib/format/money";

formatBalance(343100)              // "343 100 F"      (U+2009 groups, U+0020 before F)
formatBalance(-12000)              // "−12 000 F"      (U+2212, only when negative)
formatSigned(67000, "in")          // "+67 000 F"      (income, semantic/in)
formatSigned(32200, "out")         // "−32 200 F"      (expense, semantic/out)
formatMoney(5000, { currency: "EUR" })          // "5 000 €"
formatMoney(0, { masked: true })                // "•• ••• F"   (privacy eye)
formatMoney(1500, { withCurrency: false })      // "1 500"      (numpad shows F itself)
```

Rules baked in (source: `DESIGN-HANDOFF/README.md` § "Format des montants"):

- thousands separator = **U+2009** thin space — never a comma or a period;
- negative / expense sign = **U+2212** minus — never the ASCII hyphen;
- currency suffix (`F` / `€` / `$`) is set off by a **normal** space, never glued;
- masked mode is a **fixed-length** `•• •••` whatever the value;
- values are **whole units** (no minor unit) — `DESIGN-RECONCILIATION.md` D1: amounts
  are stored as `bigint` whole XOF, a per-account currency is a display label only,
  no FX conversion at MVP. Non-integer input is rounded.

Pair it with `font-variant-numeric: tabular-nums` on screen — the `.tabular`
helper or a `.t-balance` / `.t-amount-input` role class in `app/globals.css`.

`money.ts` imports nothing, so it is unit-tested directly: `tests/format/money.test.ts`.
