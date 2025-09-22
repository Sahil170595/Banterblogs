'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Tag, FileText } from 'lucide-react';
import { EpisodeSearch } from '@/lib/search';
import { Episode } from '@/lib/episodes';
import Link from 'next/link';

interface SearchDialogProps {
  episodes?: Episode[];
}

export function SearchDialog({ episodes = [] }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Episode[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchInstance, setSearchInstance] = useState<EpisodeSearch | null>(null);
  const [episodeData, setEpisodeData] = useState<Episode[]>(episodes);
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    if (episodes.length > 0) {
      setEpisodeData(episodes);
    }
  }, [episodes]);

  useEffect(() => {
    if (episodeData.length > 0) {
      setSearchInstance(new EpisodeSearch(episodeData));
    }
  }, [episodeData]);

  useEffect(() => {
    if (episodes.length === 0 && episodeData.length === 0 && !fetchInFlightRef.current) {
      const fetchEpisodes = async () => {
        try {
          fetchInFlightRef.current = true;
          const response = await fetch('/api/episodes');
          if (!response.ok) {
            throw new Error('Failed to load episodes for search');
          }
          const data: Episode[] = await response.json();
          setEpisodeData(data);
        } catch (error) {
          console.error(error);
        } finally {
          fetchInFlightRef.current = false;
        }
      };

      fetchEpisodes();
    }
  }, [episodes, episodeData.length]);

  useEffect(() => {
    if (!searchInstance || !query.trim()) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    const searchResults = searchInstance.search(query);
    const searchSuggestions = searchInstance.getSuggestions(query);
    
    setResults(searchResults.map(r => r.item));
    setSuggestions(searchSuggestions);
  }, [query, searchInstance]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative w-full max-w-lg">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search episodes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      {isOpen && (query || results.length > 0 || suggestions.length > 0) && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {query && results.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Episodes ({results.length})
                </div>
                {results.slice(0, 5).map((episode) => (
                  <Link
                    key={episode.id}
                    href={`/episodes/${episode.slug}`}
                    className="flex items-center space-x-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{episode.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {episode.preview}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Suggestions
                </div>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(suggestion)}
                    className="flex w-full items-center space-x-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}

            {query && results.length === 0 && suggestions.length === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close search */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
