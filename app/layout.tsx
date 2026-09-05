import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { LANG_BOOT_SCRIPT } from "@/lib/settings/boot-script";
import { PWA, THEME_COLOR } from "@/lib/pwa/config";
import { PwaRegister } from "./pwa-register";
import { InstallPrompt } from "./install-prompt";

// Typography is the Apple system stack (--font-sans in globals.css, § P3) — no
// web font to download, so no next/font here.

export const metadata: Metadata = {
  // The SITE identity, unchanged. The manifest carries a longer `name`
  // ("Swiftly.io — Gestion financière", doc § A.1) because that string labels an
  // install dialog and an app drawer, not a browser tab.
  title: "Swiftly.io",
  description: "Suivi de tes finances, simple et rapide.",
  applicationName: PWA.shortName,
  // `app/manifest.ts`. Named explicitly because the offline page must carry the
  // link too — that is the page a first-time installer may land on.
  manifest: "/manifest.webmanifest",
  // iOS ignores the manifest's `display` and `theme_color`; these two are how
  // Safari learns the app runs standalone and what to call it on the home screen.
  //
  // `black-translucent` draws NO status-bar background: the page runs full-bleed
  // and the night gradient flows under the clock, which is the point (choix
  // Elias, 2026-09-06). Two consequences that the rest of this change handles:
  //  - the clock and battery are forced WHITE, so any screen whose top is light
  //    must still paint something dark behind them — see `AppHeader`;
  //  - the viewport now extends under the status bar, so every top row needs
  //    `env(safe-area-inset-top)` or it sits beneath the clock.
  appleWebApp: {
    capable: true,
    title: PWA.shortName,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

/**
 * `viewport-fit=cover` is what makes `env(safe-area-inset-*)` resolve to
 * anything other than zero — without it the whole safe-area vocabulary is inert.
 *
 * Nine places in this codebase were already written against those insets
 * (`AuthScreen`, `DashboardView`, `MenuDrawer`, the landing, the consent
 * banner…). They have been dead code until now; this line turns them on, which
 * is the intended behaviour but worth knowing when reading a diff of one screen
 * and wondering why its spacing moved.
 *
 * `themeColor` peut enfin etre statique : depuis le retrait du theme sombre il
 * n'y a plus qu'une palette, donc plus de valeur "juste pour un theme et fausse
 * pour l'autre". C'est --brand-deep, la couleur reellement peinte sous la barre
 * d'etat sur 21 des 22 ecrans (cf. lib/pwa/config.ts).
 *
 * iOS l'ignore ici — `black-translucent` ne peint aucun fond. Elle sert a
 * Android, a Chrome de bureau, et de repli partout ailleurs.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning`: le script d'amorce ci-dessous fixe `lang`
    // avant l'hydratation, donc le balisage serveur et le DOM vivant sont
    // censes differer ici. Portee limitee a cet element.
    <html lang="fr" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <head>
        {/*
          Premiere chose dans le document : fixe la langue avant que le corps
          existe, pour que la page hors ligne (bilingue sans JavaScript, via
          :root[lang="en"]) soit juste des la premiere peinture. Contenu = une
          constante de compilation de lib/settings/boot-script.ts, sans
          interpolation, rien qui vienne de l'utilisateur ni du reseau.
        */}
        {/* nosemgrep: swiftly-no-dangerously-set-inner-html */}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ConsentProvider>
            {children}
            <GoogleAnalytics />
            <ConsentBanner />
            <PwaRegister />
            <InstallPrompt />
          </ConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
