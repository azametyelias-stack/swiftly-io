"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronDownIcon, MoreVerticalIcon, PlusIcon } from "@/components/nav/icons";
import { TemplateFormSheet } from "@/components/templates/TemplateFormSheet";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, type CurrencyCode } from "@/lib/format/money";
import {
  templateUpdatePayload,
  type TemplateListItem,
} from "@/lib/templates/model";
import {
  createTemplateRequest,
  deleteTemplateRequest,
  updateTemplateRequest,
  useTemplates,
} from "@/lib/templates/useTemplates";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";
import { useLongPress } from "@/lib/ui/useLongPress";

/**
 * La bande Templates du Dashboard (SCREEN-4 § 8, maquette `04-dashboard.png`) :
 * une cellule « créer » en pointillés, puis une carte par template (bordure
 * haute rouge = dépense, verte = revenu).
 *
 * Trois comportements que le doc § 8 demande et qui manquaient :
 *
 *  1. **« + Créer un template » ouvre le formulaire ICI.** Il faisait
 *     `router.push("/templates")` — au mieux ça menait à la LISTE, jamais au
 *     formulaire ; Elias, lui, ne voyait rien se passer du tout.
 *  2. **Les trois points en haut à droite de chaque carte**, comme sur la
 *     maquette. C'est aussi le seul accès aux options à la souris et au
 *     clavier : un appui long n'existe pas là.
 *  3. **L'appui long** ouvre le même menu (« icône 3 points OU appui long »).
 *
 * Le tap simple, lui, ne bouge pas : il lance la transaction pré-remplie.
 */
export function TemplatesCarousel({ currency = "XOF" }: { currency?: CurrencyCode }) {
  const m = useMessages();
  const t = m.dashboard.templates;
  const router = useRouter();
  const toast = useToast();
  const { templates, reload } = useTemplates();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateListItem | null>(null);
  const [menuFor, setMenuFor] = useState<TemplateListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const launch = (tpl: TemplateListItem) =>
    router.push(`/transactions/nouvelle?template=${tpl.id}`);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteTemplateRequest(pendingDelete.id);
      toast.show(m.templates.deletedToast);
      reload();
    } catch {
      toast.show(m.common.genericError);
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  return (
    <>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-[156px] w-[104px] flex-none flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-surface-rail bg-surface-card"
        >
          <span className="grid size-9 place-items-center rounded-[12px] bg-surface-field">
            <PlusIcon width={18} height={18} />
          </span>
          <span className="px-2 text-center text-[12px] font-semibold leading-tight text-text-secondary">
            {t.create}
          </span>
        </button>

        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            template={tpl}
            currency={currency}
            optionsLabel={t.options}
            onLaunch={() => launch(tpl)}
            onOptions={() => setMenuFor(tpl)}
          />
        ))}
      </div>

      {menuFor ? (
        <ActionSheet
          title={menuFor.name}
          cancelLabel={m.common.cancel}
          onCancel={() => setMenuFor(null)}
          actions={[
            {
              label: m.templates.menuOpen,
              onSelect: () => {
                const tpl = menuFor;
                setMenuFor(null);
                launch(tpl);
              },
            },
            {
              label: m.common.edit,
              onSelect: () => {
                setEditing(menuFor);
                setMenuFor(null);
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

      {creating ? (
        <TemplateFormSheet
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createTemplateRequest(payload);
            toast.show(m.templates.createdToast);
            reload();
          }}
        />
      ) : null}

      {editing ? (
        <TemplateFormSheet
          template={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            // `templateUpdateSchema` est `.strict()` et ne déclare PAS `kind` :
            // envoyer le payload de création tel quel faisait échouer toute
            // modification par un 400 (piège du 2026-09-08).
            await updateTemplateRequest(editing.id, templateUpdatePayload(payload));
            toast.show(m.common.savedToast);
            reload();
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={m.templates.deleteTitle}
          body={interpolate(m.templates.deleteBody, { name: pendingDelete.name })}
          confirmLabel={m.common.delete}
          cancelLabel={m.common.cancel}
          busy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {toast.node}
    </>
  );
}

/**
 * Une carte. Composant à part parce que `useLongPress` est un hook : il lui
 * faut un composant par carte, pas un appel dans un `.map()`.
 *
 * La carte n'est plus un `<button>` : elle en contient deux (la surface de tap
 * et les trois points), et imbriquer des boutons est du HTML invalide — le
 * navigateur défait l'imbrication et le résultat ne réagit plus. D'où la
 * disposition en calques : une surface de tap qui couvre tout DESSOUS, le
 * contenu au-dessus mais transparent au doigt, et les trois points par-dessus.
 */
function TemplateCard({
  template: tpl,
  currency,
  optionsLabel,
  onLaunch,
  onOptions,
}: {
  template: TemplateListItem;
  currency: CurrencyCode;
  optionsLabel: string;
  onLaunch: () => void;
  onOptions: () => void;
}) {
  const isExpense = tpl.kind === "expense";
  const press = useLongPress(onOptions);

  return (
    <div
      {...press.handlers}
      className={`relative flex h-[156px] w-[136px] flex-none flex-col gap-2 rounded-[var(--radius-card)] border border-surface-divider bg-surface-card p-3 text-left ${press.pressClassName}`}
      style={{
        borderTopWidth: 3,
        borderTopColor: isExpense ? "var(--semantic-out)" : "var(--semantic-in)",
      }}
    >
      <button
        type="button"
        aria-label={tpl.name}
        onClick={() => {
          if (press.swallowClick()) return;
          onLaunch();
        }}
        className="absolute inset-0 z-0 rounded-[var(--radius-card)]"
      />

      <div className="pointer-events-none relative z-10 flex h-full flex-col gap-2">
        <span
          className="grid size-9 flex-none place-items-center rounded-[12px] text-[13px] font-bold text-white"
          style={{ backgroundColor: tpl.category?.color ?? "var(--text-tertiary)" }}
        >
          {(tpl.category?.name ?? tpl.name).slice(0, 1).toUpperCase()}
        </span>
        {/* `pr-5` : la place des trois points, pour qu'un nom long passe
            dessous au lieu de se glisser derrière. */}
        <span className="line-clamp-1 pr-5 text-[14px] font-semibold">{tpl.name}</span>
        <span className="line-clamp-2 flex-1 text-[12px] leading-tight text-text-tertiary">
          {tpl.description || tpl.category?.name || ""}
        </span>
        <span className="flex items-center justify-between">
          <span
            className={`text-[14px] font-bold tabular ${
              isExpense ? "text-semantic-out" : "text-semantic-in"
            }`}
          >
            {formatMoney(tpl.amount, { currency, sign: isExpense ? "out" : "in" })}
          </span>
          <ChevronDownIcon width={14} height={14} className="-rotate-90 text-text-tertiary" />
        </span>
      </div>

      <button
        type="button"
        aria-label={optionsLabel}
        onClick={(e) => {
          e.stopPropagation();
          onOptions();
        }}
        className="absolute right-0.5 top-0.5 z-20 grid size-8 place-items-center text-text-tertiary"
      >
        <MoreVerticalIcon width={16} height={16} />
      </button>
    </div>
  );
}
