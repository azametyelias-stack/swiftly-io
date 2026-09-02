"use client";

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import {
  CODE_LENGTH,
  applyBackspace,
  applyInput,
  fromCells,
  toCells,
} from "@/lib/auth/code-input";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * Six-box invite-code field (SCREEN-2). All the fiddly logic (auto-advance,
 * backspace-recule, paste distribution) lives in `lib/auth/code-input.ts` and is
 * unit-tested; this component wires it to focus + DOM events.
 */

interface CodeInputProps {
  /** Canonical string, 0–6 digits. */
  value: string;
  onChange: (code: string) => void;
  /** Fired once the sixth digit lands (Lot 1: Enter/complete submits). */
  onComplete?: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export function CodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = false,
}: CodeInputProps) {
  const m = useMessages();
  const cells = toCells(value);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  const focusCell = (i: number) => {
    const el = inputs.current[Math.max(0, Math.min(i, CODE_LENGTH - 1))];
    el?.focus();
    el?.select();
  };

  const commit = (nextCells: string[], focus: number) => {
    const code = fromCells(nextCells);
    onChange(code);
    focusCell(focus);
    if (code.length === CODE_LENGTH) onComplete?.(code);
  };

  const handleChange = (i: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const { cells: next, focus } = applyInput(cells, i, e.target.value);
    commit(next, focus);
  };

  const handleKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const { cells: next, focus } = applyBackspace(cells, i);
      commit(next, focus);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(i + 1);
    }
  };

  const handlePaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const { cells: next, focus } = applyInput(cells, i, e.clipboardData.getData("text"));
    commit(next, focus);
  };

  return (
    <div className="flex gap-2" role="group" aria-label={m.auth.code.heading}>
      {cells.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          value={digit}
          onChange={handleChange(i)}
          onKeyDown={handleKeyDown(i)}
          onPaste={handlePaste(i)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={interpolate(m.auth.code.digitLabel, { index: i + 1 })}
          aria-invalid={invalid || undefined}
          className={[
            "h-[60px] min-w-0 flex-1 rounded-[12px] bg-surface-card text-center",
            "text-[26px] font-semibold text-text-primary tabular",
            "border outline-none transition-[border-color,box-shadow] duration-[var(--dur-tap)]",
            "disabled:opacity-60",
            invalid
              ? "border-semantic-out"
              : "border-surface-rail focus:border-brand-accent focus:shadow-[var(--ring-brand)]",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
