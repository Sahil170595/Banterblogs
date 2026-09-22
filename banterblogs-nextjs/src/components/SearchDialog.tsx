'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, FileText, Package, Search, X } from 'lucide-react';
import type { SearchEntry, SearchEntryType, SiteSearch } from '@/lib/search';
import Link from 'next/link';
import { cn } from '@/lib/cn';

const SEARCH_INDEX_URL = '/search.json';

const GROUP_LABEL: Record<SearchEntryType, string> = { report: 'Reports', tool: 'Tools', episode: 'Episodes' };
const GROUP_ICON = { report: FileText, tool: Package, episode: BookOpen } as const;
// a foreground tint, so the muted detail line keeps ~7:1, and an ember rule
// on the leading edge, so the highlight does not rest on colour alone
const ACTIVE_OPTION = 'bg-foreground/10 text-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  // What the results panel shows. It outlives close, so the panel fades out
  // with its results instead of flashing an empty state.
  const [panelQuery, setPanelQuery] = useState('');
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
  const groups = useMemo(() => (site && panelQuery.trim() ? site.search(panelQuery) : []), [panelQuery, site]);
  const options = useMemo(() => groups.flatMap((group) => group.entries), [groups]);
  const showPanel = isOpen && query.length > 0;

  const open = () => {
    setIsOpen(true);
    setLoadFailed(false); // a reopen retries a failed load
  };

  // typing opens it too: a field that kept focus through Escape fires no
  // focus event, and the panel would stay shut
  const updateQuery = (next: string) => {
    if (!isOpen) open();
    setQuery(next);
    setPanelQuery(next);
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setActive({ query: '', index: -1 });
  }, []);

  // focus leaving the search (Tab, or a click elsewhere) closes it, so no
  // results panel or click-catcher is left over the page
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!isOpen || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // spent on the search when it had something to close, so the mobile
      // menu around the field stays open
      if (isOpen || query) e.preventDefault();
      close();
      return;
    }
    // a closing panel still holds its last results; never act on them
    if (!showPanel || !options.length) return;
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

  return (
    <div className="relative w-full max-w-md" onBlur={handleBlur}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          ref={inputRef}
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
          aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
          onFocus={open}
          onClick={() => {
            if (!isOpen) open();
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground transition-colors duration-fast ease-standard focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-primary hover:border-ring [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              // the button leaves with the query; focus goes back to the field
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -m-1.5 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors duration-fast ease-standard"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Stays mounted so it can enter and exit on the overlay tokens; closed it
          is visibility:hidden (after the fade), so unfocusable and unannounced. */}
      <div
        // a press on the results keeps focus in the field, so it never blurs
        // (and closes) the search on the way to a click
        onMouseDown={(e) => e.preventDefault()}
        className={`absolute top-full z-50 mt-2 w-full origin-top rounded-xl border border-border bg-background shadow-xl backdrop-blur-sm transition-[opacity,transform,visibility] duration-base ease-standard ${
          showPanel ? 'visible translate-y-0 scale-100 opacity-100' : 'pointer-events-none invisible -translate-y-1 scale-[0.98] opacity-0'
        }`}
      >
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
                      // the arrows and Enter drive the list from the field; Tab leaves it
                      tabIndex={-1}
                      className={cn(
                        'flex items-center space-x-3 rounded-md px-2 py-2 text-sm hover:bg-foreground/[0.06]',
                        activeIndex === index && ACTIVE_OPTION,
                      )}
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
                No results for &ldquo;{panelQuery}&rdquo;
              </div>
            )
          )}
        </div>
        <p role="status" className="sr-only">
          {site ? `${options.length} results` : ''}
        </p>
      </div>

      {/* Overlay to close search (pointer convenience; Escape handles keyboard) */}
      {isOpen && <div className="fixed inset-0 z-40" aria-hidden="true" onClick={close} />}
    </div>
  );
}
