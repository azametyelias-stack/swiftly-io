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
 * It also plants `<meta name="theme-color">` (PWA MVP, partie A § 1). Installed
 * on a phone, that value is the status bar: emitted statically it would have to
 * pick one theme and be wrong about the other, and set from React it would flash
 * the wrong colour for exactly as long as the palette used to. Values mirror
 * `THEME_COLOR` in `lib/pwa/config.ts` (= `--surface-page`); the pair is checked
 * by `tests/pwa/config.test.ts`. `ThemeColorMeta` takes over from here.
 *
 * Kept as a plain string so it ships verbatim, with no bundler transform
 * between what is written here and what runs first. Every access is wrapped:
 * a private window or blocked site data makes `localStorage` *throw* on
 * access, and an exception here would happen before anything is on screen.
 * Two separate `try` blocks on purpose — unreadable storage must not cost us
 * the status-bar colour, which does not depend on it.
 */

export const THEME_BOOT_SCRIPT = `(function(){
var d=document.documentElement;var t=null;
try{
t=localStorage.getItem('sf-theme');
if(t==='light'||t==='dark'){d.dataset.theme=t}
var l=localStorage.getItem('sf-lang');
if(l==='fr'||l==='en'){d.lang=l}
}catch(e){}
try{
var dark=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var m=document.createElement('meta');
m.name='theme-color';
m.content=dark?'#121318':'#EBEBEF';
document.head.appendChild(m);
}catch(e){}
})()`;
