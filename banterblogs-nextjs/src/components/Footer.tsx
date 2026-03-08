import Link from 'next/link';
import { Github, Mail, Rss, Twitter } from 'lucide-react';

const FOOTER_LINKS = {
  Explore: [
    { href: '/platform', label: 'Platform' },
    { href: '/episodes', label: 'Episodes' },
    { href: '/reports', label: 'Research' },
    { href: '/about', label: 'About' },
  ],
  Resources: [
    { href: '/rss.xml', label: 'RSS Feed' },
    { href: '/sitemap.xml', label: 'Sitemap' },
    { href: 'https://github.com/Sahil170595/Banterblogs', label: 'GitHub' },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))] md:gap-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/10">CF</span>
              <span className="text-lg font-semibold text-foreground">Chimeraforge</span>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Personal AI platform running on your hardware — local inference, constitutional AI governance, and 126K+ research measurements backing every decision.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link
                href="https://github.com/Sahil170595/Chimeraforge"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-primary"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/KadadekarSahil"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="mailto:sahilkadadekar@gmail.com" className="transition hover:text-primary">
                <Mail className="h-5 w-5" />
              </Link>
              <Link href="/rss.xml" className="transition hover:text-primary">
                <Rss className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section} className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition hover:text-primary"
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground md:flex-row">
          <span>(c) {new Date().getFullYear()} Chimeraforge. Crafted in public, powered by local AI.</span>
          <span>6 repos. 200K+ LOC. One ecosystem.</span>
        </div>
      </div>
    </footer>
  );
}
