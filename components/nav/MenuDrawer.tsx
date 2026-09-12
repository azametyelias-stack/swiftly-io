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
 * Refonte du 2026-09-11, fond repris le 2026-09-12. Le menu n'est plus un
 * tiroir posé sous l'écran : c'est LE SOL de l'app, et la carte se range
 * dessus. Il a d'abord porté la photo de nuit ; Elias l'a voulu blanc — c'est
 * `--surface-elev`, le jeton dont la définition dit justement « modal sheets,
 * drawer ». Le contraste avec la carte tient tout seul : elle est en
 * `--surface-page` (#EBEBEF), un cran plus sombre, et porte son ombre portée.
 *
 * Trois choses, toutes voulues :
 *
 *  - le blanc va jusqu'en haut, barre d'état comprise. J'avais posé là le
 *    bandeau `--brand-deep` d'`AppHeader`, parce qu'en `black-translucent` iOS
 *    peint l'heure et la batterie en BLANC, en dur — il n'adapte la couleur des
 *    glyphes au fond que dans Safari, jamais en app installée. Elias l'a
 *    tranché le 2026-09-12 en connaissance de cause : il préfère le menu d'un
 *    seul tenant. **Ne pas le remettre de sa propre initiative** ; si l'heure
 *    manque un jour, c'est la contrepartie assumée, et le bandeau tient en une
 *    ligne ;
 *  - pas de pilules. L'entrée courante se signale par un point et une opacité
 *    pleine, les autres s'effacent à 55 % : un contour par entrée ferait une
 *    grille de cages ;
 *  - le panneau est en `fixed`. En `absolute` il faisait la hauteur de la
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

  /*
   * La pastille des deux boutons de tête. Sur la nuit c'était du verre —
   * `border-white/20 bg-white/10` ; sur blanc, un blanc translucide sur du
   * blanc ne dessine rien. Elle prend donc les jetons clairs, ceux des champs
   * et des séparateurs, et garde ses 44 px de cible.
   */
  const glass =
    "grid size-11 flex-none place-items-center rounded-full border border-surface-divider bg-surface-field";

  return (
    <nav
      aria-label="Navigation principale"
      aria-hidden={!open}
      className="fixed inset-0 z-0 flex flex-col bg-surface-elev text-text-primary"
      // Ce que la carte laisse voir d'elle-même, plus une marge : au-delà, les
      // libellés passeraient sous la carte. `NAV_EDGE_BAND` plutôt qu'un 52
      // recopié — les deux valeurs DOIVENT bouger ensemble.
      style={{ paddingRight: `calc(${NAV_EDGE_BAND}px + var(--margin-screen, 16px))` }}
    >

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
                    className="absolute left-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-text-primary"
                  />
                )}
                <NavGlyph id={item.id} className={`shrink-0 ${dim}`} />
                <MarqueeText
                  text={item.label}
                  className={`min-w-0 flex-1 t-body font-semibold ${dim}`}
                />
                {item.id === "alerts" && unread > 0 ? (
                  /* Le couple clair de l'app : remplissage `--semantic-out-bg`,
                     chiffres `--semantic-out`, exactement comme `AlertRow` et
                     `ListRow`. Sur le fond de nuit il fallait le lire à
                     l'envers ; sur blanc il reprend sa forme normale. */
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
