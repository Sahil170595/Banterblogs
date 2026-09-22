import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { REPORTS } from '@/lib/constants';
import { TOOLS } from '@/lib/tools';

export const metadata: Metadata = {
  title: 'Page not found',
};

const DESTINATIONS = [
  {
    href: '/reports',
    title: 'Research archive',
    blurb: `${REPORTS.DISPLAY} technical reports, the phase whitepapers and the research compendium.`,
  },
  {
    href: '/papers',
    title: 'Papers',
    blurb: 'The workshop paper presented at ICML 2026, the papers under peer review and the ones in preparation.',
  },
  {
    href: '/tools',
    title: 'Tools',
    blurb: `${TOOLS.map((tool) => tool.name).join(' and ')}, the command-line tools built on the research.`,
  },
];

// Unboxed, in the /show register: eyebrow, headline, one sentence, then rows.
export default function NotFound() {
  return (
    <div className="container max-w-5xl py-12 md:py-20">
      <header className="mb-16 space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Error 404 · Page not found</p>
        <h1 className="text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
          Nothing lives
          <br />
          at this <span className="text-primary">address</span>.
        </h1>
        <p className="max-w-3xl pt-2 text-lg leading-relaxed text-muted-foreground md:text-xl">
          The link may be out of date or the URL mistyped; everything published here is reachable from these three
          places.
        </p>
      </header>

      <ol className="space-y-1">
        {DESTINATIONS.map((destination, index) => (
          <li key={destination.href}>
            <Link
              href={destination.href}
              className="group relative grid grid-cols-[auto_1fr_auto] items-baseline gap-6 border-t border-border/40 py-8 transition-colors hover:border-primary/60"
            >
              <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold leading-tight tracking-tight transition-colors group-hover:text-primary md:text-3xl">
                  {destination.title}
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{destination.blurb}</p>
              </div>
              <ArrowRight
                className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-12 border-t border-border/40 pt-8 text-sm text-muted-foreground">
        Looking for a particular report, tool or episode? Use the search in the site header (inside the menu on small
        screens).
      </p>
    </div>
  );
}
