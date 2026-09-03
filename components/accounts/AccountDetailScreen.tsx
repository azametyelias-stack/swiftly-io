"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountTypeIcon } from "@/components/nav/icons";
import { feeLabel } from "@/components/accounts/AccountCard";
import { AccountFormSheet } from "@/components/accounts/AccountFormSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NightScreen } from "@/components/ui/NightScreen";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { apiJson } from "@/lib/http/api";
import { formatBalance } from "@/lib/format/money";
import {
  deleteAccountRequest,
  fetchAccount,
  updateAccountRequest,
} from "@/lib/accounts/useAccounts";
import type { AccountCardData } from "@/lib/accounts/model";
import type { TxListItem } from "@/lib/transactions/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function AccountDetailScreen({ id }: { id: string }) {
  const m = useMessages();
  const t = m.accounts;
  const router = useRouter();
  const toast = useToast();

  const [account, setAccount] = useState<AccountCardData | null>(null);
  const [recent, setRecent] = useState<TxListItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetchAccount(id),
      apiJson<{ items: TxListItem[] }>(`/api/transactions?account=${id}&limit=10`),
    ])
      .then(([acc, tx]) => {
        setAccount(acc);
        setRecent(tx.items);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  useEffect(load, [load]);

  const patchFlag = async (patch: { is_favorite?: boolean; is_archived?: boolean }) => {
    setBusy(true);
    try {
      const updated = await updateAccountRequest(id, patch);
      setAccount(updated);
      toast.show(m.common.savedToast);
    } catch {
      toast.show(m.common.genericError);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const r = await deleteAccountRequest(id);
      toast.show(r.archived ? t.archivedToast : t.deletedToast);
      router.push("/comptes");
    } catch (err) {
      toast.show(
        (err as { message?: string }).message ?? m.common.genericError,
      );
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <NightScreen title={t.detailTitle}>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 pb-16">
        {status === "loading" ? (
          <Skeleton className="h-40 w-full" rounded="rounded-[20px]" />
        ) : status === "error" || !account ? (
          <div className="py-16 text-center">
            <p className="t-body text-text-secondary">{t.loadErrorBody}</p>
            <button
              onClick={() => {
                setStatus("loading");
                load();
              }}
              className="mt-3 text-[13px] font-semibold text-brand-accent"
            >
              {m.common.retry}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 flex-none place-items-center rounded-[var(--radius-icon)] bg-brand-deep text-ink-on-surface">
                  <AccountTypeIcon type={account.type} width={22} height={22} />
                </span>
                <div className="flex flex-col">
                  <span className="t-section-title">{account.name}</span>
                  <span className="t-secondary text-text-tertiary">
                    {t.form.types[account.type]}
                    {account.is_primary ? ` · ${t.primary}` : ""}
                  </span>
                </div>
              </div>
              <div>
                <span className="t-label text-text-tertiary">{t.balance}</span>
                <p className="t-balance tabular">{formatBalance(account.balance, "XOF")}</p>
              </div>
              <dl className="flex flex-col gap-1 text-[14px]">
                {feeLabel(account, t.perMonth) ? (
                  <Row k={t.monthlyFeeLabel} v={feeLabel(account, t.perMonth)!} />
                ) : null}
                {account.provider ? <Row k={t.form.provider} v={account.provider} /> : null}
                {account.card_network ? (
                  <Row k={t.form.network} v={t.form.networks[account.card_network as "visa"] ?? account.card_network} />
                ) : null}
                {account.account_number ? (
                  <Row k={t.form.accountNumber} v={account.account_number} />
                ) : null}
                {account.currency !== "XOF" ? <Row k={t.currency} v={account.currency} /> : null}
                {account.notes ? <Row k={t.form.notes} v={account.notes} /> : null}
                <Row k={t.statusLabel} v={account.is_archived ? t.archived : t.activeStatus} />
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SheetButton variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
                {m.common.edit}
              </SheetButton>
              <SheetButton
                variant="ghost"
                onClick={() => patchFlag({ is_favorite: !account.is_favorite })}
                disabled={busy}
              >
                {account.is_favorite ? t.unfavorite : t.favorite}
              </SheetButton>
              {!account.is_primary ? (
                <SheetButton
                  variant="ghost"
                  onClick={() => patchFlag({ is_archived: !account.is_archived })}
                  disabled={busy}
                >
                  {account.is_archived ? t.unarchive : t.archive}
                </SheetButton>
              ) : null}
              {!account.is_primary ? (
                <SheetButton variant="danger" onClick={() => setConfirming(true)} disabled={busy}>
                  {m.common.delete}
                </SheetButton>
              ) : null}
            </div>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="t-section-title">{t.recentTitle}</h2>
                <button
                  onClick={() => router.push(`/historiques?account=${id}`)}
                  className="text-[13px] font-semibold text-brand-accent"
                >
                  {t.seeAll}
                </button>
              </div>
              {recent.length === 0 ? (
                <p className="t-secondary text-text-tertiary">{t.noTransactions}</p>
              ) : (
                <ul className="flex flex-col rounded-[var(--radius-card)] bg-surface-card">
                  {recent.map((tx, i) => (
                    <li key={tx.id}>
                      <button
                        onClick={() => router.push(`/historiques/${tx.id}`)}
                        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
                          i < recent.length - 1 ? "border-b border-surface-hairline" : ""
                        }`}
                      >
                        <span className="t-body truncate">
                          {tx.category?.name ??
                            tx.source_account?.name ??
                            tx.destination_account?.name ??
                            "—"}
                        </span>
                        <span className="t-body flex-none font-bold tabular">
                          {formatBalance(tx.amount, "XOF")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {toast.node}

      {editing && account ? (
        <AccountFormSheet
          account={account}
          onClose={() => setEditing(false)}
          onSubmit={async (payload) => {
            const updated = await updateAccountRequest(id, payload);
            setAccount(updated);
            toast.show(m.common.savedToast);
          }}
        />
      ) : null}

      {confirming && account ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={(account.tx_count ?? 0) > 0 ? t.deleteBodyArchive : t.deleteBody.replace("{name}", account.name)}
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      ) : null}
    </NightScreen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-surface-hairline py-1.5 last:border-0">
      <dt className="text-text-tertiary">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
