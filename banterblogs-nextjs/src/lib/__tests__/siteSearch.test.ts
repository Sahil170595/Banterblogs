// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { GET } from '@/app/search.json/route';
import { SiteSearch, toPlainText, type SearchEntry, type SearchGroup } from '../search';
import { REPORTS } from '../constants';
import { TOOLS } from '../tools';

// Building the index renders the episode archive once; allow a cold run.
const INDEX_BUILD_TIMEOUT_MS = 60_000;

let entries: SearchEntry[] = [];
let site: SiteSearch;

beforeAll(async () => {
  const response = await GET();
  entries = (await response.json()) as SearchEntry[];
  site = new SiteSearch(entries);
}, INDEX_BUILD_TIMEOUT_MS);

const ofType = (type: SearchEntry['type']) => entries.filter((entry) => entry.type === type);
const firstHit = (groups: SearchGroup[]) => groups[0]?.entries[0];

describe('search index (/search.json)', () => {
  it('holds every report page, both tools and the episode archive, research first', () => {
    expect(ofType('report').length).toBeGreaterThanOrEqual(REPORTS.COUNT);
    expect(ofType('tool').map((tool) => tool.slug)).toEqual(TOOLS.map((tool) => tool.slug));
    expect(ofType('episode').length).toBeGreaterThan(0);

    const types = entries.map((entry) => entry.type);
    expect(types.lastIndexOf('report')).toBeLessThan(types.indexOf('tool'));
    expect(types.lastIndexOf('tool')).toBeLessThan(types.indexOf('episode'));
  });

  it('describes a report by slug, title, description and phase', () => {
    expect(entries.find((entry) => entry.slug === 'technical-report-138')).toEqual({
      type: 'report',
      slug: 'technical-report-138',
      href: '/reports/technical-report-138',
      title: 'TR138: Batch Inference Safety Under Non-Determinism',
      description: expect.stringContaining('Audit-layer flip adjudication'),
      phase: 'Phase 5 — Attack Surface',
    });
    // the compendium page's markdown lives outside PublishReady/reports/
    expect(entries.find((entry) => entry.slug === 'compendium')?.href).toBe('/reports/compendium');
  });

  it('routes each tool to its page', () => {
    for (const tool of ofType('tool')) {
      expect(tool.href).toBe(`/tools/${tool.slug}`);
      expect(tool.description).toBeTruthy();
    }
  });

  it('keeps episodes to a slug and a title', () => {
    for (const episode of ofType('episode')) {
      expect(Object.keys(episode).sort()).toEqual(['href', 'slug', 'title', 'type']);
      expect(episode.href).toBe(`/episodes/${episode.slug}`);
    }
  });

  it('ships plain text: no markdown survives into titles or snippets', () => {
    const MARKDOWN = /\*\*|`|\]\(|^#/;
    for (const entry of entries) {
      expect(entry.title, entry.slug).not.toMatch(MARKDOWN);
      expect(entry.description ?? '', entry.slug).not.toMatch(MARKDOWN);
    }
  });
});

describe('site search ranking', () => {
  it('returns the TR138 report first for "TR138"', () => {
    const groups = site.search('TR138');
    expect(groups[0]?.type).toBe('report');
    expect(firstHit(groups)?.slug).toBe('technical-report-138');
  });

  it.each(['tr138', 'TR-138', 'tr 138', 'Technical Report 138'])('resolves "%s" to the same report', (query) => {
    expect(firstHit(site.search(query))?.slug).toBe('technical-report-138');
  });

  it('leads with the tool when the query names one', () => {
    const groups = site.search('quantfit');
    expect(groups[0]?.type).toBe('tool');
    expect(firstHit(groups)?.href).toBe('/tools/quantfit');
  });

  it('lists archived episodes after research, even when an episode matches better', () => {
    const fixture = new SiteSearch([
      { type: 'episode', slug: 'episode-042', href: '/episodes/episode-042', title: 'Batch safety' },
      {
        type: 'report',
        slug: 'technical-report-999',
        href: '/reports/technical-report-999',
        title: 'TR999: Batch safety under load',
      },
    ]);
    expect(fixture.search('batch safety').map((group) => group.type)).toEqual(['report', 'episode']);
  });

  it('finds nothing for a blank query', () => {
    expect(site.search('   ')).toEqual([]);
  });
});

describe('toPlainText', () => {
  it('strips inline markdown and leaves identifiers alone', () => {
    expect(toPlainText('## **Bold** `code` [a link](/x) *emphasis* VLLM_BATCH_INVARIANT=1')).toBe(
      'Bold code a link emphasis VLLM_BATCH_INVARIANT=1',
    );
  });
});
