'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';
import './globals.css';

// Replaces the root layout when the layout itself fails, so it brings its own
// document and stylesheet; the layout's next/font variables are absent, hence
// an explicit system font stack. No motion gate runs here either, so the head
// takes no entrance.
const SYSTEM_FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[app/global-error] the root layout failed to render:', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased" style={{ fontFamily: SYSTEM_FONT_STACK }}>
        <title>Something went wrong | Chimeraforge</title>
        <main className="container max-w-5xl pb-24 pt-6 md:pt-14">
          <PageHeader
            entrance={false}
            eyebrow={<Eyebrow dot="amber">Error · Site failed to load</Eyebrow>}
            title="Chimeraforge did not load."
            lede="Something failed before the page could render; try again in a moment."
            actions={
              <Button variant="primary" onClick={() => retry()}>
                Try again
              </Button>
            }
          />
          {error.digest && <p className="mt-10 font-mono text-label-13 text-muted-foreground">Reference {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
