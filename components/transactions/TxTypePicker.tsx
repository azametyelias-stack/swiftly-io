"use client";

import { useRouter } from "next/navigation";

import { SheetButton } from "@/components/transactions/SheetButton";
import { TxSheet } from "@/components/transactions/TxSheet";
import { useMessages } from "@/lib/i18n/useMessages";
import type { TxType } from "@/lib/transactions/model";

/** "Que voulez-vous enregistrer ?" — common entry to screens 08 / 09 / 10. */
export function TxTypePicker() {
  const m = useMessages();
  const t = m.transactions;
  const router = useRouter();

  const pick = (type: TxType) =>
    router.replace(`/transactions/nouvelle?type=${type}`);

  return (
    <TxSheet>
      <h1 className="text-center text-[22px] font-semibold tracking-[-0.02em]">
        {t.new.pickTitle}
      </h1>
      <div className="mt-6 flex flex-col gap-3">
        <SheetButton variant="primary" onClick={() => pick("expense")}>
          {t.new.expense}
        </SheetButton>
        <SheetButton variant="primary" onClick={() => pick("income")}>
          {t.new.income}
        </SheetButton>
        <SheetButton variant="primary" onClick={() => pick("transfer")}>
          {t.new.transfer}
        </SheetButton>
      </div>
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-6 w-full text-center text-[15px] font-semibold text-text-secondary"
      >
        {t.new.cancel}
      </button>
    </TxSheet>
  );
}
