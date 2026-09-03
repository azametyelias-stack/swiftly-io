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
import { apiJson } from "@/lib/http/api";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { formatRowMoment, todayISO } from "@/lib/format/date";
import { directionOf, type TxListItem } from "@/lib/transactions/model";
import { type Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";

/** The dashboard "Historique récent" strip (SCREEN-4 § 8) — the 3 latest rows. */
export function RecentHistory() {
  const m = useMessages();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const today = todayISO();

  const [items, setItems] = useState<TxListItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    apiJson<{ items: TxListItem[] }>("/api/transactions?limit=3")
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

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
