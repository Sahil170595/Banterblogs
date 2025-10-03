import Link from 'next/link';
import { Github, Twitter, Mail, Rss } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">🤖</span>
              </div>
              <span className="font-bold gradient-text">Banterblogs</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered development blog following the epic journey of building Banterpacks.
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://github.com/Sahil170595/Banterblogs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/KadadekarSahil"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:sahilkadadekar@gmail.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-5 w-5" />
              </Link>
              <Link
                href="/rss.xml"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Rss className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Episodes</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/episodes" className="text-muted-foreground hover:text-foreground transition-colors">
                  All Episodes
                </Link>
              </li>
              <li>
                <Link href="/episodes?filter=latest" className="text-muted-foreground hover:text-foreground transition-colors">
                  Latest
                </Link>
              </li>
              <li>
                <Link href="/episodes?filter=featured" className="text-muted-foreground hover:text-foreground transition-colors">
                  Featured
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Tags</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/tags/banterpacks" className="text-muted-foreground hover:text-foreground transition-colors">
                  Banterpacks
                </Link>
              </li>
              <li>
                <Link href="/tags/ai" className="text-muted-foreground hover:text-foreground transition-colors">
                  AI
                </Link>
              </li>
              <li>
                <Link href="/tags/development" className="text-muted-foreground hover:text-foreground transition-colors">
                  Development
                </Link>
              </li>
              <li>
                <Link href="/tags/architecture" className="text-muted-foreground hover:text-foreground transition-colors">
                  Architecture
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/platform" className="text-muted-foreground hover:text-foreground transition-colors">
                  Platform
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/rss.xml" className="text-muted-foreground hover:text-foreground transition-colors">
                  RSS Feed
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sitemap
                </Link>
              </li>
              <li>
                <Link href="https://github.com/Sahil170595/Banterblogs" className="text-muted-foreground hover:text-foreground transition-colors">
                  Source Code
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Banterblogs. Built with Next.js and deployed on Vercel.
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Made with ❤️ and AI</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
