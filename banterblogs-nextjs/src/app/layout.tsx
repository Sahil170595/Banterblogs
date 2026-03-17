import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AccessibilityPanel, KeyboardNavigation, FocusIndicator } from "@/components/AccessibilityPanel";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Chimeraforge",
    template: "%s | Chimeraforge",
  },
  description: "Personal AI platform running on your hardware — 6 repositories, 200K+ LOC, 204K+ research measurements, local inference with constitutional AI governance.",
  keywords: ["chimeraforge", "personal ai", "jarvis", "local inference", "llm benchmarking", "multi-agent", "ml research", "banterpacks", "banterhearts"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chimeraforge.vercel.app",
    title: "Chimeraforge — Personal AI Platform",
    description: "Personal AI platform running on your hardware — local inference, constitutional AI governance, and 204K+ research measurements backing every decision.",
    siteName: "Chimeraforge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chimeraforge — Personal AI Platform",
    description: "Personal AI platform running on your hardware — local inference, constitutional AI governance, and 204K+ research measurements backing every decision.",
    creator: "@sahilkadadekar",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        <ErrorBoundary>
          <KeyboardNavigation>
            <FocusIndicator />
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 chimera-shell">
                {children}
              </main>
              <Footer />
              
              {/* Global UI Components */}
              <AccessibilityPanel />
            </div>
          </KeyboardNavigation>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
