'use client';

import { useEpisodes } from '@/hooks/useEpisodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { RefreshCw } from 'lucide-react';

export default function DynamicEpisodesPage() {
  const { episodes, loading, error, refetch } = useEpisodes();

  if (loading) {
    return (
      <div className="container py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading episodes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Episodes</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refetch}
            className="inline-flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">All Episodes (Dynamic)</h1>
          <p className="text-xl text-muted-foreground">
            Episodes loaded at runtime - new markdown files appear automatically!
          </p>
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center space-x-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
