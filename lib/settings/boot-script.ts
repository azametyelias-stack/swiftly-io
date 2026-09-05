/**
 * The pre-paint script — audit 2026-09-05, point 3.
 *
 * Il ne reste que la langue. Le thème a été retiré le 2026-09-06 (une seule
 * palette, décision Elias) : il n'y a plus rien à décider avant la peinture
 * côté couleurs, et `<meta name="theme-color">` est désormais émis
 * statiquement par l'export `viewport` de `app/layout.tsx`, ce qui est
 * strictement mieux — une balise dans le HTML initial plutôt qu'une insertion
 * par script.
 *
 * Pourquoi la langue en a toujours besoin : `document.documentElement.lang`
 * décide du rendu de `app/offline/page.tsx`, qui bascule FR/EN sans JavaScript
 * via `:root[lang="en"]`. Cette page doit être juste dès la première peinture,
 * hors ligne, sans attendre React.
 *
 * Cela ne peut pas venir du serveur : l'authentification est côté client (une
 * session Supabase dans le navigateur, sans cookie), donc le serveur ignore qui
 * demande. localStorage est la seule source lisible à cet instant. Elle reste
 * la source PEINTURE ; `users.language` reste la vérité COMPTE, réconciliée par
 * `PreferencesSync` juste après le montage.
 *
 * Gardé en chaîne brute pour partir verbatim, sans transformation de bundler
 * entre ce qui est écrit ici et ce qui s'exécute en premier. L'accès est
 * enveloppé : une fenêtre privée ou des données de site bloquées font *lever*
 * `localStorage`, et une exception ici surviendrait avant tout affichage.
 */

export const LANG_BOOT_SCRIPT = `(function(){
try{
var l=localStorage.getItem('sf-lang');
if(l==='fr'||l==='en'){document.documentElement.lang=l}
}catch(e){}
})()`;
