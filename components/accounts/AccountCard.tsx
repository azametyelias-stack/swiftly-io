"use client";

import { AccountTypeIcon } from "@/components/nav/icons";
import { bpToPercent, type AccountCardData } from "@/lib/accounts/model";
import { formatBalance, formatMoney } from "@/lib/format/money";
import { useMessages } from "@/lib/i18n/useMessages";

export function feeLabel(
  account: Pick<AccountCardData, "monthly_fee" | "fee_type">,
  perMonth: string,
): string | null {
  if (account.monthly_fee === null) return null;
  if (account.fee_type === "percent") {
    return `${bpToPercent(account.monthly_fee).toLocaleString("fr-FR")} %${perMonth}`;
  }
  return `−${formatMoney(account.monthly_fee, { sign: "none" })}${perMonth}`;
}

export function AccountCard({
  account,
  onHistory,
}: {
  account: AccountCardData;
  onHistory: () => void;
}) {
  const m = useMessages();
  const t = m.accounts;
  const fee = feeLabel(account, t.perMonth);

  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-11 flex-none place-items-center rounded-[var(--radius-icon)] bg-brand-deep text-ink-on-surface">
          <AccountTypeIcon type={account.type} width={20} height={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="t-body truncate font-bold">{account.name}</span>
            {account.is_primary ? (
              <span className="t-label rounded-full bg-brand-accent/10 px-2 py-0.5 text-brand-accent">
                {t.primary}
              </span>
            ) : null}
            {account.is_favorite ? <span aria-hidden>★</span> : null}
          </div>
          <span className="t-secondary text-text-tertiary">
            {t.form.types[account.type]}
            {account.provider ? ` · ${account.provider}` : ""}
          </span>
          <span className="t-screen-title mt-1 tabular">
            {formatBalance(account.balance, "XOF")}
          </span>
          {fee ? (
            <span className="t-secondary text-semantic-out">{fee}</span>
          ) : null}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onHistory();
        }}
        className="border-t border-surface-hairline py-2.5 text-[13px] font-semibold text-brand-accent"
      >
        {t.seeHistory}
      </button>
    </div>
  );
}
