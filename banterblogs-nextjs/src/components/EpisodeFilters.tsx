'use client';

import { useMemo, useState } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeSearch } from '@/lib/search';
import { EpisodeCard } from './EpisodeCard';

interface EpisodeFiltersProps {
  episodes: EpisodeSummary[];
}

type SortKey = 'date' | 'title' | 'complexity' | 'files';

// Incremental rendering: SSR-ing all 268 cards produced a ~2MB HTML document.
// Render a page at a time; "Load more" extends the window, and any filter
// change resets it (keyed on the filter signature — no setState-in-effect).
const PAGE_SIZE = 36;

export function EpisodeFilters({ episodes }: EpisodeFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const filterKey = `${searchQuery}|${selectedTag}|${sortBy}|${sortOrder}`;
  const [visible, setVisible] = useState({ key: filterKey, count: PAGE_SIZE });
  const visibleCount = visible.key === filterKey ? visible.count : PAGE_SIZE;

  const searchInstance = useMemo(() => new EpisodeSearch(episodes), [episodes]);

  const filteredEpisodes = useMemo(() => {
    let filtered: EpisodeSummary[] = episodes;

    // Search filter
    if (searchQuery) {
      const searchResults = searchInstance.search(searchQuery);
      filtered = searchResults.map(r => r.item);
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(episode => 
        episode.tags.some(tag => tag.toLowerCase().includes(selectedTag.toLowerCase()))
      );
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  }, [episodes, searchQuery, selectedTag, sortBy, sortOrder, searchInstance]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    episodes.forEach(episode => {
      episode.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [episodes]);

  return (
    <div className="mb-12 space-y-6">
      <div className="signal-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search episodes, tags, or systems..."
                aria-label="Search episodes, tags, or systems"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/60 px-10 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort episodes by"
                className="rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="date">Date</option>
                <option value="title">Title</option>
                <option value="complexity">Complexity</option>
                <option value="files">Files</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                aria-label={sortOrder === 'asc' ? 'Sorted ascending — switch to descending' : 'Sorted descending — switch to ascending'}
                className="flex items-center justify-center rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm ring-offset-background hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" aria-hidden="true" /> : <SortDesc className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Showing {filteredEpisodes.length} of {episodes.length} episodes
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
            selectedTag === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${
              selectedTag === tag
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {filteredEpisodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          No episodes match your filters yet. Try adjusting the search or tag selection.
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredEpisodes.slice(0, visibleCount).map((episode) => (
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
          {filteredEpisodes.length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisible({ key: filterKey, count: visibleCount + PAGE_SIZE })}
                className="rounded-xl border border-input bg-background/60 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Load more ({filteredEpisodes.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
