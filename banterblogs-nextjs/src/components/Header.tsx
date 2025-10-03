'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { SearchDialog } from './SearchDialog';
import { GITHUB_URLS } from '@/lib/constants';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg shadow-primary/5">
      <div className="container flex h-18 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <span className="text-lg font-bold text-primary-foreground">🤖</span>
            </div>
            <span className="hidden display font-bold sm:inline-block gradient-text text-lg">
              Banterblogs
            </span>
          </Link>
        </div>
        
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <SearchDialog />
          </div>
          
          <nav className="flex items-center space-x-2 text-sm font-medium">
            <Link
              href="/platform"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-accent/10 text-foreground/60 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5"
            >
              Platform
            </Link>
            <Link
              href="/episodes"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-primary/10 text-foreground/60 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5"
            >
              Episodes
            </Link>
            <Link
              href="/technology"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-chart-3/10 text-foreground/60 hover:shadow-lg hover:shadow-chart-3/10 hover:-translate-y-0.5"
            >
              Technology
            </Link>
            <Link
              href="/about"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-chart-4/10 text-foreground/60 hover:shadow-lg hover:shadow-chart-4/10 hover:-translate-y-0.5"
            >
              About
            </Link>
            <Link
              href="/tags"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-chart-5/10 text-foreground/60 hover:shadow-lg hover:shadow-chart-5/10 hover:-translate-y-0.5"
            >
              Tags
            </Link>
            <Link
              href={GITHUB_URLS.BANTERBLOGS}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg transition-all hover:text-foreground hover:bg-primary/10 text-foreground/60 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 flex items-center space-x-1 group"
            >
              <span>GitHub</span>
              <span className="text-xs opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">↗</span>
            </Link>
          </nav>
          
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-foreground/60 hover:text-foreground/80 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="border-t border-border/40 bg-background/95 backdrop-blur md:hidden">
          <div className="container py-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/platform"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                Platform
              </Link>
              <Link
                href="/episodes"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                Episodes
              </Link>
              <Link
                href="/technology"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                Technology
              </Link>
              <Link
                href="/about"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/tags"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                Tags
              </Link>
              <Link
                href={GITHUB_URLS.BANTERBLOGS}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                onClick={() => setIsMenuOpen(false)}
              >
                GitHub
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
