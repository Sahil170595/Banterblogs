import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RouteGate } from "@/components/RouteGate";
import ErrorBoundary from "@/components/ErrorBoundary";
import { MOTION_GATE_SCRIPT, MOTION_GATE_SCRIPT_ID } from "@/components/motion/prePaint";
import { EntranceWindow } from "@/components/motion/EntranceWindow";
import { RouteTransition } from "@/components/motion/RouteTransition";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
// Fallbacks with JetBrains Mono's 0.6em advance, so its swap moves nothing;
// the automatic fallback is Arial-metric (pinned by monoFallback.test.ts).
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  adjustFontFallback: false,
  fallback: ["Menlo", "Courier New", "monospace"],
});

// --background (220 32% 2%) from globals.css as hex, so browser chrome and the
// first frame match the page (pinned by readerSettings.test.tsx)
const THEME_BACKGROUND_HEX = "#030507";

// Applies a stored reader font-size before first paint, so the rem-based
// layout never reflows after hydration. The key and percentages mirror
// FONT_SIZE_STORAGE_KEY / FONT_SIZE_SCALE in components/AccessibilityPanel.tsx
// (pinned by readerSettings.test.tsx).
const READER_FONT_SIZE_SCRIPT =
  'try{var k=localStorage.getItem("chimeraforge:reader-font-size"),m={small:"87.5%",large:"112.5%"};' +
  'if(k==="small"||k==="large")document.documentElement.style.fontSize=m[k]}' +
  'catch(e){console.warn("[reader-settings] stored font size unavailable",e)}';

export const metadata: Metadata = {
  metadataBase: new URL("https://chimeraforge.vercel.app"),
  // Root canonical. Pages override with their own route; without this, query
  // variants (?utm_source=...) and the legacy banterblogs.vercel.app host each
  // index as separate URLs and split ranking signal.
  alternates: { canonical: "/" },
  title: {
    default: "Chimeraforge",
    template: "%s | Chimeraforge",
  },
  description: "Constitutional AI enforcement architecture — embedding-based safety routing, multi-model debate, cryptographic provenance, zero-knowledge proofs, and self-improving alignment. 9 repositories across Python, Rust, TypeScript, and C#.",
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
  // Icons + OG/Twitter images come from file conventions in src/app/
  // (favicon.ico, apple-icon.png, opengraph-image.png, twitter-image.png).
};

export const viewport: Viewport = {
  themeColor: THEME_BACKGROUND_HEX,
  colorScheme: "dark",
  // edge-to-edge on notched phones; fixed bottom UI pads with safe-area insets
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // suppressHydrationWarning: the pre-paint script may set <html>'s inline
    // font-size before React hydrates (applies to this element only).
    // data-scroll-behavior: route changes jump to the top instead of smooth-
    // scrolling there (Next 16 opt-in), so a view transition captures the new
    // page where it lands; in-page anchors stay smooth.
    <html lang="en" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script id="reader-font-size" dangerouslySetInnerHTML={{ __html: READER_FONT_SIZE_SCRIPT }} />
        {/* arms html[data-motion] before first paint; without it (no JS,
            reduced motion) every animated element renders at rest */}
        <script id={MOTION_GATE_SCRIPT_ID} dangerouslySetInnerHTML={{ __html: MOTION_GATE_SCRIPT }} />
      </head>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} min-h-screen bg-background text-foreground antialiased`}>
        {/* WCAG 2.4.1: let keyboard users bypass the header on every page. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {/* closes the first-load entrance window on the first client navigation */}
        <EntranceWindow />
        <ErrorBoundary>
          {/* .keyboard-navigation scopes the focus-visible ring in globals.css */}
          <div className="keyboard-navigation relative flex min-h-screen flex-col">
            <Header />
            {/* the page moves on every navigation; the header holds still (globals.css) */}
            <RouteTransition>
              <main id="main-content" className="flex-1 chimera-shell">
                {children}
              </main>
              <RouteGate hideOn={["/"]}>
                <Footer />
              </RouteGate>
            </RouteTransition>
          </div>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
