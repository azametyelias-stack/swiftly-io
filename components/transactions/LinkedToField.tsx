"use client";

import { useState } from "react";

import { QuickCreateRow } from "@/components/transactions/QuickCreateRow";
import { SelectField } from "@/components/transactions/SelectField";
import type { RefNamed } from "@/lib/transactions/useTxRefData";
import type { LinkedToType } from "@/lib/transactions/model";
import type { Messages } from "@/lib/i18n";

/**
 * "Lié à" (SCREEN-8/9 § 2): a Personnes / Projet toggle plus the matching
 * picker. Optional for an expense, required for a revenu. Both a person and a
 * project can be created on the fly from the picker's pinned "+ Créer …" button
 * — no need to leave the wizard.
 */
export function LinkedToField({
  m,
  linkedToType,
  linkedToId,
  onChange,
  people,
  projects,
  createPerson,
  createProject,
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
  createProject: (name: string) => Promise<RefNamed | null>;
  required: boolean;
  invalid: boolean;
}) {
  const t = m.transactions;
  const [tab, setTab] = useState<LinkedToType>(linkedToType ?? "person");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(false);

  const list = tab === "person" ? people : projects;
  const selectValue = linkedToType === tab ? linkedToId : null;

  const submitNew = async (name: string): Promise<boolean> => {
    setError(false);
    const created =
      tab === "person" ? await createPerson(name) : await createProject(name);
    if (!created) {
      setError(true);
      return false;
    }
    onChange(tab, created.id);
    setAdding(false);
    return true;
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
        onCreate={{
          label:
            tab === "person"
              ? t.fields.createPersonCta
              : t.fields.createProjectCta,
          run: () => {
            setError(false);
            setAdding(true);
          },
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
                setError(false);
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

      {adding ? (
        <div className="flex flex-col gap-1.5">
          <QuickCreateRow
            placeholder={
              tab === "person"
                ? t.fields.personNamePlaceholder
                : t.fields.projectNamePlaceholder
            }
            confirmLabel={m.common.confirm}
            cancelLabel={m.common.cancel}
            onCancel={() => {
              setAdding(false);
              setError(false);
            }}
            onSubmit={submitNew}
          />
          {error ? (
            <span className="t-secondary text-semantic-out">
              {t.fields.createFailed}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
