"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ChevronDownIcon, MoreVerticalIcon } from "@/components/nav/icons";
import { DeleteConfirmSheet } from "@/components/transactions/DeleteConfirmSheet";
import { TxRowContent } from "@/components/transactions/TxRowContent";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { offersMore, recentSlice } from "@/lib/dashboard/recent";
import { useRecentHistory } from "@/lib/dashboard/useRecentHistory";
import type { Period } from "@/lib/dashboard/period";
import { formatBalance, type CurrencyCode } from "@/lib/format/money";
import { todayISO } from "@/lib/format/date";
import {
  SORTS,
  directionOf,
  sortRows,
  type SortMode,
  type TxListItem,
} from "@/lib/transactions/model";
import type { Locale } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/i18n/useMessages";
import { useLongPress } from "@/lib/ui/useLongPress";

/**
 * Le bloc « Historique récent » du Dashboard (SCREEN-4 § 10).
 *
 * Ce qui a changé le 2026-09-13, après une journée d'usage réel :
 *
 *  - **5 lignes au lieu de 3**, et « Voir plus » déplie SUR PLACE. Il renvoyait
 *    vers `/historiques` ; on n'y va plus que par l'en-tête du bloc.
 *  - **« Voir plus » est en bas**, comme sur `04-dashboard.png`, et n'apparaît
 *    qu'à partir de la 6ᵉ transaction (`lib/dashboard/recent.ts`).
 *  - **L'entonnoir devient trois points et trie pour de vrai.** C'était un
 *    `<Link href="/historiques">` : il naviguait, il ne triait rien.
 *  - **L'ordre par défaut est l'heure d'ENREGISTREMENT, la dernière en tête.**
 *    Le serveur départageait deux lignes du même jour par leur `id`, un uuid
 *    tiré au hasard — d'où le 18 h 56 / 20 h 52 / 10 h 22 de la capture d'Elias.
 *  - **Appui long → menu d'actions** (détails / modifier / supprimer).
 *  - La liste suit enfin la **période** choisie en haut de l'écran (§ 3).
 *
 * Le tap simple ne bouge pas : il ouvre le détail de la transaction.
 */

/** `sortRows` trie sur un libellé ; `TxListItem` n'en porte pas. */
type SortableTx = TxListItem & { label: string };

export function RecentHistory({
  accountId,
  period,
  currency = "XOF",
  onChanged,
}: {
  accountId: string | null;
  period: Period;
  currency?: CurrencyCode;
  /** Une suppression déplace le solde et la courbe : le Dashboard doit se relire. */
  onChanged?: () => void;
}) {
  const m = useMessages();
  const t = m.dashboard.history;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();
  const today = todayISO();

  const { items, status, truncated, remove } = useRecentHistory(accountId, period);

  const [sort, setSort] = useState<SortMode>("recent");
  const [expanded, setExpanded] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [menuFor, setMenuFor] = useState<TxListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TxListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sorted = useMemo(() => {
    const rows: SortableTx[] = items.map((it) => ({
      ...it,
      label:
        it.category?.name ??
        it.source_account?.name ??
        it.destination_account?.name ??
        "",
    }));
    return sortRows(rows, sort);
  }, [items, sort]);

  const visible = recentSlice(sorted, expanded);
  const showToggle = offersMore(sorted.length);

  const sortLabels: Record<SortMode, string> = {
    recent: m.transactions.list.sortRecent,
    amount: m.transactions.list.sortAmount,
    alpha: m.transactions.list.sortAlpha,
    frequent: m.transactions.list.sortFrequent,
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const ok = await remove(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
    toast.show(ok ? m.transactions.list.deleted : m.common.genericError);
    if (ok) onChanged?.();
  };

  return (
    <section className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-3">
      <div className="flex items-center justify-between gap-2">
        {/*
          L'en-tête — titre ET l'espace vide à sa droite — est le SEUL chemin
          vers l'écran Historiques depuis ce bloc. Demande d'Elias : « c'est
          uniquement quand tu cliques sur un espace du conteneur que tu peux
          atterrir sur la page d'historiques ».
        */}
        <Link
          href="/historiques"
          aria-label={t.openFull}
          className="flex min-w-0 flex-1 items-center gap-1 py-1"
        >
          <h2 className="t-section-title truncate">{t.title}</h2>
          <ChevronDownIcon
            width={14}
            height={14}
            className="-rotate-90 flex-none text-text-tertiary"
          />
        </Link>

        <button
          type="button"
          aria-label={t.sortLabel}
          onClick={() => setSorting(true)}
          className="grid size-8 flex-none place-items-center text-text-tertiary"
        >
          <MoreVerticalIcon width={18} height={18} />
        </button>
      </div>

      {status === "loading" ? (
        <Skeleton className="h-12 w-full" rounded="rounded-[14px]" />
      ) : status === "error" ? (
        <p className="t-secondary text-text-secondary">{m.transactions.list.loadError}</p>
      ) : sorted.length === 0 ? (
        <p className="t-secondary text-text-secondary">{t.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col">
            {visible.map((tx) => (
              <li key={tx.id}>
                <RecentRow
                  tx={tx}
                  today={today}
                  locale={locale}
                  m={m}
                  currency={currency}
                  onOpen={() => router.push(`/historiques/${tx.id}`)}
                  onOptions={() => setMenuFor(tx)}
                />
              </li>
            ))}
          </ul>

          {/*
            Le bouton EST en bas, sous les lignes, comme sur la maquette — et
            non dans l'en-tête où il servait de lien vers un autre écran.
          */}
          {showToggle ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mx-auto flex items-center gap-1 py-1.5 text-[13px] font-semibold text-brand-accent"
            >
              {expanded ? t.seeLess : t.seeMore}
              <ChevronDownIcon
                width={14}
                height={14}
                className={expanded ? "rotate-180" : ""}
              />
            </button>
          ) : null}

          {/* La période dépasse ce qu'on charge d'un coup : on le dit, plutôt que
              de laisser croire que la liste dépliée est complète. */}
          {expanded && truncated ? (
            <p className="t-secondary text-center text-text-tertiary">{t.truncated}</p>
          ) : null}
        </>
      )}

      {sorting ? (
        <ActionSheet
          title={t.sortLabel}
          cancelLabel={m.common.cancel}
          onCancel={() => setSorting(false)}
          actions={SORTS.map((s) => ({
            label: sortLabels[s],
            onSelect: () => {
              setSort(s);
              setSorting(false);
            },
          }))}
        />
      ) : null}

      {menuFor ? (
        <ActionSheet
          title={menuFor.category?.name ?? t.title}
          cancelLabel={m.common.cancel}
          onCancel={() => setMenuFor(null)}
          actions={[
            {
              label: t.menuDetails,
              onSelect: () => {
                const id = menuFor.id;
                setMenuFor(null);
                router.push(`/historiques/${id}`);
              },
            },
            {
              label: m.common.edit,
              onSelect: () => {
                const id = menuFor.id;
                setMenuFor(null);
                router.push(`/transactions/${id}/modifier`);
              },
            },
            {
              label: m.common.delete,
              tone: "danger",
              onSelect: () => {
                setPendingDelete(menuFor);
                setMenuFor(null);
              },
            },
          ]}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteConfirmSheet
          label={
            pendingDelete.category?.name ??
            (directionOf(pendingDelete.type) === "neutral"
              ? `${pendingDelete.source_account?.name} → ${pendingDelete.destination_account?.name}`
              : (pendingDelete.source_account?.name ??
                pendingDelete.destination_account?.name ??
                t.title))
          }
          amount={formatBalance(pendingDelete.amount, currency)}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {toast.node}
    </section>
  );
}

/**
 * Une ligne. Composant à part parce que `useLongPress` est un hook — il lui faut
 * un composant par ligne, pas un appel dans un `.map()`.
 *
 * Pas de swipe-supprimer ici, à la différence de l'écran Historiques : sur le
 * Dashboard un balayage horizontal appartient au menu de navigation
 * (`lib/nav/gesture.ts`), et deux gestes concurrents sur le même doigt donnent
 * un tirage au sort.
 */
function RecentRow({
  tx,
  today,
  locale,
  m,
  currency,
  onOpen,
  onOptions,
}: {
  tx: TxListItem;
  today: string;
  locale: Locale;
  m: ReturnType<typeof useMessages>;
  currency: CurrencyCode;
  onOpen: () => void;
  onOptions: () => void;
}) {
  const press = useLongPress(onOptions);

  return (
    <button
      type="button"
      {...press.handlers}
      onClick={() => {
        // Sans ce garde, l'appui long ouvrirait le menu ET le détail derrière.
        if (press.swallowClick()) return;
        onOpen();
      }}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-icon)] px-1 py-2 text-left transition-colors active:bg-surface-field/70 motion-reduce:transition-none ${press.pressClassName}`}
    >
      <TxRowContent tx={tx} today={today} locale={locale} m={m} currency={currency} />
    </button>
  );
}
