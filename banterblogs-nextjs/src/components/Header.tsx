'use client';

import Link from 'next/link';
import { Github, Linkedin, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SearchDialog } from './SearchDialog';
import { EXTERNAL_LINKS, GITHUB_URLS } from '@/lib/constants';

const NAV_ITEMS = [
  { href: '/home', label: 'Overview' },
  { href: '/platform', label: 'Platform' },
  { href: '/reports', label: 'Research' },
  { href: '/papers', label: 'Papers' },
  { href: '/show', label: 'Show' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/work', label: 'Work' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  // On the galactic landing the nav floats transparent over the scene —
  // full-bleed space, nothing boxed off. Everywhere else it's the standard
  // sticky blurred bar.
  const isLanding = pathname === '/';

  return (
    <header
      className={
        isLanding
          ? 'fixed top-0 z-50 w-full bg-transparent'
          : 'sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-primary/60 after:to-transparent'
      }
    >
      <div
        className={
          isLanding
            ? 'flex h-[72px] items-center justify-between gap-6 px-5 sm:px-8'
            : 'container flex h-[72px] items-center justify-between gap-6'
        }
      >
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          {isLanding ? (
            <>
              <span
                data-landing-wordmark="orbital"
                aria-hidden="true"
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25"
              >
                <span className="h-2 w-2 rounded-full bg-black ring-1 ring-primary/90 shadow-[0_0_12px_hsl(var(--primary))]" />
                <span className="absolute -right-[3px] top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-primary" />
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                Chimeraforge
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/10 sm:h-11 sm:w-11 sm:text-base">
                CF
              </span>
              <span className="display text-base font-semibold tracking-tight text-foreground sm:text-lg">
                Chimeraforge
              </span>
            </>
          )}
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          <div className={isLanding ? 'hidden' : 'hidden flex-1 md:block lg:max-w-[180px] xl:max-w-xs 2xl:max-w-sm'}>
            <SearchDialog />
          </div>

          {/* one nav language on every page — the landing's mono-uppercase is
              the site's editorial register, not a landing-only costume */}
          <nav className="hidden items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={`px-2.5 py-2 transition xl:px-3 ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? isLanding
                      ? 'text-primary'
                      : 'rounded-full bg-primary/15 text-primary'
                    : isLanding
                      ? 'text-muted-foreground hover:text-primary'
                      : 'rounded-full hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="ml-2 flex items-center gap-1 border-l border-border/40 pl-2">
              <Link
                href={GITHUB_URLS.PROFILE}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <Github className="h-4 w-4" />
              </Link>
              <Link
                href={EXTERNAL_LINKS.LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground transition hover:border-primary/60 hover:text-primary"
              >
                <Linkedin className="h-4 w-4" />
              </Link>
            </div>
          </nav>

          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent/10 hover:text-foreground lg:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div
          id="mobile-nav"
          className={`border-t border-border/60 bg-background/95 backdrop-blur lg:hidden ${
            isLanding ? 'h-[calc(100svh-72px)]' : ''
          }`}
        >
          <div className="container space-y-1 py-6">
            <div className="mb-4">
              <SearchDialog />
            </div>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-11 items-center rounded-lg px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={GITHUB_URLS.PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              GitHub
            </Link>
            <Link
              href={EXTERNAL_LINKS.LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              LinkedIn
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
