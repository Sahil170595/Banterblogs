'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Route-segment error boundary: renders inside the site chrome.
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[app/error] a route failed to render:', error);
  }, [error]);

  return (
    <div className="container max-w-5xl py-12 md:py-20">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Error · Page failed to load</p>
        <h1 className="text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">This page did not load.</h1>
        <p className="max-w-3xl pt-2 text-lg leading-relaxed text-muted-foreground md:text-xl">
          Something failed while rendering it; try again, or continue from the research archive.
        </p>
      </header>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
        >
          Try again
        </button>
        <Link
          href="/reports"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:decoration-primary"
        >
          Research archive
        </Link>
      </div>

      {error.digest && <p className="mt-10 font-mono text-xs text-muted-foreground">Reference {error.digest}</p>}
    </div>
  );
}
