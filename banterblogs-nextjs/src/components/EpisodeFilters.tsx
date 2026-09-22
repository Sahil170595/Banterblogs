'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeSearch } from '@/lib/search';
import { Reveal } from '@/components/motion/Reveal';
import { entranceItem } from '@/components/motion/entrance';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { EpisodeRow } from './EpisodeRow';

interface EpisodeFiltersProps {
  episodes: EpisodeSummary[];
}

type SortKey = 'date' | 'title' | 'complexity' | 'files';

// Incremental rendering: SSR-ing all 268 cards produced a ~2MB HTML document.
// Render a page at a time; "Load more" extends the window, and any filter
// change resets it (keyed on the filter signature — no setState-in-effect).
const PAGE_SIZE = 36;
const OPTION_CLASS = 'bg-background text-foreground';
// The toolbar, then the first rows, join the page head's first-load entrance;
// entranceItem caps where the later ones start.
const ENTRANCE_ROWS = 3;
const FIELD = 'h-10 rounded-full border border-border bg-background text-copy-14 text-foreground transition-colors duration-fast ease-standard hover:border-foreground/30 focus-visible:border-primary/60';
const CHIP = 'pressable h-7 rounded-full px-3 text-label-13 font-medium';

export function EpisodeFilters({ episodes }: EpisodeFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTag, setSelectedTag] = useState<string>('');
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
    setSelectedTag(tag);
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
          selected ? 'bg-primary/15 text-primary' : 'bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div {...entranceItem(0)} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
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
                setSearchQuery(e.target.value);
              }}
              className={cn(FIELD, 'w-full pl-10 pr-4 text-base placeholder:text-muted-foreground md:text-copy-14')}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setPointerPick(false);
                setSortBy(e.target.value as SortKey);
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
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              }}
              aria-label={sortOrder === 'asc' ? 'Sorted ascending — switch to descending' : 'Sorted descending — switch to ascending'}
              className={cn(FIELD, 'pressable inline-flex w-10 items-center justify-center hover:text-primary')}
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" aria-hidden="true" /> : <SortDesc className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          <p className="text-label-13 text-muted-foreground sm:ml-2" aria-live="polite">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
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
              setSearchQuery('');
              setSelectedTag('');
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
              <Reveal as="li" key={episode.id} {...(index < ENTRANCE_ROWS ? entranceItem(index + 1) : {})}>
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
