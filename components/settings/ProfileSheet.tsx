"use client";

import { useState } from "react";

import { LockIcon } from "@/components/nav/icons";
import { SheetButton } from "@/components/transactions/SheetButton";
import { FormSheet } from "@/components/ui/FormSheet";
import { Avatar } from "@/components/settings/Avatar";
import { nameError, NAME_MAX } from "@/lib/settings/model";
import { useMessages } from "@/lib/i18n/useMessages";

/**
 * "Mon profil" — the one deferred write of SCREEN-22 (artboard: name and photo
 * are free text, "donc « Enregistrer » explicite"). Everything else on the
 * screen saves on tap.
 *
 * The email field is locked three ways at once, on purpose (artboard: "L'email
 * verrouillé porte un cadenas … trois signaux redondants, exprès"): grey fill,
 * grey text, padlock — because a field that is merely greyed out reads as a bug.
 * The line under it says when it will open, which is what turns a dead end into
 * a "not yet".
 */
export function ProfileSheet({
  name,
  email,
  busy,
  onSave,
  onClose,
}: {
  name: string;
  email: string | null;
  busy: boolean;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const m = useMessages();
  const s = m.settings;
  const [draft, setDraft] = useState(name);
  const [touched, setTouched] = useState(false);

  const err = nameError(draft);
  const showError = touched && err !== null;
  const errorText = err === "tooLong" ? s.nameTooLong : s.nameTooShort;

  return (
    <FormSheet
      title={s.profileTitle}
      onClose={onClose}
      closeLabel={m.common.cancel}
      footer={
        <>
          <SheetButton variant="ghost" className="flex-1" onClick={onClose} disabled={busy}>
            {m.common.cancel}
          </SheetButton>
          <SheetButton
            variant="primary"
            className="flex-1"
            disabled={busy || err !== null}
            onClick={() => onSave(draft.trim())}
          >
            {m.common.save}
          </SheetButton>
        </>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <Avatar name={draft} size={96} />
        {/* Photo upload needs a Supabase Storage bucket, which the MVP has not
            provisioned (SCREEN-22 § 10 leaves "où stocké ?" open). The avatar is
            the initials until then — an upload button that cannot upload would
            be worse than none. */}
        <p className="t-secondary text-text-tertiary">{s.photoLater}</p>
      </div>

      <label htmlFor="sf-name" className="mt-6 block t-label text-text-tertiary">
        {s.nameLabel}
      </label>
      <input
        id="sf-name"
        value={draft}
        maxLength={NAME_MAX}
        autoComplete="name"
        onChange={(e) => {
          setDraft(e.target.value);
          setTouched(true);
        }}
        aria-invalid={showError}
        aria-describedby="sf-name-hint"
        className="mt-1.5 h-[var(--size-select)] w-full rounded-[var(--radius-block)] border border-surface-rail bg-surface-card px-4 text-[16px] font-semibold outline-none focus-visible:shadow-[var(--ring-brand)]"
      />
      <p
        id="sf-name-hint"
        className={`mt-1.5 t-secondary ${showError ? "text-semantic-out" : "text-text-secondary"}`}
      >
        {showError ? errorText : s.nameHint}
      </p>

      <span className="mt-5 block t-label text-text-tertiary">{s.emailLabel}</span>
      <div className="mt-1.5 flex h-[var(--size-select)] items-center justify-between gap-3 rounded-[var(--radius-block)] bg-surface-field px-4">
        <span className="truncate text-[16px] text-text-tertiary">{email ?? "—"}</span>
        <LockIcon width={16} height={16} className="shrink-0 text-text-tertiary" />
      </div>
      <p className="mt-1.5 t-secondary text-text-secondary">{s.emailHint}</p>
    </FormSheet>
  );
}
