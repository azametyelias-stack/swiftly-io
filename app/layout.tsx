import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConsentProvider } from "@/components/privacy/ConsentProvider";
import { ConsentBanner } from "@/components/privacy/ConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Swiftly.io",
  description: "Suivi de tes finances, simple et rapide.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
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
