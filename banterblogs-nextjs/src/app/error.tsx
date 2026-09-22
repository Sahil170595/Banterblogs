'use client';

import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageHeader } from '@/components/ui/PageHeader';

// Route-segment error boundary: renders inside the site chrome.
export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[app/error] a route failed to render:', error);
  }, [error]);

  return (
    <div className="container max-w-5xl pb-24">
      <PageHeader
        eyebrow={<Eyebrow dot="amber">Error · Page failed to load</Eyebrow>}
        title="This page did not load."
        lede="Something failed while rendering it; try again, or continue from the research archive."
        actions={
          <>
            <Button variant="primary" onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/reports" iconEnd={<ArrowRight className="h-4 w-4" />}>
              Research archive
            </ButtonLink>
          </>
        }
      />

      {error.digest && <p className="mt-10 font-mono text-label-13 text-muted-foreground">Reference {error.digest}</p>}
    </div>
  );
}
