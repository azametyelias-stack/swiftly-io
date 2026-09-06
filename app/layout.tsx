import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { ThemeColorMeta } from "@/components/settings/ThemeColorMeta";
import { THEME_BOOT_SCRIPT } from "@/lib/settings/boot-script";
import { PWA } from "@/lib/pwa/config";
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
  appleWebApp: { capable: true, title: PWA.shortName, statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

// No `themeColor` here on purpose: a static value has to pick one palette and be
// wrong about the other. THEME_BOOT_SCRIPT writes the meta pre-paint and
// <ThemeColorMeta> keeps it in step — see lib/pwa/config.ts § THEME_COLOR.

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning`: the boot script below sets `data-theme` and
    // `lang` before React hydrates, so the server markup and the live DOM are
    // meant to differ here. Scoped to this element — it does not silence
    // mismatches anywhere in the tree.
    <html lang="fr" className="h-full scroll-smooth antialiased" suppressHydrationWarning>
      <head>
        {/*
          First thing in the document: paints the right theme before the body
          exists, instead of flashing white and correcting after hydration.
          Content is a compile-time constant from lib/settings/boot-script.ts —
          no interpolation, nothing user-supplied, nothing from the network.
        */}
        {/* nosemgrep: swiftly-no-dangerously-set-inner-html */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <ConsentProvider>
            {children}
            <GoogleAnalytics />
            <ConsentBanner />
            <ThemeColorMeta />
            <PwaRegister />
            <InstallPrompt />
          </ConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
