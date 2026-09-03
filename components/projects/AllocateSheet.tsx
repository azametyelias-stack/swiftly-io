"use client";

import { useState } from "react";

import { AmountField } from "@/components/transactions/AmountField";
import { ChoiceGrid } from "@/components/transactions/ChoiceGrid";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FieldRow, FormSheet } from "@/components/ui/FormSheet";
import { formatBalance } from "@/lib/format/money";
import { parseAllocationAmount } from "@/lib/projects/model";
import { useMessages } from "@/lib/i18n/useMessages";

/** "Affecter au solde" / "Retirer du solde" (D4). */
export function AllocateSheet({
  allocated,
  accountBalance,
  onClose,
  onSubmit,
}: {
  allocated: number;
  accountBalance: number | null;
  onClose: () => void;
  onSubmit: (amount: number, direction: "add" | "withdraw") => Promise<void>;
}) {
  const m = useMessages();
  const t = m.projects.allocate;
  const [direction, setDirection] = useState<"add" | "withdraw">("add");
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseAllocationAmount(raw);
  const tooMuchToWithdraw = direction === "withdraw" && amount !== null && amount > allocated;
  const tooMuchToAdd =
    direction === "add" &&
    amount !== null &&
    accountBalance !== null &&
    amount > accountBalance;

  const submit = async () => {
    if (amount === null || tooMuchToWithdraw) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(amount, direction);
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? m.common.genericError);
      setSaving(false);
    }
  };

  return (
    <FormSheet
      title={t.title}
      onClose={onClose}
      closeLabel={m.common.cancel}
      footer={
        <>
          <SheetButton variant="ghost" className="flex-1" onClick={onClose} disabled={saving}>
            {m.common.cancel}
          </SheetButton>
          <SheetButton
            variant="primary"
            className="flex-1"
            onClick={submit}
            disabled={saving || amount === null || tooMuchToWithdraw}
          >
            {saving ? `${m.common.confirm}…` : m.common.confirm}
          </SheetButton>
        </>
      }
    >
      <FieldRow label={t.direction}>
        <ChoiceGrid
          ariaLabel={t.direction}
          columns={2}
          value={direction}
          onChange={(v) => setDirection(v as "add" | "withdraw")}
          options={[
            { value: "add", label: t.add },
            { value: "withdraw", label: t.withdraw },
          ]}
        />
      </FieldRow>

      <FieldRow
        label={t.amount}
        hint={
          direction === "add" && accountBalance !== null
            ? t.available.replace("{amount}", formatBalance(accountBalance, "XOF"))
            : direction === "withdraw"
              ? t.allocated.replace("{amount}", formatBalance(allocated, "XOF"))
              : undefined
        }
        error={
          tooMuchToWithdraw
            ? t.overWithdraw
            : tooMuchToAdd
              ? t.overAdd
              : null
        }
      >
        <AmountField ariaLabel={t.amount} raw={raw} onChange={setRaw} currency="XOF" />
      </FieldRow>

      {error ? <p className="t-secondary text-semantic-out">{error}</p> : null}
    </FormSheet>
  );
}
