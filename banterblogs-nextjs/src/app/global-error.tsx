'use client';

import { useEffect } from 'react';
import './globals.css';

// Replaces the root layout when the layout itself fails, so it brings its own
// document and stylesheet; the layout's next/font variables are absent, hence
// an explicit system font stack.
const SYSTEM_FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[app/global-error] the root layout failed to render:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ fontFamily: SYSTEM_FONT_STACK }}>
        <title>Something went wrong | Chimeraforge</title>
        <main className="container max-w-5xl py-12 md:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Error · Site failed to load</p>
          <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
            Chimeraforge did not load.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Something failed before the page could render; try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-10 inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Try again
          </button>
          {error.digest && <p className="mt-10 font-mono text-xs text-muted-foreground">Reference {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
