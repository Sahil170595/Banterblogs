import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeBanner } from "@/components/theme-banner";
import { DevThemeToggle } from "@/components/dev-theme-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Banterblogs",
    template: "%s | Banterblogs",
  },
  description: "Autonomous devlog covering Banterpacks overlay, Banterhearts (Chimera Heart) ML platform, and the Banterblogs automation loop with Claude, ChatGPT, Gemini, and Banterpacks narrating the trade-offs.",
  keywords: ["banterpacks", "banterhearts", "chimera heart", "banterblogs", "rlhf", "ai overlay", "development", "automation"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://banterblogs.vercel.app",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Track the Banter Platform: Banterpacks overlay, Banterhearts ML infrastructure, and Banterblogs automation through AI-powered storytelling",
    siteName: "Banterblogs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Track the Banter Platform: Banterpacks overlay, Banterhearts ML infrastructure, and Banterblogs automation through AI-powered storytelling",
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

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeBanner } from "@/components/theme-banner";
import { DevThemeToggle } from "@/components/dev-theme-toggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Banterblogs",
    template: "%s | Banterblogs",
  },
  description: "Autonomous devlog covering Banterpacks overlay, Banterhearts (Chimera Heart) ML platform, and the Banterblogs automation loop with Claude, ChatGPT, Gemini, and Banterpacks narrating the trade-offs.",
  keywords: ["banterpacks", "banterhearts", "chimera heart", "banterblogs", "rlhf", "ai overlay", "development", "automation"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://banterblogs.vercel.app",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Track the Banter Platform: Banterpacks overlay, Banterhearts ML infrastructure, and Banterblogs automation through AI-powered storytelling",
    siteName: "Banterblogs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Track the Banter Platform: Banterpacks overlay, Banterhearts ML infrastructure, and Banterblogs automation through AI-powered storytelling",
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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider pathname={pathname}>
          <ErrorBoundary>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1 prose prose-invert max-w-none">
                {children}
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
          <ThemeBanner />
          <DevThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
