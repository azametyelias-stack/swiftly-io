"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlusIcon } from "@/components/nav/icons";
import { AccountCard } from "@/components/accounts/AccountCard";
import { AccountFormSheet } from "@/components/accounts/AccountFormSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ManageEmptyState } from "@/components/ui/ManageEmptyState";
import { NightScreen } from "@/components/ui/NightScreen";
import { SheetButton } from "@/components/transactions/SheetButton";
import { SelectField } from "@/components/transactions/SelectField";
import { Skeleton } from "@/components/ui/Skeleton";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { useToast } from "@/components/ui/Toast";
import {
  ACCOUNT_SORTS,
  sortAccounts,
  type AccountSort,
} from "@/lib/accounts/model";
import { deleteAccountRequest, useAccounts } from "@/lib/accounts/useAccounts";
import { useMessages } from "@/lib/i18n/useMessages";

export function AccountsScreen() {
  const m = useMessages();
  const t = m.accounts;
  const router = useRouter();
  const toast = useToast();
  const { accounts, status, reload, create } = useAccounts();

  const [sort, setSort] = useState<AccountSort>("recent");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => sortAccounts(accounts, sort), [accounts, sort]);
  const target = accounts.find((a) => a.id === pendingDelete) ?? null;

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      const r = await deleteAccountRequest(pendingDelete);
      toast.show(r.archived ? t.archivedToast : t.deletedToast);
      reload();
    } catch {
      toast.show(m.common.genericError);
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  return (
    <NightScreen
      title={t.title}
      right={
        <button
          type="button"
          aria-label={t.form.createTitle}
          onClick={() => setCreating(true)}
          className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <PlusIcon width={26} height={26} />
        </button>
      }
      contentClassName="overflow-hidden"
    >
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {status === "ready" && accounts.length > 0 ? (
          <div className="flex-none px-4 pt-4">
            <div className="w-44">
              <SelectField
                ariaLabel={t.sortLabel}
                value={sort}
                placeholder={t.sorts.recent}
                options={ACCOUNT_SORTS.map((s) => ({ value: s, label: t.sorts[s] }))}
                onSelect={(v) => setSort(v as AccountSort)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
          {status === "loading" ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full" rounded="rounded-[20px]" />
              ))}
            </div>
          ) : status === "error" ? (
            <ManageEmptyState
              title={t.loadErrorTitle}
              body={t.loadErrorBody}
              action={
                <SheetButton variant="ghost" onClick={reload}>
                  {m.common.retry}
                </SheetButton>
              }
            />
          ) : accounts.length === 0 ? (
            <ManageEmptyState
              title={t.emptyTitle}
              body={t.emptyBody}
              action={
                <SheetButton variant="primary" onClick={() => setCreating(true)}>
                  {t.addCta}
                </SheetButton>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((a) => (
                <SwipeToDelete
                  key={a.id}
                  deleteLabel={m.common.delete}
                  onDelete={() => setPendingDelete(a.id)}
                  onOpen={() => router.push(`/comptes/${a.id}`)}
                >
                  <AccountCard
                    account={a}
                    onHistory={() => router.push(`/historiques?account=${a.id}`)}
                  />
                </SwipeToDelete>
              ))}
            </div>
          )}
        </div>

        {status === "ready" && accounts.length > 0 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-page from-40% to-transparent p-4 pt-8">
            <SheetButton
              variant="primary"
              className="pointer-events-auto"
              onClick={() => setCreating(true)}
            >
              <PlusIcon width={18} height={18} />
              {t.addCta}
            </SheetButton>
          </div>
        ) : null}
      </div>

      {toast.node}

      {creating ? (
        <AccountFormSheet
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await create(payload);
            toast.show(t.createdToast);
            reload();
          }}
        />
      ) : null}

      {target ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={
            (target.tx_count ?? 0) > 0
              ? t.deleteBodyArchive
              : t.deleteBody.replace("{name}", target.name)
          }
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </NightScreen>
  );
}
