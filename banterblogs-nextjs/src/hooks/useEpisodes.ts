'use client';

import { useState, useEffect, useCallback } from 'react';
import { Episode } from '@/lib/episodes';

export function useEpisodes(initialEpisodes: Episode[] = []) {
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [loading, setLoading] = useState(initialEpisodes.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEpisodes(initialEpisodes);
  }, [initialEpisodes]);

  const fetchEpisodes = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);

      const response = await fetch('/api/episodes');

      if (!response.ok) {
        throw new Error('Failed to fetch episodes');
      }

      const data = await response.json();
      setEpisodes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching episodes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEpisodes(initialEpisodes.length === 0);
  }, [fetchEpisodes, initialEpisodes.length]);

  return { episodes, loading, error, refetch: () => fetchEpisodes(true) };
}
