import Fuse from 'fuse.js';
import type { EpisodeSummary } from './episodes';

export interface SearchResult {
  item: EpisodeSummary;
  score?: number;
}

export class EpisodeSearch {
  private fuse: Fuse<EpisodeSummary>;
  private episodes: EpisodeSummary[];

  constructor(episodes: EpisodeSummary[]) {
    this.episodes = episodes;
    this.fuse = new Fuse(episodes, {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'subtitle', weight: 0.3 },
        { name: 'preview', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
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

  searchByTag(tag: string): EpisodeSummary[] {
    return this.episodes.filter((episode) =>
      episode.tags.some((t) => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  searchByComplexity(min: number, max: number): EpisodeSummary[] {
    return this.episodes.filter((episode) =>
      episode.complexity >= min && episode.complexity <= max
    );
  }
}

// ── Site search: the /search.json index (reports, tools, episodes) ──

export type SearchEntryType = 'report' | 'tool' | 'episode';

/** One /search.json row. Text fields are plain text; markdown is stripped at build. */
export interface SearchEntry {
  type: SearchEntryType;
  slug: string;
  title: string;
  href: string;
  description?: string;
  /** reports only: the research phase */
  phase?: string;
}

export interface SearchGroup {
  type: SearchEntryType;
  entries: SearchEntry[];
}

// Ten rows plus group labels fit the results panel (max-h-96) without scrolling.
const MAX_RESULTS_PER_GROUP: Record<SearchEntryType, number> = { report: 5, tool: 2, episode: 3 };
// Canonical TR pages also answer to their short id: "TR138".
const TR_REPORT_SLUG = /^technical-report-(\d+)$/;

// "TR-138", "tr 138" and "Technical Report 138" all reduce to one key.
const compactKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export class SiteSearch {
  private readonly fuse: Fuse<SearchEntry>;
  private readonly byIdentifier = new Map<string, SearchEntry[]>();

  constructor(entries: SearchEntry[]) {
    this.fuse = new Fuse(entries, {
      keys: [
        { name: 'title', weight: 0.6 },
        { name: 'slug', weight: 0.2 },
        { name: 'description', weight: 0.15 },
        { name: 'phase', weight: 0.05 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    for (const entry of entries) {
      const tr = TR_REPORT_SLUG.exec(entry.slug);
      for (const id of tr ? [compactKey(entry.slug), `tr${tr[1]}`] : [compactKey(entry.slug)]) {
        this.byIdentifier.set(id, [...(this.byIdentifier.get(id) ?? []), entry]);
      }
    }
  }

  /** Exact identifier hits first, then fuzzy matches; grouped by type, episodes last. */
  search(query: string): SearchGroup[] {
    const key = compactKey(query);
    if (!key) return [];
    const exact = this.byIdentifier.get(key) ?? [];
    const fuzzy = this.fuse.search(query).map((result) => result.item).filter((entry) => !exact.includes(entry));

    // a Map keeps insertion order, so groups follow each type's best-ranked hit
    const byType = new Map<SearchEntryType, SearchEntry[]>();
    for (const entry of [...exact, ...fuzzy]) {
      const group = byType.get(entry.type) ?? [];
      if (group.length < MAX_RESULTS_PER_GROUP[entry.type]) group.push(entry);
      byType.set(entry.type, group);
    }
    const groups: SearchGroup[] = [];
    for (const [type, entries] of byType) {
      if (type !== 'episode') groups.push({ type, entries });
    }
    const episodes = byType.get('episode');
    if (episodes) groups.push({ type: 'episode', entries: episodes });
    return groups;
  }
}

const MD_HEADING = /^#{1,6}\s+/;
const MD_LINK = /!?\[([^\]]*)\]\([^)]*\)/g;
const MD_CODE = /`([^`]*)`/g;
const MD_STRONG = /\*\*(.+?)\*\*/g;
// asterisks only: underscores belong to identifiers here (VLLM_BATCH_INVARIANT)
const MD_EMPHASIS = /\*(\S(?:[^*]*\S)?)\*/g;

/** Inline markdown to plain text, for search titles and snippets. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(MD_HEADING, '')
    .replace(MD_LINK, '$1')
    .replace(MD_CODE, '$1')
    .replace(MD_STRONG, '$1')
    .replace(MD_EMPHASIS, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
