import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Banterblogs",
    template: "%s | Banterblogs",
  },
  description: "AI-powered development blog following the epic journey of building Banterpacks. Watch as Claude, ChatGPT, Gemini, and Banterpacks discuss code, challenges, and victories.",
  keywords: ["banterpacks", "development", "AI", "coding", "blog", "software development", "programming"],
  authors: [{ name: "Sahil Kadadekar" }],
  creator: "Sahil Kadadekar",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://banterblogs.vercel.app",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Follow the epic development journey of Banterpacks through AI-powered storytelling",
    siteName: "Banterblogs",
  },
  twitter: {
    card: "summary_large_image",
    title: "Banterblogs - AI-Powered Development Story",
    description: "Follow the epic development journey of Banterpacks through AI-powered storytelling",
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
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
