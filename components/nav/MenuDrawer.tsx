"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS, activeNavItem } from "@/lib/nav/items";
import { NAV_EDGE_BAND } from "@/lib/nav/gesture";
import { MarqueeText } from "@/components/nav/MarqueeText";
import { CloseIcon, NavGlyph, UserIcon } from "@/components/nav/icons";
import { useNavShell } from "@/components/nav/useNavShell";
import { useUnreadAlerts } from "@/components/nav/useUnreadAlerts";

/**
 * The menu that lives under the current screen (SCREEN-05, design
 * `05-menu-navigation.png`).
 *
 * Refonte du 2026-09-11. Le menu n'est plus une surface claire posée sous
 * l'écran : c'est LE SOL de l'app, et il porte donc son identité — la même photo
 * de nuit et le même voile que `NightScreen`, texte et icônes en blanc. Trois
 * conséquences, toutes voulues :
 *
 *  - la barre d'état s'accorde enfin. `THEME_COLOR` vaut `--brand-deep` et iOS
 *    peint ses glyphes en blanc (`black-translucent`) : jusqu'ici, menu ouvert,
 *    ces glyphes blancs tombaient sur un fond `--surface-page` presque blanc ;
 *  - les pilules disparaissent. L'entrée courante se signale par un point et une
 *    opacité pleine, les autres s'effacent à 55 % — sur une photo, un contour
 *    par entrée ferait une grille de cages ;
 *  - le panneau passe en `fixed`. En `absolute` il faisait la hauteur de la
 *    coquille, c'est-à-dire celle de la PAGE : menu ouvert depuis le bas d'un
 *    long historique, on regardait le milieu d'un panneau dont les entrées
 *    étaient restées 2 000 px plus haut. Aucun ancêtre n'est transformé
 *    (`app/(app)/layout.tsx` → `RequireSession` → la coquille), donc `fixed`
 *    vaut bien ici la fenêtre. La carte, elle, reste au-dessus (z-10 > z-0).
 */
export function MenuDrawer() {
  const pathname = usePathname();
  const { open, closeMenu } = useNavShell();
  const active = activeNavItem(pathname);
  const unread = useUnreadAlerts(pathname);

  /** La pastille de verre de la barre de tête, telle qu'elle est partout ailleurs. */
  const glass =
    "grid size-11 flex-none place-items-center rounded-full border border-white/20 bg-white/10";

  return (
    <nav
      aria-label="Navigation principale"
      aria-hidden={!open}
      className="fixed inset-0 z-0 flex flex-col bg-brand-deep text-ink-on-surface"
      // Ce que la carte laisse voir d'elle-même, plus une marge : au-delà, les
      // libellés passeraient sous la carte. `NAV_EDGE_BAND` plutôt qu'un 52
      // recopié — les deux valeurs DOIVENT bouger ensemble.
      style={{ paddingRight: `calc(${NAV_EDGE_BAND}px + var(--margin-screen, 16px))` }}
    >
      {/* La photo de nuit et son voile, aux valeurs de `NightScreen` : c'est le
          même fond, pas un fond qui lui ressemble. `absolute` et non `fixed`
          comme là-bas — le panneau est déjà à la fenêtre, et `inset-0` se
          résout sur sa boîte de remplissage, marge de droite comprise. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/brand/nuit.jpg)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,10,60,0.5) 0%, rgba(6,10,60,0.72) 100%)",
        }}
      />

      <div className="relative flex flex-none items-center justify-between px-4 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <Link
          href="/parametres"
          onClick={closeMenu}
          aria-label="Profil et paramètres"
          className={glass}
        >
          <UserIcon width={26} height={26} />
        </Link>
        <button type="button" onClick={closeMenu} aria-label="Fermer le menu" className={glass}>
          <CloseIcon width={26} height={26} />
        </button>
      </div>

      <ul className="relative flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {NAV_ITEMS.map((item) => {
          const isActive = active?.id === item.id;
          /* Le point et l'opacité portent l'état courant à eux deux. L'opacité
             est posée sur le glyphe et le libellé, jamais sur la ligne : sinon
             elle emporterait la pastille d'alertes avec elle, et un compteur
             non lu à moitié effacé ne sert plus à rien. */
          const dim = isActive ? "opacity-100" : "opacity-55";
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative flex items-center gap-[var(--gap-icon-text,16px)]",
                  "min-h-14 rounded-[var(--radius-pill)] py-2 pl-8 pr-4",
                  "transition-opacity active:opacity-70",
                ].join(" ")}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white"
                  />
                )}
                <NavGlyph id={item.id} className={`shrink-0 ${dim}`} />
                <MarqueeText
                  text={item.label}
                  className={`min-w-0 flex-1 t-body font-semibold ${dim}`}
                />
                {item.id === "alerts" && unread > 0 ? (
                  /* Sur la nuit, `--semantic-out` (#A80010) disparaît : deux
                     sombres l'un sur l'autre. La pastille s'inverse donc —
                     remplissage clair, chiffres rouges — au lieu d'aller
                     chercher un rouge qui n'existe dans aucun jeton. */
                  <span
                    className="grid min-w-5 flex-none place-items-center rounded-full bg-semantic-out-bg px-1.5 text-[11px] font-bold text-semantic-out tabular"
                    aria-label={`${unread} non lues`}
                  >
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Le pied portait la bascule de theme, retiree avec le mode sombre
          (2026-09-06). La marge basse reste : elle degage l'indicateur
          d'accueil iOS sous la derniere entree du menu. */}
      <div aria-hidden className="relative flex-none pb-[calc(env(safe-area-inset-bottom)+16px)]" />
    </nav>
  );
}
