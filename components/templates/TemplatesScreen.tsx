"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlusIcon } from "@/components/nav/icons";
import { TemplateFormSheet } from "@/components/templates/TemplateFormSheet";
import { TemplateListRow } from "@/components/templates/TemplateListRow";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ManageEmptyState } from "@/components/ui/ManageEmptyState";
import { NightScreen } from "@/components/ui/NightScreen";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { SwipeToDelete } from "@/components/ui/SwipeToDelete";
import { useToast } from "@/components/ui/Toast";
import {
  TEMPLATE_SORTS,
  matchesKindFilter,
  sortTemplates,
  templateUpdatePayload,
  type TemplateKindFilter,
  type TemplateListItem,
  type TemplateSort,
} from "@/lib/templates/model";
import {
  createTemplateRequest,
  deleteTemplateRequest,
  updateTemplateRequest,
  useTemplates,
} from "@/lib/templates/useTemplates";
import { useMessages } from "@/lib/i18n/useMessages";

export function TemplatesScreen() {
  const m = useMessages();
  const t = m.templates;
  const router = useRouter();
  const toast = useToast();
  const { templates, status, reload } = useTemplates();

  const [kind, setKind] = useState<TemplateKindFilter>("all");
  const [sort, setSort] = useState<TemplateSort>("recent");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TemplateListItem | null>(null);
  /** Ligne dont le menu d'appui long est ouvert (SCREEN-14 § 6). */
  const [menuFor, setMenuFor] = useState<TemplateListItem | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      sortTemplates(
        templates.filter((x) => matchesKindFilter(x.kind, kind)),
        sort,
      ),
    [templates, kind, sort],
  );

  /** Tap simple et action « Lancer » du menu mènent au même endroit (doc § 6). */
  const launch = (tpl: TemplateListItem) =>
    router.push(`/transactions/nouvelle?template=${tpl.id}`);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteTemplateRequest(pendingDelete.id);
      toast.show(t.deletedToast);
      reload();
    } catch {
      toast.show(m.common.genericError);
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  const hasAny = status === "ready" && templates.length > 0;

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
        {hasAny ? (
          <div className="flex flex-none gap-3 px-4 pt-4">
            <div className="flex-1">
              <SelectField
                ariaLabel={t.filterLabel}
                value={kind}
                placeholder={t.filters.all}
                options={(["all", "expense", "income"] as const).map((k) => ({
                  value: k,
                  label: t.filters[k],
                }))}
                onSelect={(v) => setKind(v as TemplateKindFilter)}
              />
            </div>
            <div className="flex-1">
              <SelectField
                ariaLabel={t.sortLabel}
                value={sort}
                placeholder={t.sorts.recent}
                options={TEMPLATE_SORTS.map((s) => ({ value: s, label: t.sorts[s] }))}
                onSelect={(v) => setSort(v as TemplateSort)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
          {status === "loading" ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" rounded="rounded-[20px]" />
              ))}
            </div>
          ) : status === "error" ? (
            <ManageEmptyState
              title={t.loadErrorTitle}
              body={t.loadErrorBody}
              action={<SheetButton variant="ghost" onClick={reload}>{m.common.retry}</SheetButton>}
            />
          ) : templates.length === 0 ? (
            <ManageEmptyState
              title={t.emptyTitle}
              body={t.emptyBody}
              action={
                <SheetButton variant="primary" onClick={() => setCreating(true)}>
                  {t.addCta}
                </SheetButton>
              }
            />
          ) : rows.length === 0 ? (
            <ManageEmptyState title={t.noResults} body="" />
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((tpl) => (
                <SwipeToDelete
                  key={tpl.id}
                  deleteLabel={m.common.delete}
                  onDelete={() => setPendingDelete(tpl)}
                  onOpen={() => launch(tpl)}
                  onLongPress={() => setMenuFor(tpl)}
                >
                  <TemplateListRow template={tpl} onEdit={() => setEditing(tpl)} />
                </SwipeToDelete>
              ))}
            </div>
          )}
        </div>

        {hasAny ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface-page from-40% to-transparent p-4 pt-8">
            <SheetButton variant="primary" className="pointer-events-auto" onClick={() => setCreating(true)}>
              <PlusIcon width={18} height={18} />
              {t.addCta}
            </SheetButton>
          </div>
        ) : null}
      </div>

      {toast.node}

      {creating ? (
        <TemplateFormSheet
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createTemplateRequest(payload);
            toast.show(t.createdToast);
            reload();
          }}
        />
      ) : null}

      {editing ? (
        <TemplateFormSheet
          template={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            // `kind` est immuable côté serveur — voir `templateUpdatePayload`.
            await updateTemplateRequest(editing.id, templateUpdatePayload(payload));
            toast.show(m.common.savedToast);
            reload();
          }}
        />
      ) : null}

      {menuFor ? (
        <ActionSheet
          title={menuFor.name}
          cancelLabel={m.common.cancel}
          onCancel={() => setMenuFor(null)}
          actions={[
            {
              label: t.menuOpen,
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

      {pendingDelete ? (
        <ConfirmDialog
          title={t.deleteTitle}
          body={t.deleteBody.replace("{name}", pendingDelete.name)}
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
