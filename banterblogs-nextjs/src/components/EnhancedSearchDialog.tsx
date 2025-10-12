'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, Tag, FileText, X, Sparkles, TrendingUp } from 'lucide-react';
import { EpisodeSearch } from '@/lib/search';
import type { Episode } from '@/lib/episodes';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchDialogProps {
  episodes?: Episode[];
}

interface AISuggestion {
  text: string;
  type: 'episode' | 'tag' | 'concept' | 'trending';
  confidence: number;
}

export function SearchDialog({ episodes = [] }: SearchDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Episode[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [searchInstance, setSearchInstance] = useState<EpisodeSearch | null>(null);
  const [episodeData, setEpisodeData] = useState<Episode[]>(episodes);
  const [isLoading, setIsLoading] = useState(false);
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
      const ac = new AbortController();
      
      const fetchEpisodes = async () => {
        try {
          fetchInFlightRef.current = true;
          setIsLoading(true);
          const res = await fetch('/api/episodes', { signal: ac.signal });
          if (!res.ok) {
            throw new Error('Failed to load episodes for search');
          }
          const data: Episode[] = await res.json();
          setEpisodeData(data);
        } catch (e) {
          if ((e as any).name !== 'AbortError') {
            console.error(e);
          }
        } finally {
          setIsLoading(false);
          fetchInFlightRef.current = false;
        }
      };

      fetchEpisodes();
      
      return () => ac.abort();
    }
  }, [episodes, episodeData.length]);

  useEffect(() => {
    if (!searchInstance || !query.trim()) {
      setResults([]);
      setSuggestions([]);
      setAiSuggestions([]);
      return;
    }

    const searchResults = searchInstance.search(query);
    const searchSuggestions = searchInstance.getSuggestions(query);
    
    setResults(searchResults.map(r => r.item));
    setSuggestions(searchSuggestions);

    // Generate AI suggestions based on query
    generateAISuggestions(query, episodeData);
  }, [query, searchInstance, episodeData]);

  const generateAISuggestions = (query: string, episodes: Episode[]) => {
    if (!query.trim() || episodes.length === 0) {
      setAiSuggestions([]);
      return;
    }

    // Simulate AI-powered suggestions
    const aiSuggestions: AISuggestion[] = [];
    
    // Find trending topics
    const allTags = episodes.flatMap(ep => ep.tags);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const trendingTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tag, count]) => ({
        text: tag,
        type: 'trending' as const,
        confidence: Math.min(count / episodes.length, 1)
      }));

    aiSuggestions.push(...trendingTags);

    // Find related concepts
    const relatedConcepts = episodes
      .filter(ep => ep.title.toLowerCase().includes(query.toLowerCase()) || 
                   ep.subtitle.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 2)
      .map(ep => ({
        text: ep.title,
        type: 'concept' as const,
        confidence: 0.8
      }));

    aiSuggestions.push(...relatedConcepts);

    setAiSuggestions(aiSuggestions);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-orange-400" />;
      case 'concept':
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      default:
        return <Tag className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type="text"
          placeholder="Search episodes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary hover:border-ring"
        />
        {query && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </motion.button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <motion.div
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query || results.length > 0 || suggestions.length > 0 || aiSuggestions.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-xl backdrop-blur-sm glass-ultra"
          >
            <div className="max-h-96 overflow-y-auto p-2">
              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1 mb-4"
                >
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-3 w-3" />
                    AI Suggestions
                  </div>
                  {aiSuggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setQuery(suggestion.text)}
                      className="flex w-full items-center space-x-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {getSuggestionIcon(suggestion.type)}
                      <span className="flex-1">{suggestion.text}</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 opacity-60" />
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Search Results */}
              {query && results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1 mb-4"
                >
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Episodes ({results.length})
                  </div>
                  {results.slice(0, 5).map((episode, index) => (
                    <motion.div
                      key={episode.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link
                        href={`/episodes/${episode.slug}`}
                        className="flex items-center space-x-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
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
                        <div className="text-xs text-muted-foreground">
                          {episode.platform === 'chimera' ? 'Chimera' : 'Banterpacks'}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Regular Suggestions */}
              {suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-1"
                >
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    Suggestions
                  </div>
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setQuery(suggestion)}
                      className="flex w-full items-center space-x-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>{suggestion}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* No Results */}
              {query && results.length === 0 && suggestions.length === 0 && aiSuggestions.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-2 py-4 text-center text-sm text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <p>No results found for &ldquo;{query}&rdquo;</p>
                    <p className="text-xs">Try different keywords or check spelling</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close search */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
