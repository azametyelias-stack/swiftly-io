"use client";

import { useEffect, useRef } from "react";

import { SheetButton } from "@/components/transactions/SheetButton";

/**
 * Menu d'actions contextuel, ouvert par un appui long sur une ligne de liste
 * (SCREEN-14 § 6 : « Appui long → Modifier / Supprimer / Ouvrir »).
 *
 * Même langage visuel que `ConfirmDialog` — nappe sombre, feuille qui monte du
 * bas, même z-index — parce que c'est le même moment d'interaction : l'écran
 * attend une réponse avant de continuer.
 */

export interface SheetAction {
  label: string;
  onSelect: () => void;
  /** `danger` pour une action destructrice (rouge, et placée en dernier). */
  tone?: "default" | "danger";
}

export function ActionSheet({
  title,
  actions,
  cancelLabel,
  onCancel,
}: {
  /** Ce sur quoi on agit — le nom de la ligne, pas un titre générique. */
  title: string;
  actions: SheetAction[];
  cancelLabel: string;
  onCancel: () => void;
}) {
  /*
   * Le clic fantôme.
   *
   * Cette feuille s'ouvre sur un APPUI LONG, donc pendant que le doigt est
   * encore posé. Au relâchement, le navigateur envoie un `click` aux
   * coordonnées du doigt — c'est-à-dire sur la nappe qui vient d'apparaître
   * dessous. Sans garde, le menu se refermait dans l'instant où il s'ouvrait ;
   * et si le doigt s'était trouvé plus bas, ce clic aurait déclenché une action
   * que personne n'a choisie.
   *
   * On exige donc un appui complet : rien ne réagit tant que ce panneau n'a pas
   * reçu son propre `pointerdown`. Le clic fantôme n'en a pas — le sien
   * appartient à la ligne, avant que ce composant n'existe.
   */
  const armed = useRef(false);

  // Échap ferme, comme toute surface modale de l'app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onPointerDownCapture={() => {
        armed.current = true;
      }}
    >
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={() => armed.current && onCancel()}
        className="absolute inset-0 bg-[rgba(4,7,40,0.55)] backdrop-blur-[2px]"
      />

      <div
        className="sheet-rise relative m-4 w-full max-w-[420px] rounded-[var(--radius-content-top)] bg-surface-page p-5 shadow-[0_30px_60px_rgba(2,4,24,0.5)]"
        style={{ marginBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <p className="truncate px-1 pb-3 text-center text-[15px] font-semibold">{title}</p>

        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <SheetButton
              key={action.label}
              variant={action.tone === "danger" ? "danger" : "ghost"}
              onClick={() => armed.current && action.onSelect()}
            >
              {action.label}
            </SheetButton>
          ))}
        </div>

        <div className="mt-4">
          <SheetButton variant="primary" onClick={() => armed.current && onCancel()}>
            {cancelLabel}
          </SheetButton>
        </div>
      </div>
    </div>
  );
}
