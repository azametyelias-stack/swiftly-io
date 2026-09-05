"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/nav/AppHeader";
import { LogoutIcon } from "@/components/nav/icons";
import { Avatar } from "@/components/settings/Avatar";
import { ChoiceSheet } from "@/components/settings/ChoiceSheet";
import { ProfileSheet } from "@/components/settings/ProfileSheet";
import {
  SettingActionRow,
  SettingExternalRow,
  SettingGroup,
  SettingNavRow,
  SettingToggleRow,
  SettingValueRow,
} from "@/components/settings/SettingRow";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { interpolate } from "@/lib/i18n";
import { useMessages } from "@/lib/i18n/useMessages";
import {
  APP_VERSION,
  CURRENCIES,
  LANGUAGES,
  SUPPORT_EMAIL,
  TERMS_URL,
  type ProfilePatch,
  type SettingsCurrency,
  type SettingsLanguage,
} from "@/lib/settings/model";
import { setThemeChoice } from "@/lib/settings/theme";
import { useProfile } from "@/lib/settings/useProfile";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * SCREEN-22 — Paramètres. The last screen of the MVP, and the artboard's own
 * point about it (`Lot 9 Paramètres utilisateur.dc.html`) is that it is the
 * simplest component of the nine lots and therefore has to be the strictest:
 * any exception shows immediately in a column of identical rows.
 *
 * So the structure is four groups of `SettingRow`s and exactly one thing that is
 * not a row — the profile card, "la seule chose de l'écran qui identifie une
 * personne : elle mérite sa propre surface avant que la liste commence".
 *
 * Currency / language / theme write on tap and confirm with a toast; the name
 * (free text) writes behind an explicit "Enregistrer"; logging out — the only
 * irreversible action here — is the one thing that asks first.
 */
export function SettingsScreen() {
  const m = useMessages();
  const s = m.settings;
  const router = useRouter();
  const toast = useToast();
  const { profile, status, reload, save } = useProfile();

  const [picker, setPicker] = useState<"currency" | "language" | null>(null);
  const [editing, setEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const commit = async (patch: ProfilePatch, successMessage: string) => {
    const okay = await save(patch);
    toast.show(okay ? successMessage : s.saveError);
    return okay;
  };

  if (status === "loading") {
    return (
      <Shell title={s.title}>
        <Skeleton className="h-[104px] w-full" rounded="rounded-[var(--radius-card)]" />
        <Skeleton className="h-[168px] w-full" rounded="rounded-[var(--radius-card)]" />
        <Skeleton className="h-[224px] w-full" rounded="rounded-[var(--radius-card)]" />
      </Shell>
    );
  }

  if (status === "error" || !profile) {
    return (
      <Shell title={s.title}>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="t-body text-text-secondary">{s.loadError}</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-[var(--radius-pill)] border border-surface-rail px-4 py-2 text-[13px] font-semibold"
          >
            {m.common.retry}
          </button>
        </div>
      </Shell>
    );
  }

  const logout = async () => {
    setLoggingOut(true);
    await getBrowserClient()?.auth.signOut();
    // Full navigation, not router.push: the session is gone, so every mounted
    // client component still holding the old user must be torn down
    // (SCREEN-22 § 3 — "efface session, redirect vers Landing").
    window.location.assign("/");
  };

  return (
    <Shell title={s.title}>
      {/* The profile card — the screen's one non-row surface. */}
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={s.editProfile}
        className="flex w-full items-center gap-4 rounded-[var(--radius-card)] bg-surface-card p-[var(--pad-card)] text-left"
      >
        <Avatar name={profile.name} size={72} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[22px] font-bold tracking-[-0.02em]">
            {profile.name}
          </span>
          <span className="truncate text-[14px] text-text-secondary">
            {profile.email ?? "—"}
          </span>
        </span>
      </button>

      <SettingGroup title={s.prefsTitle}>
        <SettingValueRow
          label={s.currencyRow}
          value={s.currencyNames[profile.preferred_currency]}
          onClick={() => setPicker("currency")}
        />
        <SettingValueRow
          label={s.languageRow}
          value={s.languageNames[profile.language]}
          onClick={() => setPicker("language")}
        />
        <SettingToggleRow
          label={s.darkTheme}
          checked={profile.theme === "dark"}
          onChange={(next) => {
            const theme = next ? "dark" : "light";
            // Paint first, persist second: the switch has to move under the
            // finger, and `data-theme` is what actually recolours the app.
            setThemeChoice(theme);
            void commit({ theme }, s.saved);
          }}
        />
      </SettingGroup>

      <SettingGroup title={s.helpTitle}>
        <SettingNavRow label={s.helpFaq} href="/aides" />
        <SettingNavRow label={s.privacy} href="/privacy" />
        <SettingExternalRow label={s.terms} href={TERMS_URL} />
        <SettingExternalRow label={s.support} href={`mailto:${SUPPORT_EMAIL}`} />
      </SettingGroup>

      {/* "Un seul rouge, tout en bas" — its own block, with air above it. */}
      <div className="pt-3">
        <SettingGroup>
          <SettingActionRow
            label={s.logout}
            icon={<LogoutIcon width={18} height={18} />}
            onClick={() => setConfirmLogout(true)}
          />
        </SettingGroup>
      </div>

      <p className="pb-4 pt-2 text-center t-secondary text-text-tertiary">
        {interpolate(s.version, { version: APP_VERSION })}
      </p>

      {picker === "currency" ? (
        <ChoiceSheet<SettingsCurrency>
          title={s.currencyTitle}
          hint={s.currencyHint}
          value={profile.preferred_currency}
          closeLabel={m.common.cancel}
          onClose={() => setPicker(null)}
          options={CURRENCIES.map((c) => ({
            value: c,
            label: s.currencyNames[c],
            description: s.currencyDescriptions[c],
          }))}
          onSelect={(preferred_currency) => {
            setPicker(null);
            void commit({ preferred_currency }, s.saved);
          }}
        />
      ) : null}

      {picker === "language" ? (
        <ChoiceSheet<SettingsLanguage>
          title={s.languageTitle}
          hint={s.languageHint}
          value={profile.language}
          closeLabel={m.common.cancel}
          onClose={() => setPicker(null)}
          options={LANGUAGES.map((l) => ({
            value: l,
            label: s.languageNames[l],
            description: s.languageDescriptions[l],
          }))}
          onSelect={(language) => {
            setPicker(null);
            void commit({ language }, s.saved).then((okay) => {
              // The dictionary is picked from the profile at the root, so the
              // tree has to re-read it for the new language to take effect.
              if (okay) router.refresh();
            });
          }}
        />
      ) : null}

      {editing ? (
        <ProfileSheet
          name={profile.name}
          email={profile.email}
          busy={savingName}
          onClose={() => setEditing(false)}
          onSave={(name) => {
            setSavingName(true);
            void commit({ name }, s.nameSaved).then(() => {
              setSavingName(false);
              setEditing(false);
            });
          }}
        />
      ) : null}

      {confirmLogout ? (
        <ConfirmDialog
          title={s.logoutTitle}
          body={s.logoutBody}
          confirmLabel={s.logoutConfirm}
          cancelLabel={m.common.cancel}
          busy={loggingOut}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => void logout()}
        />
      ) : null}

      {toast.node}
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <AppHeader title={title} />
      <main className="mx-[var(--margin-screen)] flex flex-col gap-4 pb-10 pt-2">
        {children}
      </main>
    </>
  );
}
