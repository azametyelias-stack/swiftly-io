# `public/brand` — shared identity assets

Source: `docs/3-PRODUCT (Design et Wireframes)/DESIGN-HANDOFF/design/assets/`.
Reference: `DESIGN-GLOBAL.md` (le fond d'écran partagé).

| File | Use |
| --- | --- |
| `nuit.jpg` | Night navy gradient — the identity zone. Full-bleed on SCREEN-01 (Landing) with a black bottom overlay; a header band on SCREEN-02/03; the dashboard header + logo pill. Same asset, cropped differently per screen. |
| `objectif-spheres.jpg` | **Plus référencé** — ancien fond du bandeau « objectif ». |
| `objectif-spheres-2.jpg` | **Plus référencé** — idem, second slide. |

Les deux `objectif-spheres*.jpg` ont été débranchés le 2026-09-16 : la carte
« Objectif du mois » a été redessinée (maquette d'Elias) et son fond est
maintenant vectoriel — `components/dashboard/ObjectiveArt.tsx` plus les halos de
`RotatingBanner.tsx`. La raison est fonctionnelle, pas esthétique : la teinte de
la carte change à chaque objectif (`lib/dashboard/bannerTheme.ts`), et une photo
aurait demandé un fichier par couleur. Les fichiers restent au dépôt tant qu'on
n'a pas confirmé qu'on n'y reviendra pas.

**Serving** — one static file, referenced through `next/image`, which emits
`srcset` + AVIF/WebP at request time and lets the browser cache it across
navigations (so no per-page reload, per `DESIGN-GLOBAL.md` § 3). The identity
zone never theme-flips: this gradient is the same in light and dark, and amounts
on it use `--ink-in` (the green for ink/night), not `--semantic-in`.

The `NightBackdrop` component that wraps this is introduced with Lot 1 (P5).
