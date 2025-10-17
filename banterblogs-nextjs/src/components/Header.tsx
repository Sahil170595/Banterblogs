'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { SearchDialog } from './SearchDialog';
import { GITHUB_URLS } from '@/lib/constants';

const NAV_ITEMS = [
  { href: '/banterpacks', label: 'Banterpacks' },
  { href: '/chimera', label: 'Chimera' },
  { href: '/episodes', label: 'Episodes' },
  { href: '/benchmarks', label: 'Benchmarks' },
  { href: '/reports', label: 'Reports' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-[72px] items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent text-sm sm:text-base font-bold text-primary-foreground shadow-lg shadow-primary/30">
            BB
          </span>
          <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground display">
            Building Chimera
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden flex-1 md:block max-w-sm">
            <SearchDialog />
          </div>

          <nav className="hidden items-center gap-1 text-sm font-semibold text-muted-foreground lg:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 transition hover:bg-primary/10 hover:text-primary"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={GITHUB_URLS.BANTERBLOGS}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border/60 px-4 py-2 text-foreground transition hover:border-primary/60 hover:text-primary"
            >
              GitHub
            </Link>
          </nav>

          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition hover:text-foreground hover:bg-accent/10 lg:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur lg:hidden">
          <div className="container space-y-1 py-6">
            <div className="mb-4">
              <SearchDialog />
            </div>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={GITHUB_URLS.BANTERBLOGS}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              GitHub
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
