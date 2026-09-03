"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PlusIcon } from "@/components/nav/icons";
import { ProjectFormSheet } from "@/components/projects/ProjectFormSheet";
import { ProjectListRow } from "@/components/projects/ProjectListRow";
import { ManageEmptyState } from "@/components/ui/ManageEmptyState";
import { NightScreen } from "@/components/ui/NightScreen";
import { SelectField } from "@/components/transactions/SelectField";
import { SheetButton } from "@/components/transactions/SheetButton";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  PROJECT_SORTS,
  sortProjects,
  type ProjectSort,
} from "@/lib/projects/model";
import { createProjectRequest, useProjects } from "@/lib/projects/useProjects";
import { useToast } from "@/components/ui/Toast";
import { useMessages } from "@/lib/i18n/useMessages";

export function ProjectsScreen() {
  const m = useMessages();
  const t = m.projects;
  const router = useRouter();
  const toast = useToast();
  const { projects, status, reload } = useProjects();

  const [sort, setSort] = useState<ProjectSort>("recent");
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => sortProjects(projects, sort), [projects, sort]);
  const hasAny = status === "ready" && projects.length > 0;

  return (
    <NightScreen
      title={t.title}
      right={
        <button
          type="button"
          aria-label={t.form.createTitle}
          onClick={() => setCreating(true)}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/10"
        >
          <PlusIcon width={18} height={18} />
        </button>
      }
      contentClassName="overflow-hidden"
    >
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {hasAny ? (
          <div className="flex-none px-4 pt-4">
            <div className="w-44">
              <SelectField
                ariaLabel={t.sortLabel}
                value={sort}
                placeholder={t.sorts.recent}
                options={PROJECT_SORTS.map((s) => ({ value: s, label: t.sorts[s] }))}
                onSelect={(v) => setSort(v as ProjectSort)}
              />
            </div>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4">
          {status === "loading" ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full" rounded="rounded-[20px]" />
              ))}
            </div>
          ) : status === "error" ? (
            <ManageEmptyState
              title={t.loadErrorTitle}
              body={t.loadErrorBody}
              action={<SheetButton variant="ghost" onClick={reload}>{m.common.retry}</SheetButton>}
            />
          ) : projects.length === 0 ? (
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
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => router.push(`/projets/${p.id}`)}
                  className="rounded-[var(--radius-card)] bg-surface-card text-left"
                >
                  <ProjectListRow project={p} />
                </button>
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
        <ProjectFormSheet
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createProjectRequest(payload);
            toast.show(t.createdToast);
            reload();
          }}
        />
      ) : null}
    </NightScreen>
  );
}
