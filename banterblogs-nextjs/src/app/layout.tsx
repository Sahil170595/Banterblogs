import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AccessibilityPanel, KeyboardNavigation, FocusIndicator } from "@/components/AccessibilityPanel";
import { OnboardingTrigger } from "@/components/OnboardingModal";
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
  description: "Development log and research archive for the Chimera ecosystem — 6 repositories, 200K+ LOC spanning personal AI platform, ML research with 126K+ measurements, multi-agent orchestration, and mobile deployment.",
  keywords: ["banterpacks", "banterhearts", "chimeraforge", "chimera", "banterblogs", "llm benchmarking", "multi-agent", "ai overlay", "ml research"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chimeraforge.vercel.app",
    title: "Chimeraforge — Chimera Ecosystem",
    description: "Development log and research archive for the Chimera ecosystem — real-time streaming AI, ML benchmarking, multi-agent orchestration, and mobile deployment.",
    siteName: "Chimeraforge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chimeraforge — Chimera Ecosystem",
    description: "Development log and research archive for the Chimera ecosystem — real-time streaming AI, ML benchmarking, multi-agent orchestration, and mobile deployment.",
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
              <OnboardingTrigger className="fixed bottom-6 left-6 z-40" />
            </div>
          </KeyboardNavigation>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
