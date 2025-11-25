import Fuse from 'fuse.js';
import { Episode } from './episodes';

export interface SearchResult {
  item: Episode;
  score?: number;
}

export class EpisodeSearch {
  private fuse: Fuse<Episode>;

  constructor(episodes: Episode[]) {
    this.fuse = new Fuse(episodes, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'subtitle', weight: 0.3 },
        { name: 'preview', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) return [];
    
    const results = this.fuse.search(query);
    return results.map(result => ({
      item: result.item,
      score: result.score,
    }));
  }

  searchByTag(tag: string): Episode[] {
    return this.fuse.getIndex().docs.filter(episode => 
      episode.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    ) as Episode[];
  }

  searchByComplexity(min: number, max: number): Episode[] {
    return this.fuse.getIndex().docs.filter(episode => 
      episode.complexity >= min && episode.complexity <= max
    ) as Episode[];
  }

  getSuggestions(query: string, limit: number = 5): string[] {
    const results = this.search(query);
    const suggestions = new Set<string>();
    
    results.slice(0, limit).forEach(result => {
      // Add title words
      result.item.title.split(' ').forEach(word => {
        if (word.toLowerCase().includes(query.toLowerCase()) && word.length > 2) {
          suggestions.add(word);
        }
      });
      
      // Add tags
      result.item.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(tag);
        }
      });
    });
    
    return Array.from(suggestions).slice(0, limit);
  }
}
