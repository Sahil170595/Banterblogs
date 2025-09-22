'use client';

import { useMemo, useState } from 'react';
import { Search, SortAsc, SortDesc } from 'lucide-react';
import { Episode } from '@/lib/episodes';
import { EpisodeSearch } from '@/lib/search';
import { EpisodeCard } from './EpisodeCard';

interface EpisodeFiltersProps {
  episodes: Episode[];
}

type SortKey = 'date' | 'title' | 'complexity' | 'files';

export function EpisodeFilters({ episodes }: EpisodeFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTag, setSelectedTag] = useState<string>('');

  const searchInstance = useMemo(() => new EpisodeSearch(episodes), [episodes]);

  const filteredEpisodes = useMemo(() => {
    let filtered: Episode[] = episodes;

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
    <div className="mb-12 space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search episodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="complexity">Complexity</option>
            <option value="files">Files</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center justify-center rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag('')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedTag === ''
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedTag === tag
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredEpisodes.length} of {episodes.length} episodes
      </div>

      {filteredEpisodes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No episodes match your filters yet. Try adjusting the search or tag selection.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEpisodes.map((episode, index) => (
            <EpisodeCard key={episode.id} episode={episode} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
