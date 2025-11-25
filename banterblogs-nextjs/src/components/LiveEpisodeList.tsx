'use client';

import { useEpisodes } from '@/hooks/useEpisodes';
import { EpisodeFilters } from '@/components/EpisodeFilters';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Episode } from '@/lib/episodes';

interface LiveEpisodeListProps {
    initialEpisodes: Episode[];
}

export function LiveEpisodeList({ initialEpisodes }: LiveEpisodeListProps) {
    const { episodes, loading, error, refetch } = useEpisodes(initialEpisodes);
    const [isConnected, setIsConnected] = useState(false);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {lastUpdate && (
                        <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm">
                        {isConnected ? (
                            <>
                                <Wifi className="h-4 w-4 text-green-500 animate-pulse" />
                                <span className="text-green-500 font-medium">Live Updates Active</span>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Live Updates Offline</span>
                            </>
                        )}
                    </div>

                    <button
                        onClick={refetch}
                        disabled={loading}
                        className="inline-flex items-center space-x-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                    Error refreshing episodes: {error}
                </div>
            )}

            <EpisodeFilters episodes={episodes} />
        </div>
    );
}
