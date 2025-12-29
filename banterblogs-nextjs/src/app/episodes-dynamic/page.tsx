'use client';

import { useEpisodes } from '@/hooks/useEpisodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { RefreshCw } from 'lucide-react';

export default function DynamicEpisodesPage() {
  const { episodes, loading, error, refetch } = useEpisodes();

  if (loading) {
    return (
      <div className="container py-16">
        <div className="signal-panel p-10 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading episodes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16">
        <div className="signal-panel p-10 text-center">
          <h1 className="text-2xl font-bold mb-4">Error loading episodes</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-5 py-2 text-sm font-semibold text-primary hover:border-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <div className="signal-panel-strong mb-10 p-8 md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="signal-pill">Runtime Sync</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">Dynamic Episode Feed</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Episodes load at runtime so every new markdown file appears instantly.
            </p>
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
