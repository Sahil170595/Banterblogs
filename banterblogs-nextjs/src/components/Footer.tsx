import Link from 'next/link';
import { Github, Mail, Rss, Twitter } from 'lucide-react';

const FOOTER_LINKS = {
  Episodes: [
    { href: '/episodes', label: 'All Episodes' },
    { href: '/episodes?filter=latest', label: 'Latest' },
    { href: '/episodes?filter=featured', label: 'Featured' },
  ],
  Platform: [
    { href: '/platform', label: 'Platform Overview' },
    { href: '/technology', label: 'Technology' },
    { href: '/about', label: 'About' },
  ],
  Resources: [
    { href: '/tags', label: 'Tags' },
    { href: '/rss.xml', label: 'RSS Feed' },
    { href: '/sitemap.xml', label: 'Sitemap' },
    { href: 'https://github.com/Sahil170595/Banterblogs', label: 'Source Code' },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] md:gap-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">BB</span>
              <span className="text-lg font-semibold text-foreground">Banterblogs</span>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              A polished chaos log documenting how the Banterpacks overlay evolves into Jarvis—a fully local, privacy-first assistant.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link
                href="https://github.com/Sahil170595/Banterblogs"
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
          <span>© {new Date().getFullYear()} Banterblogs. Crafted in public, powered by local AI.</span>
          <span>Banterpacks • Banterhearts • Automation Plane</span>
        </div>
      </div>
    </footer>
  );
}