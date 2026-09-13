"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import { TONE_COLOR, type ProgressTone } from "@/components/ui/ProgressBar";

/**
 * Le bandeau « Objectif du mois » (SCREEN-4 § 7). Les items tournent toutes les
 * 30 s, se balayent à la main, affichent des points de position, se mettent en
 * pause dès qu'on y touche, et — pour un rapport prêt et non lu — clignotent et
 * passent en tête. Les urgents (budget au bord du dépassement…) devancent les
 * simples conseils.
 *
 * Il ne sait rien des budgets ni des projets : `ObjectivesBanner` lui apporte
 * des items déjà construits et ordonnés. Son état vide est un `ReactNode` que
 * l'appelant fournit, parce que sur le Dashboard c'est un BOUTON (« Fixez un
 * objectif » ouvre le formulaire) et qu'un composant de présentation n'a pas à
 * savoir ce qu'ouvre ce bouton.
 */

const ROTATE_MS = 30_000;
const RESUME_AFTER_MS = 20_000;
const SWIPE_PX = 40;

/**
 * Au-delà de ça, le doigt a glissé : ce n'est plus un tap, et la carte ne doit
 * pas naviguer. Sans ce garde, un balayage pour passer à l'objectif suivant
 * ouvrait aussi la fiche de l'objectif qu'on quittait.
 */
const TAP_SLOP = 8;

export interface BannerItem {
  id: string;
  label: string;
  title: string;
  caption?: string;
  /** 0–100 ; affiche la barre de progression */
  progress?: number;
  /** Couleur de la barre. Un budget vire à l'orange puis au rouge, une épargne reste verte. */
  tone?: ProgressTone;
  /** Sous la barre : « 75 000 F / 100 000 F » (maquette `04-dashboard.png`). */
  detail?: string;
  href?: string;
  urgent?: boolean;
  blink?: boolean;
}

function ordered(items: BannerItem[]): BannerItem[] {
  return [...items].sort((a, b) => {
    const rank = (i: BannerItem) => (i.blink ? 0 : i.urgent ? 1 : 2);
    return rank(a) - rank(b);
  });
}

export function RotatingBanner({
  items,
  empty,
}: {
  items: BannerItem[];
  empty?: ReactNode;
}) {
  const sorted = ordered(items);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused || sorted.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % sorted.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, sorted.length]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  const interact = () => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    if (
      Math.abs(e.clientX - start.x) > TAP_SLOP ||
      Math.abs(e.clientY - start.y) > TAP_SLOP
    ) {
      moved.current = true;
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || sorted.length <= 1) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) < SWIPE_PX) return;
    interact();
    setIndex((i) =>
      dx < 0 ? (i + 1) % sorted.length : (i - 1 + sorted.length) % sorted.length,
    );
  };

  if (sorted.length === 0) return <>{empty ?? null}</>;

  /*
   * L'index est RAMENÉ dans les bornes à la lecture, pas corrigé par un effet.
   *
   * Un objectif supprimé ailleurs raccourcit la liste, et `index` peut alors
   * pointer au-delà de la fin. Le remettre à zéro depuis un `useEffect`
   * marcherait, mais au prix d'un rendu de plus à chaque fois — et le projet
   * s'interdit `setState` dans un effet (règle `react-hooks/set-state-in-effect`,
   * même raison que dans `useDashboard`). Une valeur dérivée règle la chose sans
   * rendu supplémentaire, et le prochain tour de rotation replace `index` dans
   * les bornes tout seul.
   */
  const activeIndex = Math.min(index, sorted.length - 1);
  const active = sorted[activeIndex]!;
  const barColor = TONE_COLOR[active.tone ?? "green"];

  const card = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={interact}
      className={[
        "flex flex-col gap-2 rounded-[16px] bg-brand-accent p-3.5 text-ink-on-surface",
        "bg-[linear-gradient(100deg,rgba(15,32,150,0.9)_0%,rgba(21,43,199,0.62)_48%,rgba(6,9,45,0.55)_100%)]",
        active.blink ? "animate-[sf-blink_1.2s_ease-in-out_infinite] motion-reduce:animate-none" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-white/15 text-[13px]">
          {active.urgent ? "!" : "★"}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="t-label text-ink-on-surface/60">{active.label}</span>
          <span className="truncate text-[15px] font-semibold">{active.title}</span>
        </span>
        {active.caption ? (
          <span className="ml-auto flex-none text-[12px] text-ink-on-surface/75 tabular">
            {active.caption}
          </span>
        ) : null}
      </div>

      {typeof active.progress === "number" ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <span
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-valuenow={Math.round(active.progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(0, Math.min(100, active.progress))}%`,
                  background: barColor,
                }}
              />
            </span>
            <span className="flex-none text-[12px] font-semibold text-ink-on-surface/80 tabular">
              {Math.round(active.progress)} %
            </span>
          </div>
          {/* Les montants sous la barre, comme sur `04-dashboard.png`. */}
          {active.detail ? (
            <span className="text-[12px] text-ink-on-surface/70 tabular">
              {active.detail}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {active.href ? (
        <Link
          href={active.href}
          className="block"
          // Le balayage qui fait tourner le bandeau se termine par un `click` :
          // sans ça, changer d'objectif ouvrait la fiche de celui qu'on quitte.
          onClick={(e) => {
            if (moved.current) e.preventDefault();
          }}
        >
          {card}
        </Link>
      ) : (
        card
      )}
      {sorted.length > 1 ? (
        // `flex-wrap` : au-delà d'une quinzaine d'objectifs la rangée de points
        // dépasserait la largeur du téléphone. Elle passe à la ligne plutôt que
        // de déborder — aucun plafond arbitraire sur le nombre d'objectifs.
        <div className="flex flex-wrap justify-center gap-1.5">
          {sorted.map((it, i) => (
            <span
              key={it.id}
              className={`h-1 rounded-full transition-all ${
                i === activeIndex ? "w-3.5 bg-text-primary" : "w-1 bg-text-quaternary"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
