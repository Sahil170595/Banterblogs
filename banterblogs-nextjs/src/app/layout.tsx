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
  description: "Constitutional AI enforcement architecture — embedding-based safety routing, multi-model debate, cryptographic provenance, zero-knowledge proofs, and self-improving alignment. 8 repositories across Python, Rust, TypeScript, and C#.",
  keywords: ["chimera", "constitutional ai", "jarvis", "zero-knowledge proofs", "llm safety", "multi-agent", "ml research", "banterpacks", "banterhearts", "provenance"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://chimeraforge.vercel.app",
    title: "Chimera — Constitutional AI Architecture",
    description: "Constitutional AI enforcement architecture — safety routing, multi-model debate, cryptographic provenance, and self-improving alignment.",
    siteName: "Chimeraforge",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chimera — Constitutional AI Architecture",
    description: "Constitutional AI enforcement architecture — safety routing, multi-model debate, cryptographic provenance, and self-improving alignment.",
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
