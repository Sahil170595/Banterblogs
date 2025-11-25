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
    // Set up file watching via Server-Sent Events
    const eventSource = new EventSource('/api/episodes/watch');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('File change detected:', data);
      
      if (data.type === 'rename' || data.type === 'change') {
        // Refresh episodes when files change
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
          <h1 className="text-4xl font-bold tracking-tight mb-2">Live Episodes</h1>
          <p className="text-xl text-muted-foreground">
            Episodes update automatically when you add new markdown files!
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-400" />
                <span className="text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-400" />
                <span className="text-red-400">Offline</span>
              </>
            )}
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center space-x-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {lastUpdate && (
        <div className="mb-4 text-sm text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <EpisodeFilters episodes={episodes} />
    </div>
  );
}
