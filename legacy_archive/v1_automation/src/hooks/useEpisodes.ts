'use client';

import { useState, useEffect } from 'react';
import { Episode } from '@/lib/episodes';

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true);
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
    };

    fetchEpisodes();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
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
  };

  return { episodes, loading, error, refetch };
}
