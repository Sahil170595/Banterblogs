import Link from 'next/link';
import { BookOpen, Github, Linkedin, Mail, Package, Rss, Twitter } from 'lucide-react';
import { ReaderSettingsLauncher } from './AccessibilityPanelClient';

const FOOTER_LINKS = {
  Explore: [
    { href: '/platform', label: 'Platform' },
    { href: '/reports', label: 'Research' },
    { href: '/papers', label: 'Papers' },
    { href: '/tools', label: 'Tools' },
    { href: '/show', label: 'Show' },
    { href: '/work', label: 'Work' },
    { href: '/about', label: 'About' },
    { href: '/episodes', label: 'Archive' },
  ],
  Resources: [
    // the tool pages carry the install line, evidence, and PyPI link — send
    // people there rather than straight off-site
    { href: '/tools/chimeraforge', label: 'chimeraforge (CLI)' },
    { href: '/tools/quantfit', label: 'quantfit (CLI)' },
    { href: '/rss.xml', label: 'RSS Feed' },
    { href: '/sitemap.xml', label: 'Sitemap' },
    { href: 'https://github.com/Sahil170595', label: 'GitHub' },
    { href: 'https://substack.com/@sahilkadadekar', label: 'Substack' },
    { href: 'https://linkedin.com/in/sahilkadadekar', label: 'LinkedIn' },
  ],
} as const;

// The feed and sitemap are route handlers, not pages: nothing to prefetch.
const ROUTE_HANDLER_HREFS = new Set<string>(['/rss.xml', '/sitemap.xml']);
// p-2 grows the 20px icon's hit area to 36px; -m-2 keeps the row where it was
const ICON_LINK_CLASS = '-m-2 p-2 transition hover:text-primary';

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
              Constitutional AI enforcement architecture — embedding-based safety routing, multi-model debate, cryptographic provenance, and self-improving alignment.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <Link
                href="https://github.com/Sahil170595"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className={ICON_LINK_CLASS}
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/sahilkadadekar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className={ICON_LINK_CLASS}
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://linkedin.com/in/sahilkadadekar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className={ICON_LINK_CLASS}
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:sahilkadadekar@gmail.com"
                aria-label="Email"
                className={ICON_LINK_CLASS}
              >
                <Mail className="h-5 w-5" />
              </Link>
              <Link
                href="https://pypi.org/project/chimeraforge/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="PyPI"
                className={ICON_LINK_CLASS}
              >
                <Package className="h-5 w-5" />
              </Link>
              <Link
                href="https://substack.com/@sahilkadadekar"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Substack"
                className={ICON_LINK_CLASS}
              >
                <BookOpen className="h-5 w-5" />
              </Link>
              <Link
                href="/rss.xml"
                prefetch={false}
                aria-label="RSS feed"
                className={ICON_LINK_CLASS}
              >
                <Rss className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section} className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={ROUTE_HANDLER_HREFS.has(link.href) ? false : undefined}
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
          {/* Year hardcoded so server-build and client-hydration agree —
              new Date().getFullYear() can mismatch across timezones / build
              boundaries and tripped React #418 in prod. Bump yearly. */}
          <span>© 2026 Chimeraforge. Crafted in public, powered by local AI.</span>
          <ReaderSettingsLauncher />
        </div>
      </div>
    </footer>
  );
}
