import type { Metadata } from "next";
import "./globals.css";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

// Typography is the Apple system stack (--font-sans in globals.css, § P3) — no
// web font to download, so no next/font here.

export const metadata: Metadata = {
  title: "Swiftly.io",
  description: "Suivi de tes finances, simple et rapide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full scroll-smooth antialiased">
      <body className="min-h-full flex flex-col">
        <ConsentProvider>
          {children}
          <GoogleAnalytics />
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
