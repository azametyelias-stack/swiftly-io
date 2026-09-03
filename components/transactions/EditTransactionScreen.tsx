"use client";

import { useRouter } from "next/navigation";

import { SheetButton } from "@/components/transactions/SheetButton";
import { TxSheet } from "@/components/transactions/TxSheet";
import { TxWizard } from "@/components/transactions/TxWizard";
import { Skeleton } from "@/components/ui/Skeleton";
import { todayISO } from "@/lib/format/date";
import {
  transactionToDraft,
  type TxDetailForEdit,
} from "@/lib/transactions/model";
import { useTransaction } from "@/lib/transactions/useTransaction";
import { useMessages } from "@/lib/i18n/useMessages";

/** Edit an existing transaction — the same wizard, pre-filled (SCREEN-8 § 7). */
export function EditTransactionScreen({ id }: { id: string }) {
  const m = useMessages();
  const t = m.transactions;
  const router = useRouter();
  const { transaction, status, reload } = useTransaction(id);

  if (status === "loading" || (status === "ready" && !transaction)) {
    return (
      <TxSheet>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-32" rounded="rounded-full" />
          <Skeleton className="h-[52px] w-full" rounded="rounded-[14px]" />
          <Skeleton className="h-16 w-full" rounded="rounded-[14px]" />
          <Skeleton className="h-[52px] w-full" rounded="rounded-[14px]" />
        </div>
      </TxSheet>
    );
  }

  if (status === "error" || !transaction) {
    return (
      <TxSheet>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
            {t.detail.loadErrorTitle}
          </h1>
          <p className="max-w-[280px] t-body text-text-secondary">
            {t.detail.loadErrorBody}
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <SheetButton variant="primary" onClick={reload}>
              {m.common.retry}
            </SheetButton>
            <button
              type="button"
              onClick={() => router.push("/historiques")}
              className="h-[52px] text-[15px] font-semibold text-text-secondary"
            >
              {t.detail.backToHistory}
            </button>
          </div>
        </div>
      </TxSheet>
    );
  }

  const forEdit: TxDetailForEdit = {
    type: transaction.type,
    amount: transaction.amount,
    occurred_on: transaction.occurred_on,
    source_account_id: transaction.source_account?.id ?? null,
    destination_account_id: transaction.destination_account?.id ?? null,
    category_id: transaction.category?.id ?? null,
    linked_to_type: transaction.linked_to?.type ?? null,
    linked_to_id: transaction.linked_to?.id ?? null,
    note: transaction.note,
    status: transaction.status,
    recurrence: transaction.recurrence,
  };

  return (
    <TxWizard
      type={transaction.type}
      transactionId={id}
      initialDraft={transactionToDraft(forEdit, todayISO())}
    />
  );
}
