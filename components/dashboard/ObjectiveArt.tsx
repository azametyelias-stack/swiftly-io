/**
 * Les deux dessins de la carte « Objectif du mois », relevés sur la maquette
 * d'Elias du 2026-09-16 (fichier de référence mesuré au pixel, pas à l'œil) :
 * la cible fléchée dans son disque, et le massif au drapeau planté sur le plus
 * haut sommet.
 *
 * Du SVG et non des images : la teinte de la carte change à chaque objectif
 * (voir `lib/dashboard/bannerTheme.ts`). Une photo aurait figé le violet de la
 * maquette, et il aurait fallu dix fichiers pour dix couleurs. Ici la teinte
 * arrive en propriété et tout le dessin la suit.
 *
 * Les coordonnées viennent du relevé de la maquette, ramenées en pourcentage de
 * la carte puis en unités de `viewBox` — d'où les décimales.
 */

/**
 * La cible fléchée du disque de gauche.
 *
 * La flèche part du centre et sort par le haut à droite. Elle est tracée DEUX
 * fois : d'abord en `casing`, la couleur du disque, épaisse — c'est elle qui
 * creuse la découpe nette dans les anneaux qu'elle traverse, comme sur la
 * maquette. Sans ce premier passage, la flèche et les anneaux se touchent et
 * l'ensemble devient une tache à 24 px.
 */
export function TargetArrowIcon({
  color,
  casing,
  ...rest
}: { color: string; casing: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...rest}>
      <g stroke={color} strokeWidth="1.9">
        <circle cx="14.6" cy="17.4" r="10.2" />
        <circle cx="14.6" cy="17.4" r="6.4" />
        <circle cx="14.6" cy="17.4" r="2.7" />
      </g>

      {/* La découpe, puis la flèche par-dessus. */}
      <path
        d="M14.6 17.4 26 6"
        stroke={casing}
        strokeWidth="5.4"
        strokeLinecap="round"
      />
      <g stroke={color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.6 17.4 25.1 6.9" />
        <path d="M19.9 6.2h5.9v5.9" />
      </g>

      <circle cx="14.6" cy="17.4" r="1.5" fill={color} />

      {/* L'éclat au bout de la flèche. */}
      <path
        d="M28.4 1.6c.4 1.7.7 2 2.4 2.4-1.7.4-2 .7-2.4 2.4-.4-1.7-.7-2-2.4-2.4 1.7-.4 2-.7 2.4-2.4Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * Le massif au drapeau, collé en bas à droite de la carte.
 *
 * Trois plans, du plus lointain au plus proche, pour que les sommets ne fassent
 * pas une seule silhouette plate : un fond estompé, les quatre pics, puis la
 * face éclairée de chacun. Le `viewBox` va de la pointe du drapeau (y = 0) au
 * bas de la carte (y = 112) ; les x couvrent le quart droit de la carte.
 *
 * Aucun `overflow` n'est prévu ici : c'est la carte qui coupe, et c'est voulu —
 * les pics du bord touchent le bord.
 */
export function SummitArt({
  far,
  face,
  lit,
  snow,
  ...rest
}: {
  far: string;
  face: string;
  lit: string;
  snow: string;
} & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 126 112" fill="none" aria-hidden="true" preserveAspectRatio="xMaxYMax meet" {...rest}>
      {/* Plan lointain : deux crêtes floues qui donnent la profondeur. C'est là
          que la barre de progression vient mourir — d'où un plan volontairement
          très effacé sur la gauche du massif. */}
      <path d="M-9 112 17 52 40 96 63 60 92 112Z" fill={far} />
      <path d="M63 112 97 58 135 112Z" fill={far} />

      {/* Le pic de gauche. */}
      <path d="M23.5 62 2 112h44Z" fill={face} />
      <path d="M23.5 62 46 112H23.5Z" fill={lit} />
      <path d="M23.5 62l5.3 9.4-2.6-1.6-2.7 3.1-2.6-3.1-1.9 1.6Z" fill={snow} />

      {/* Le pic de droite. */}
      <path d="M88 51 68 112h41Z" fill={face} />
      <path d="M88 51 109 112H88Z" fill={lit} />
      <path d="M88 51l4.6 8.6-1.9-1.2-2.7 2.7-2.4-2.7-1.7 1.2Z" fill={snow} />

      {/* Le petit pic du bord. */}
      <path d="M113 80 98 112h30Z" fill={face} />
      <path d="M113 80 128 112h-15Z" fill={lit} />

      {/* Le plus haut sommet, celui qui porte le drapeau — dessiné en dernier
          pour passer devant ses voisins. */}
      <path d="M55 28 25 112h59Z" fill={face} />
      <path d="M55 28 84 112H55Z" fill={lit} />
      <path d="M55 28l7.9 15.6-3.3-2-4.6 4.1-4.2-4.1-3 2Z" fill={snow} />

      {/* Le drapeau : la hampe part de la pointe, le fanion flotte à droite et
          son bord est échancré en queue d'aronde (relevé de la maquette). */}
      <path d="M55 30V2.4" stroke={snow} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M56 3.6 72.6 6.6l-5.5 4.4 5.5 4.7L56 17.1Z" fill={lit} />
    </svg>
  );
}
