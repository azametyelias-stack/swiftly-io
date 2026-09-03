"use client";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatMoney } from "@/lib/format/money";
import { projectProgress, type ProjectListItem } from "@/lib/projects/model";
import { useMessages } from "@/lib/i18n/useMessages";

export function ProjectListRow({ project }: { project: ProjectListItem }) {
  const m = useMessages();
  const t = m.projects;
  const funded = project.allocated_amount + project.spent;
  const progress = projectProgress(funded, project.target_amount);

  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 flex-none place-items-center rounded-[var(--radius-icon)] bg-brand-deep text-[13px] font-bold text-ink-on-surface">
          {t.categories[project.category as "other"]?.[0] ?? "•"}
        </span>
        <span className="t-body flex-1 truncate font-semibold">{project.name}</span>
        {project.status !== "active" ? (
          <span className="t-label rounded-full bg-surface-field px-1.5 text-text-tertiary">
            {t.statuses[project.status]}
          </span>
        ) : null}
      </div>

      {project.description ? (
        <span className="t-secondary truncate text-text-tertiary">
          {project.description}
        </span>
      ) : null}

      {progress ? (
        <>
          <ProgressBar ratio={progress.ratio} tone={progress.tone} />
          <span className="t-secondary text-text-tertiary tabular">
            {formatMoney(funded, { sign: "none" })} /{" "}
            {formatMoney(project.target_amount ?? 0, { sign: "none" })} · {progress.percent} %
          </span>
        </>
      ) : (
        <span className="t-secondary text-text-tertiary tabular">
          {t.fundedLabel}: {formatMoney(funded, { sign: "none" })}
        </span>
      )}
    </div>
  );
}
