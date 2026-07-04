'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Tag, FileText, X } from 'lucide-react';
import type { EpisodeSearch } from '@/lib/search';
import type { EpisodeSummary } from '@/lib/episodes';
import Link from 'next/link';

interface SearchDialogProps {
  episodes?: EpisodeSummary[];
}

const MAX_RESULTS = 5;

// Module-level so the desktop and mobile Header instances share one fetch and
// one fuse.js index — and nothing loads at all until search is first opened.
let searchLoader: Promise<EpisodeSearch | null> | null = null;

function loadSearch(seed: EpisodeSummary[]): Promise<EpisodeSearch | null> {
  if (!searchLoader) {
    searchLoader = (async () => {
      try {
        // Dynamic import keeps fuse.js out of the sitewide header bundle.
        const { EpisodeSearch } = await import('@/lib/search');
        if (seed.length > 0) return new EpisodeSearch(seed);
        const res = await fetch('/api/episodes');
        if (!res.ok) throw new Error(`Failed to load episodes for search: ${res.status}`);
        const data: EpisodeSummary[] = await res.json();
        return new EpisodeSearch(data);
      } catch (error) {
        console.error('[SearchDialog] search index failed to load:', error);
        searchLoader = null; // allow retry on next open
        return null;
      }
    })();
  }
  return searchLoader;
}

export function SearchDialog({ episodes = [] }: SearchDialogProps) {
  const router = useRouter();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchInstance, setSearchInstance] = useState<EpisodeSearch | null>(null);
  // Keyed on the query so a new query resets the highlight without an effect.
  const [active, setActive] = useState({ query: '', index: -1 });
  const activeIndex = active.query === query ? active.index : -1;
  const setActiveIndex = useCallback(
    (updater: (prev: number) => number) => {
      setActive((prev) => ({ query, index: updater(prev.query === query ? prev.index : -1) }));
    },
    [query],
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Load the index on first open, not on mount — visitors who never touch
  // search download nothing.
  useEffect(() => {
    if (!isOpen || searchInstance) return;
    let cancelled = false;
    loadSearch(episodes).then((instance) => {
      if (!cancelled && instance) setSearchInstance(instance);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, searchInstance, episodes]);

  // Results are pure functions of (query, index) — derive, don't sync state.
  const { results, suggestions } = useMemo(() => {
    if (!searchInstance || !query.trim()) {
      return { results: [] as EpisodeSummary[], suggestions: [] as string[] };
    }
    return {
      results: searchInstance.search(query).map((r) => r.item).slice(0, MAX_RESULTS),
      suggestions: searchInstance.getSuggestions(query),
    };
  }, [query, searchInstance]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActive({ query: '', index: -1 });
  }, []);

  // Keyboard-navigable option list: episode results first, then tag suggestions.
  const optionCount = results.length + suggestions.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!optionCount) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i: number) => (i + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i: number) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < results.length) {
        router.push(`/episodes/${results[activeIndex].slug}`);
        close();
      } else {
        setQuery(suggestions[activeIndex - results.length]);
        inputRef.current?.focus();
      }
    }
  };

  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const showPanel = isOpen && (query.length > 0 || optionCount > 0);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search episodes..."
          aria-label="Search episodes"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary hover:border-ring"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-xl backdrop-blur-sm">
          <div className="max-h-96 overflow-y-auto p-2" role="listbox" id={listboxId} aria-label="Search results">
            {query && results.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Episodes ({results.length})
                </div>
                {results.map((episode, index) => (
                  <Link
                    key={episode.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={activeIndex === index}
                    href={`/episodes/${episode.slug}`}
                    className={`flex items-center space-x-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${activeIndex === index ? 'bg-accent text-accent-foreground' : ''}`}
                    onClick={close}
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
                    key={suggestion}
                    id={optionId(results.length + index)}
                    role="option"
                    aria-selected={activeIndex === results.length + index}
                    onClick={() => {
                      setQuery(suggestion);
                      inputRef.current?.focus();
                    }}
                    className={`flex w-full items-center space-x-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${activeIndex === results.length + index ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}

            {query && optionCount === 0 && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay to close search (pointer convenience; Escape handles keyboard) */}
      {isOpen && <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />}
    </div>
  );
}
