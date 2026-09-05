"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  TransferIcon,
} from "@/components/nav/icons";
import { ListRow } from "@/components/ui/ListRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { DASHBOARD_STALE_EVENT } from "@/lib/dashboard/lastAccount";
import { apiJson } from "@/lib/http/api";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { formatRowMoment, todayISO } from "@/lib/format/date";
import { directionOf, type TxListItem } from "@/lib/transactions/model";
import { type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

/**
 * The dashboard "Historique récent" strip (SCREEN-4 § 8) — the 3 latest rows
 * for the account currently selected on the dashboard (never a mix of
 * accounts — the account selector must fully govern what this shows).
 */
export function RecentHistory({ accountId }: { accountId: string | null }) {
  const m = useMessages();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const today = todayISO();

  const [items, setItems] = useState<TxListItem[] | null>(null);
  // Bumped when a transaction is saved — the dashboard stays mounted under the
  // wizard modal, so without this the strip would still list the old three rows
  // until a manual reload.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const bump = () => setReloadKey((k) => k + 1);
    window.addEventListener(DASHBOARD_STALE_EVENT, bump);
    return () => window.removeEventListener(DASHBOARD_STALE_EVENT, bump);
  }, []);

  useEffect(() => {
    let alive = true;
    const query = new URLSearchParams({ limit: "3" });
    if (accountId) query.set("account", accountId);
    apiJson<{ items: TxListItem[] }>(`/api/transactions?${query.toString()}`)
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [accountId, reloadKey]);

  if (items === null) {
    return <Skeleton className="h-12 w-full" rounded="rounded-[14px]" />;
  }
  if (items.length === 0) {
    return (
      <p className="t-secondary text-text-secondary">
        {m.dashboard.history.empty}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((tx) => {
        const dir = directionOf(tx.type);
        const Icon =
          dir === "in"
            ? ArrowUpRightIcon
            : dir === "out"
              ? ArrowDownLeftIcon
              : TransferIcon;
        const label =
          tx.category?.name ??
          (tx.type === "transfer"
            ? `${tx.source_account?.name ?? "—"} → ${tx.destination_account?.name ?? "—"}`
            : (tx.source_account?.name ?? tx.destination_account?.name ?? "—"));
        return (
          <li key={tx.id}>
            <ListRow
              icon={<Icon width={18} height={18} />}
              iconTone={dir === "neutral" ? "neutral" : dir}
              title={label}
              subtitle={formatRowMoment(tx.occurred_on, tx.created_at, today, locale, {
                today: m.transactions.groups.today,
                yesterday: m.transactions.groups.yesterday,
              })}
              value={
                dir === "neutral"
                  ? formatBalance(tx.amount, "XOF")
                  : formatMoney(tx.amount, { currency: "XOF", sign: dir })
              }
              valueTone={dir === "neutral" ? "neutral" : dir}
              onClick={() => router.push(`/historiques/${tx.id}`)}
            />
          </li>
        );
      })}
    </ul>
  );
}
