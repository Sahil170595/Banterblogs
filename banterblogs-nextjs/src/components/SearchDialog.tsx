'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, Package, Search, X } from 'lucide-react';
import type { SearchEntry, SearchEntryType, SiteSearch } from '@/lib/search';
import Link from 'next/link';

const SEARCH_INDEX_URL = '/search.json';

const GROUP_LABEL: Record<SearchEntryType, string> = { report: 'Reports', tool: 'Tools', episode: 'Episodes' };
const GROUP_ICON = { report: FileText, tool: Package, episode: BookOpen } as const;

// Module-level so the desktop and mobile Header instances share one fetch and
// one index — and nothing loads at all until search is first opened.
let searchLoader: Promise<SiteSearch | null> | null = null;

function loadSearch(): Promise<SiteSearch | null> {
  if (!searchLoader) {
    searchLoader = (async () => {
      try {
        // Dynamic import keeps fuse.js out of the sitewide header bundle; the
        // library and the index download in parallel.
        const [{ SiteSearch }, response] = await Promise.all([import('@/lib/search'), fetch(SEARCH_INDEX_URL)]);
        if (!response.ok) throw new Error(`Failed to load ${SEARCH_INDEX_URL}: ${response.status}`);
        return new SiteSearch((await response.json()) as SearchEntry[]);
      } catch (error) {
        console.error('[SearchDialog] search index failed to load:', error);
        searchLoader = null; // allow retry on next open
        return null;
      }
    })();
  }
  return searchLoader;
}

export function SearchDialog() {
  const router = useRouter();
  const listboxId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<SiteSearch | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // Keyed on the query so a new query resets the highlight without an effect.
  const [active, setActive] = useState({ query: '', index: -1 });
  const activeIndex = active.query === query ? active.index : -1;
  const setActiveIndex = useCallback(
    (updater: (prev: number) => number) => {
      setActive((prev) => ({ query, index: updater(prev.query === query ? prev.index : -1) }));
    },
    [query],
  );

  // Load the index on first open, not on mount — visitors who never touch
  // search download nothing.
  useEffect(() => {
    if (!isOpen || site || loadFailed) return;
    let cancelled = false;
    loadSearch().then((instance) => {
      if (cancelled) return;
      if (instance) setSite(instance);
      else setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, site, loadFailed]);

  // Results are pure functions of (query, index) — derive, don't sync state.
  const groups = useMemo(() => (site && query.trim() ? site.search(query) : []), [query, site]);
  const options = useMemo(() => groups.flatMap((group) => group.entries), [groups]);

  const open = () => {
    setIsOpen(true);
    setLoadFailed(false); // a reopen retries a failed load
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActive({ query: '', index: -1 });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!options.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i: number) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i: number) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      router.push(options[activeIndex].href);
      close();
    }
  };

  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const showPanel = isOpen && query.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          type="search"
          name="q"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          placeholder="Search reports, tools, episodes…"
          aria-label="Search reports, tools and episodes"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={open}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary hover:border-ring [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -m-1.5 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute top-full z-50 mt-2 w-full rounded-xl border border-border bg-background shadow-xl backdrop-blur-sm">
          <div
            className="max-h-96 overflow-y-auto overscroll-contain p-2"
            role="listbox"
            id={listboxId}
            aria-label="Search results"
          >
            {groups.map((group) => {
              const Icon = GROUP_ICON[group.type];
              return (
                <div key={group.type} role="group" aria-label={GROUP_LABEL[group.type]} className="space-y-1">
                  <div aria-hidden="true" className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {GROUP_LABEL[group.type]}
                  </div>
                  {group.entries.map((entry) => {
                    const index = options.indexOf(entry);
                    const detail = entry.type === 'report' ? entry.phase : entry.description;
                    return (
                      <Link
                        key={entry.href}
                        id={optionId(index)}
                        role="option"
                        aria-selected={activeIndex === index}
                        href={entry.href}
                        className={`flex items-center space-x-3 rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${activeIndex === index ? 'bg-accent text-accent-foreground' : ''}`}
                        onClick={close}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="font-medium">{entry.title}</div>
                          {detail && <div className="text-xs text-muted-foreground line-clamp-1">{detail}</div>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {loadFailed ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Search is unavailable right now. Close it and try again.
              </div>
            ) : !site ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</div>
            ) : (
              options.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )
            )}
          </div>
          <p role="status" className="sr-only">
            {site ? `${options.length} results` : ''}
          </p>
        </div>
      )}

      {/* Overlay to close search (pointer convenience; Escape handles keyboard) */}
      {isOpen && <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />}
    </div>
  );
}
