"use client";

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  TransferIcon,
} from "@/components/nav/icons";
import { formatBalance, formatMoney, type CurrencyCode } from "@/lib/format/money";
import { formatRowMoment } from "@/lib/format/date";
import { directionOf, type TxListItem } from "@/lib/transactions/model";
import { interpolate, type Locale, type Messages } from "@/lib/i18n";

/**
 * Le contenu d'une ligne de transaction (SCREEN-4 § 10, SCREEN-6 § 5) : icône
 * directionnelle, catégorie, date/heure, note, « lié à », montant, type.
 *
 * Une seule pièce, utilisée deux fois — l'écran Historiques (`TxListRow`, qui
 * l'enveloppe dans son swipe-supprimer) et l'historique récent du Dashboard
 * (`RecentHistory`, qui l'enveloppe dans un appui long). Le Dashboard affichait
 * jusqu'ici une version dépouillée, sans note ni « lié à » ni mention du type,
 * alors que la maquette `04-dashboard.png` les montre : deux lignes différentes
 * pour la même chose, et la clé `dashboard.history.forNote` traduite mais
 * utilisée nulle part.
 *
 * Le swipe et l'appui long restent chez l'appelant : sur le Dashboard, un
 * balayage horizontal appartient au menu de navigation, pas à la ligne.
 */

/** La règle de troncature du § 10, et la seule raison d'être de ce sous-composant. */
function SecondaryLine({
  note,
  linkedTo,
}: {
  note: string | null;
  linkedTo: string | null;
}) {
  if (!note && !linkedTo) return null;
  return (
    <span className="t-secondary flex min-w-0 items-baseline gap-1 text-text-tertiary">
      {note ? <span className="truncate">{note}</span> : null}
      {/*
       * `flex-none` sur le « lié à », `truncate` sur la note : quand les deux
       * ne tiennent pas, c'est la NOTE qui est coupée en premier et le « lié à »
       * qui reste entier (§ 10). L'inverse — perdre « lié à mon enfant » pour
       * garder une note bavarde — ferait disparaître l'information la plus rare.
       */}
      {note && linkedTo ? <span className="flex-none">·</span> : null}
      {linkedTo ? <span className="flex-none">{linkedTo}</span> : null}
    </span>
  );
}

export function TxRowContent({
  tx,
  today,
  locale,
  m,
  currency = "XOF",
}: {
  tx: TxListItem;
  today: string;
  locale: Locale;
  m: Messages;
  currency?: CurrencyCode;
}) {
  const t = m.transactions;
  const dir = directionOf(tx.type);

  const label =
    tx.category?.name ??
    (tx.type === "transfer"
      ? `${tx.source_account?.name ?? "—"} → ${tx.destination_account?.name ?? "—"}`
      : (tx.source_account?.name ?? tx.destination_account?.name ?? "—"));

  const linkedTo = tx.linked_to
    ? interpolate(m.dashboard.history.linkedTo, { name: tx.linked_to.name })
    : tx.type === "transfer" && tx.category
      ? `${tx.source_account?.name} → ${tx.destination_account?.name}`
      : null;

  const amountText =
    dir === "neutral"
      ? formatBalance(tx.amount, currency)
      : formatMoney(tx.amount, { currency, sign: dir });
  const amountColor =
    dir === "in"
      ? "text-semantic-in"
      : dir === "out"
        ? "text-semantic-out"
        : "text-text-primary";
  const badge =
    tx.type === "expense"
      ? t.detail.kindExpense
      : tx.type === "income"
        ? t.detail.kindIncome
        : t.detail.kindTransfer;

  const Icon =
    dir === "in" ? ArrowUpRightIcon : dir === "out" ? ArrowDownLeftIcon : TransferIcon;

  return (
    <>
      <span
        className={`grid size-11 flex-none place-items-center rounded-[var(--radius-icon)] ${
          dir === "in"
            ? "bg-semantic-in-bg text-semantic-in"
            : dir === "out"
              ? "bg-semantic-out-bg text-semantic-out"
              : "bg-surface-field text-text-secondary"
        }`}
      >
        <Icon width={20} height={20} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="t-body truncate font-semibold">{label}</span>
        <span className="t-secondary truncate text-text-tertiary">
          {formatRowMoment(tx.occurred_on, tx.created_at, today, locale, {
            today: t.groups.today,
            yesterday: t.groups.yesterday,
          })}
        </span>
        <SecondaryLine note={tx.note} linkedTo={linkedTo} />
      </span>

      <span className="flex flex-none flex-col items-end">
        <span className={`t-body font-bold tabular ${amountColor}`}>{amountText}</span>
        <span className="t-label text-text-tertiary">{badge}</span>
      </span>
    </>
  );
}
