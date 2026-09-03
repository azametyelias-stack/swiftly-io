"use client";

import { useState } from "react";

import { PlusIcon } from "@/components/nav/icons";
import { SelectField } from "@/components/transactions/SelectField";
import type { RefNamed } from "@/lib/transactions/useTxRefData";
import type { LinkedToType } from "@/lib/transactions/model";
import type { Messages } from "@/lib/i18n";

/**
 * "Lié à" (SCREEN-8/9 § 2): a Personnes / Projet toggle plus the matching
 * picker. Optional for an expense, required for a revenu. People can be created
 * on the fly.
 */
export function LinkedToField({
  m,
  linkedToType,
  linkedToId,
  onChange,
  people,
  projects,
  createPerson,
  required,
  invalid,
}: {
  m: Messages;
  linkedToType: LinkedToType | null;
  linkedToId: string | null;
  onChange: (type: LinkedToType | null, id: string | null) => void;
  people: RefNamed[];
  projects: RefNamed[];
  createPerson: (name: string) => Promise<RefNamed | null>;
  required: boolean;
  invalid: boolean;
}) {
  const t = m.transactions;
  const [tab, setTab] = useState<LinkedToType>(linkedToType ?? "person");
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);

  const list = tab === "person" ? people : projects;
  const selectValue = linkedToType === tab ? linkedToId : null;

  const submitNewPerson = async () => {
    const name = draftName.trim();
    if (name.length < 1 || busy) return;
    setBusy(true);
    const created = await createPerson(name);
    setBusy(false);
    if (created) {
      onChange("person", created.id);
      setAdding(false);
      setDraftName("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">{t.fields.linkedTo}</span>
        <span
          className={`text-[12px] font-semibold ${
            required ? "text-semantic-out" : "text-text-tertiary"
          }`}
        >
          {required ? t.fields.required : t.fields.optional}
        </span>
      </div>

      <SelectField
        ariaLabel={t.fields.linkedTo}
        value={selectValue}
        placeholder={required ? t.fields.selectSource : t.fields.linkedSelf}
        invalid={invalid}
        options={[
          ...(required
            ? []
            : [{ value: "__self__", label: t.fields.linkedSelf }]),
          ...list.map((x) => ({ value: x.id, label: x.name })),
        ]}
        onSelect={(v) => {
          if (v === "__self__") onChange(null, null);
          else onChange(tab, v);
        }}
      />
      {required && invalid ? (
        <span className="t-secondary text-semantic-out">
          {t.errors.linkedRequired}
        </span>
      ) : null}

      <div className="flex gap-3 pt-1">
        {(["person", "project"] as const).map((k) => {
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setAdding(false);
                if (linkedToType && linkedToType !== k) onChange(null, null);
              }}
              className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-[14px] font-semibold ${
                on ? "text-brand-accent" : "text-text-tertiary"
              }`}
            >
              {k === "person" ? t.fields.people : t.fields.project}
              <span
                className={`grid size-[18px] place-items-center rounded-full border-[1.5px] ${
                  on ? "border-brand-accent" : "border-text-quaternary"
                }`}
              >
                {on ? (
                  <span className="size-[9px] rounded-full bg-brand-accent" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "person" ? (
        adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitNewPerson()}
              placeholder={t.fields.personNamePlaceholder}
              className="h-11 flex-1 rounded-[var(--radius-icon)] border border-surface-rail bg-surface-card px-3 text-[15px] outline-none focus:border-brand-accent"
            />
            <button
              type="button"
              onClick={submitNewPerson}
              disabled={busy || draftName.trim().length < 1}
              className="h-11 rounded-[var(--radius-pill)] bg-brand-accent px-4 text-[14px] font-semibold text-ink-on-surface disabled:opacity-50"
            >
              {m.common.confirm}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-accent"
          >
            <PlusIcon width={14} height={14} />
            {t.fields.addPersonCta}
          </button>
        )
      ) : list.length === 0 ? (
        <span className="t-secondary text-text-tertiary">
          {t.fields.noProjects}
        </span>
      ) : null}
    </div>
  );
}
