/**
 * The pre-paint script — audit 2026-09-05, point 3.
 *
 * Everything else in the app decides the theme in React, which runs after the
 * first paint. In dark theme that ordering is visible: the page paints on the
 * light `:root` palette, then swaps. A white flash, every single load.
 *
 * The only fix is a synchronous script in `<head>`, before the body renders.
 * It cannot come from the server: auth here is client-side (a Supabase session
 * in the browser, no cookie), so the server does not know who is asking, let
 * alone their theme. localStorage is the one source readable at that moment.
 *
 * That makes localStorage the PAINT-time source and `users.theme` the ACCOUNT
 * truth: `PreferencesSync` reconciles the two right after mount, which is why
 * this script only has to be right about the common case — the same device the
 * user was on last time.
 *
 * Kept as a plain string so it ships verbatim, with no bundler transform
 * between what is written here and what runs first. Every access is wrapped:
 * a private window or blocked site data makes `localStorage` *throw* on
 * access, and an exception here would happen before anything is on screen.
 */

export const THEME_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement;
var t=localStorage.getItem('sf-theme');
if(t==='light'||t==='dark'){d.dataset.theme=t}
var l=localStorage.getItem('sf-lang');
if(l==='fr'||l==='en'){d.lang=l}
}catch(e){}})()`;
