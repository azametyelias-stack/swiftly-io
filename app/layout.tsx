import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { THEME_BOOT_SCRIPT } from "@/lib/settings/boot-script";

// Typography is the Apple system stack (--font-sans in globals.css, § P3) — no
// web font to download, so no next/font here.

export const metadata: Metadata = {
  title: "Swiftly.io",
  description: "Suivi de tes finances, simple et rapide.",
};

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
          </ConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
