'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeSearch } from '@/lib/search';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem, HEAD_ENTRANCE_GROUPS } from '@/components/motion/entrance';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { EpisodeRow } from './EpisodeRow';

interface EpisodeFiltersProps {
  episodes: EpisodeSummary[];
  /** the page head's entrance groups the toolbar follows */
  entranceAfter?: number;
}

type SortKey = 'date' | 'title' | 'complexity' | 'files';
type SortOrder = 'asc' | 'desc';

const SORT_KEYS: readonly SortKey[] = ['date', 'title', 'complexity', 'files'];
const SORT_ORDERS: readonly SortOrder[] = ['asc', 'desc'];

interface Filters {
  query: string;
  tag: string;
  sortBy: SortKey;
  sortOrder: SortOrder;
}

const DEFAULT_FILTERS: Filters = { query: '', tag: '', sortBy: 'date', sortOrder: 'asc' };

// The filters live in the URL (?q=&tag=&sort=&order=), defaults left out, so a
// reload or a shared link opens the same list.
export const FILTER_PARAMS = { query: 'q', tag: 'tag', sortBy: 'sort', sortOrder: 'order' } as const;

const oneOf = <T extends string>(allowed: readonly T[], value: string | null, fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

function filtersFrom(params: URLSearchParams): Filters {
  return {
    query: params.get(FILTER_PARAMS.query) ?? DEFAULT_FILTERS.query,
    tag: params.get(FILTER_PARAMS.tag) ?? DEFAULT_FILTERS.tag,
    sortBy: oneOf(SORT_KEYS, params.get(FILTER_PARAMS.sortBy), DEFAULT_FILTERS.sortBy),
    sortOrder: oneOf(SORT_ORDERS, params.get(FILTER_PARAMS.sortOrder), DEFAULT_FILTERS.sortOrder),
  };
}

/** the query string for `filters`, keeping any other parameter in `base` */
function queryFor(filters: Filters, base: string): string {
  const params = new URLSearchParams(base);
  for (const key of Object.keys(FILTER_PARAMS) as Array<keyof Filters>) {
    params.delete(FILTER_PARAMS[key]);
    if (filters[key] !== DEFAULT_FILTERS[key]) params.set(FILTER_PARAMS[key], filters[key]);
  }
  return params.toString();
}

// Incremental rendering: SSR-ing all 268 cards produced a ~2MB HTML document.
// Render a page at a time; "Load more" extends the window, and any filter
// change resets it (keyed on the filter signature — no setState-in-effect).
const PAGE_SIZE = 36;
const OPTION_CLASS = 'bg-background text-foreground';
// The toolbar, then the first rows, join the page head's first-load entrance;
// entranceItem caps where the later ones start.
const ENTRANCE_ROWS = 3;
const FIELD = 'h-10 rounded-full border border-border bg-background text-copy-14 text-foreground transition-colors duration-fast ease-standard hover:border-foreground/30 focus-visible:border-primary/60';
const CHIP = 'pressable h-7 shrink-0 rounded-full px-3 text-label-13 font-medium';
// an inset ember ring on the selected chip, a cue beyond its tint
const CHIP_SELECTED = 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary))]';

export function EpisodeFilters({ episodes, entranceAfter = HEAD_ENTRANCE_GROUPS }: EpisodeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  // The visitor's filters lead; the URL follows through router.replace (no
  // history entry, no scroll). The list renders outside the Suspense boundary
  // that reads the URL, so the prerendered default list hydrates in place.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [urlParams, setUrlParams] = useState('');
  // query strings written but not yet read back: while typing, an older write
  // can land after a newer keystroke and must not replace it
  const pendingWrites = useRef<string[]>([]);
  const onUrlChange = useCallback((params: string) => {
    setUrlParams(params);
    const pending = pendingWrites.current;
    const echo = pending.indexOf(params);
    if (echo >= 0) {
      pending.splice(0, echo + 1);
      return;
    }
    pending.length = 0;
    setFilters(filtersFrom(new URLSearchParams(params)));
  }, []);
  const { query: searchQuery, tag: selectedTag, sortBy, sortOrder } = filters;
  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const query = queryFor(next, urlParams);
    pendingWrites.current.push(query);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  // only a tag picked with the pointer crossfades the list; typing and keys swap it at once
  const [pointerPick, setPointerPick] = useState(false);
  const filterKey = `${searchQuery}|${selectedTag}|${sortBy}|${sortOrder}`;
  const [visible, setVisible] = useState({ key: filterKey, count: PAGE_SIZE });
  const visibleCount = visible.key === filterKey ? visible.count : PAGE_SIZE;

  const searchInstance = useMemo(() => new EpisodeSearch(episodes), [episodes]);

  const filteredEpisodes = useMemo(() => {
    let filtered: EpisodeSummary[] = episodes;

    if (searchQuery) {
      filtered = searchInstance.search(searchQuery).map((r) => r.item);
    }

    if (selectedTag) {
      filtered = filtered.filter((episode) => episode.tags.some((tag) => tag.toLowerCase().includes(selectedTag.toLowerCase())));
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'complexity':
          comparison = a.complexity - b.complexity;
          break;
        case 'files':
          comparison = a.filesChanged - b.filesChanged;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [episodes, searchQuery, selectedTag, sortBy, sortOrder, searchInstance]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    episodes.forEach((episode) => episode.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [episodes]);

  // a key press on a button reports no clicks (detail 0); a pointer click reports one or more
  const pickTag = (tag: string) => (event: MouseEvent<HTMLButtonElement>) => {
    setPointerPick(event.detail > 0);
    update({ tag });
  };

  const chip = (tag: string, label: string) => {
    const selected = selectedTag === tag;
    return (
      <button
        key={label}
        type="button"
        onClick={pickTag(tag)}
        aria-pressed={selected}
        className={cn(
          CHIP,
          selected ? CHIP_SELECTED : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <Suspense fallback={null}>
        <SearchParamsSync onChange={onUrlChange} />
      </Suspense>
      <div {...entranceItem(0, entranceAfter)} className="space-y-3 sm:space-y-4">
        {/* on a phone: the search on its own line, then sort, order and the count on one */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-3">
          <div className="relative w-full sm:w-auto sm:flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Search episodes, tags, or systems…"
              aria-label="Search episodes, tags, or systems"
              value={searchQuery}
              onChange={(e) => {
                setPointerPick(false);
                update({ query: e.target.value });
              }}
              className={cn(FIELD, 'w-full pl-10 pr-4 text-base placeholder:text-muted-foreground md:text-copy-14')}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setPointerPick(false);
                update({ sortBy: oneOf(SORT_KEYS, e.target.value, DEFAULT_FILTERS.sortBy) });
              }}
              aria-label="Sort episodes by"
              className={cn(FIELD, 'px-4')}
            >
              {/* opaque, or Windows draws the native list light with light text */}
              <option className={OPTION_CLASS} value="date">Date</option>
              <option className={OPTION_CLASS} value="title">Title</option>
              <option className={OPTION_CLASS} value="complexity">Complexity</option>
              <option className={OPTION_CLASS} value="files">Files</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setPointerPick(false);
                update({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
              }}
              aria-label={sortOrder === 'asc' ? 'Sorted ascending — switch to descending' : 'Sorted descending — switch to ascending'}
              className={cn(FIELD, 'pressable inline-flex w-10 items-center justify-center hover:text-primary')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" aria-hidden="true" /> : <SortDesc className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          <p className="ml-auto text-label-13 text-muted-foreground sm:ml-2" aria-live="polite">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
          </p>
        </div>

        {/* one line that scrolls sideways on a phone, bleeding to the screen edges; wrapped from sm */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {chip('', 'All')}
          {allTags.map((tag) => chip(tag, tag))}
        </div>
      </div>

      {filteredEpisodes.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-copy-16 text-muted-foreground">No episodes match your filters yet. Try adjusting the search or tag selection.</p>
          <Button
            className="mt-5"
            onClick={() => {
              setPointerPick(false);
              update({ query: DEFAULT_FILTERS.query, tag: DEFAULT_FILTERS.tag });
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          {/* keyed on the filters, so a pointer pick replays the crossfade on a fresh list */}
          <ul key={filterKey} data-tab-panel="" data-switched={pointerPick ? '' : undefined}>
            {filteredEpisodes.slice(0, visibleCount).map((episode, index) => (
              <Reveal as="li" key={episode.id} {...(index < ENTRANCE_ROWS ? entranceItem(index + 1, entranceAfter) : {})}>
                <EpisodeRow episode={episode} />
              </Reveal>
            ))}
          </ul>
          {filteredEpisodes.length > visibleCount && (
            <div className="flex justify-center pt-6">
              <Button onClick={() => setVisible({ key: filterKey, count: visibleCount + PAGE_SIZE })}>
                Load more ({filteredEpisodes.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Reading the URL opts only this empty boundary out of the static prerender.
function SearchParamsSync({ onChange }: { onChange: (params: string) => void }) {
  const params = useSearchParams().toString();
  useEffect(() => onChange(params), [params, onChange]);
  return null;
}
