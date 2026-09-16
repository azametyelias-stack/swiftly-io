"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";

import { SummitArt, TargetArrowIcon } from "@/components/dashboard/ObjectiveArt";
import { type ProgressTone } from "@/components/ui/ProgressBar";
import { bannerTheme } from "@/lib/dashboard/bannerTheme";

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
 * La nuit de la carte (maquette d'Elias du 2026-09-16) : un fond quasi noir
 * légèrement bleuté, et DEUX halos de la teinte de l'objectif — un derrière le
 * disque en haut à gauche, un derrière les sommets en bas à droite. C'est ce
 * qui empêche la carte de virer à l'aplat noir quand la photo de fond a
 * disparu.
 *
 * `color-mix` plutôt que dix dégradés écrits à la main : la teinte arrive de
 * `bannerTheme()` et tout le reste en découle (voir ce module). Ajouter une
 * couleur ne touche donc pas à ce fichier.
 */
function cardSurface(accent: string): string {
  return [
    `radial-gradient(118% 152% at 4% 12%, color-mix(in srgb, ${accent} 22%, transparent) 0%, transparent 58%)`,
    `radial-gradient(86% 128% at 94% 98%, color-mix(in srgb, ${accent} 26%, transparent) 0%, transparent 60%)`,
    "linear-gradient(118deg, #101226 0%, #090B18 54%, #0B0E22 100%)",
  ].join(",");
}

/**
 * Le reste de la carte, dérivé de la même teinte. Les proportions viennent du
 * relevé de la maquette : disque à 24 % de teinte, piste de barre à 16 %, face
 * éclairée des sommets à 86 %, neige et montants tirés vers le blanc.
 */
function cardPaint(accent: string) {
  const mix = (pct: number, over: string) => `color-mix(in srgb, ${accent} ${pct}%, ${over})`;
  return {
    /** Le disque est opaque : la flèche s'en sert pour se découper dans les anneaux. */
    disc: mix(26, "#0C0D1E"),
    glyph: mix(72, "#ffffff"),
    railTrack: mix(16, "#0D0F26"),
    railFill: `linear-gradient(90deg, ${accent} 0%, ${mix(68, "#120A38")} 100%)`,
    amount: mix(80, "#ffffff"),
    /*
     * Le massif reste DERRIÈRE le texte : les trois plans montent de 13 % à
     * 62 % de teinte seulement. Une première version montait la face éclairée à
     * 86 % — les sommets passaient devant le titre au lieu de le porter, et sur
     * le vert (`--ink-in`, très saturé) la carte devenait illisible.
     */
    far: mix(13, "#0A0C1C"),
    face: mix(26, "#090B1A"),
    lit: mix(62, "#0B0D1E"),
    snow: mix(46, "#ffffff"),
  };
}

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

  /*
   * La teinte tient à la PLACE dans la rotation, pas à la nature de l'objectif :
   * bleu, puis vert, puis le reste de la palette. C'est la demande d'Elias du
   * 2026-09-16 — « pour ne pas que tout ce ressemble ». Seul un budget au rouge
   * échappe à la rotation ; `bannerTheme` s'en charge et est testé pour ça.
   */
  const theme = bannerTheme(activeIndex, active.tone);
  const paint = cardPaint(theme.accent);
  const progress = active.progress;

  const card = (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={interact}
      data-objective-card=""
      className={[
        "relative overflow-hidden rounded-[var(--radius-card)] text-ink-on-surface",
        active.blink ? "animate-[sf-blink_1.2s_ease-in-out_infinite] motion-reduce:animate-none" : "",
      ].join(" ")}
      style={{ background: cardSurface(theme.accent) }}
    >
      {/*
        Le massif, collé en bas à droite et DERRIÈRE le contenu. Sa hauteur est
        relative à la carte (comme sur la maquette, où il en occupe la plus
        grande part) ; sa largeur suit, `w-auto` — un massif étiré serait la
        première chose qu'on remarquerait.

        La maquette d'Elias est deux fois plus large que haute par rapport à un
        téléphone (852 × 147 relevés) : on ne peut pas garder À LA FOIS la
        hauteur relative du massif et son étroitesse. C'est la hauteur qui a été
        gardée — sans elle le drapeau tombe au niveau de la barre et le dessin
        ne se lit plus. Elle reste un pourcentage de la carte : quand la carte a
        été resserrée (retour du 2026-09-16, vu au téléphone), le massif a suivi
        sans qu'on y touche.
      */}
      <SummitArt
        far={paint.far}
        face={paint.face}
        lit={paint.lit}
        snow={paint.snow}
        className="pointer-events-none absolute bottom-0 right-0 h-[78%] w-auto"
      />

      {/*
        `items-start` et non `items-center` : sur la maquette le haut du disque
        est aligné sur le haut du libellé, pas sur le milieu de la colonne — le
        disque remonte donc vers le titre au lieu de flotter au centre.

        Toute cette colonne — disque, textes, espacements — a été ramenée aux
        trois quarts de sa première taille (retour d'Elias, vu sur son
        téléphone : trop haut, écritures trop grandes par rapport à la
        maquette). Un seul geste ne suffisait pas : la hauteur de la carte
        n'est pas posée en dur, elle est la SOMME de ces mesures — il fallait
        rapetisser chacune, pas fixer un `max-height` qui aurait coupé le bas.
      */}
      <div className="relative flex items-start gap-3 px-3.5 pb-2.5 pt-3.5">
        <span
          className="grid size-12 flex-none place-items-center rounded-full"
          style={{ background: paint.disc }}
        >
          <TargetArrowIcon color={paint.glyph} casing={paint.disc} width={26} height={26} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[11px] leading-3 text-ink-on-surface/65">
              {active.label}
            </span>
            {/* « Dépassé » : le seul mot que la maquette ne prévoyait pas, posé
                au bout du libellé plutôt qu'en pastille — il n'y a plus de
                pastille depuis que le disque porte la cible. */}
            {active.caption ? (
              <span
                className="ml-auto flex-none text-[10px] font-semibold tabular"
                style={{ color: paint.amount }}
              >
                {active.caption}
              </span>
            ) : null}
          </div>

          <span className="mt-1 truncate text-[16px] font-bold leading-5">{active.title}</span>

          {typeof progress === "number" ? (
            <>
              {/*
                La barre s'arrête AVANT les sommets — comme sur la maquette, où
                elle vient buter sur le premier pic. Sa largeur est donc bornée
                (elle n'occupe pas toute la colonne) : les montants, eux,
                courent jusqu'au bord et passent devant le massif.
              */}
              <span
                className="mt-1.5 block h-1.5 w-[64%] overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                style={{ background: paint.railTrack }}
              >
                <span
                  className="block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                  style={{
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    background: paint.railFill,
                  }}
                />
              </span>

              <div
                className="mt-2 flex items-baseline justify-between gap-2 text-[12px] font-semibold leading-4 tabular"
                style={{ color: paint.amount }}
              >
                <span className="truncate">{active.detail}</span>
                <span className="flex-none">{Math.round(progress)}%</span>
              </div>
            </>
          ) : null}
        </div>
      </div>
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
