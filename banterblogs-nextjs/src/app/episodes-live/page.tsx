'use client';

import { useEpisodes } from '@/hooks/useEpisodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LiveEpisodesPage() {
  const { episodes, loading, error, refetch } = useEpisodes();
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/episodes/watch');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'rename' || data.type === 'change') {
        refetch();
        setLastUpdate(new Date());
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    return () => {
      eventSource.close();
    };
  }, [refetch]);

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
            <span className="signal-pill">Live Feed</span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">Live Episodes</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Episodes update automatically whenever new markdown files land in the content stream.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                isConnected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/40 bg-red-500/10 text-red-300'
              }`}
            >
              {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {isConnected ? 'Live' : 'Offline'}
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
        {lastUpdate && (
          <div className="mt-6 text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
