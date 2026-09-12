import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EpisodeSummary } from '@/lib/episodes';
import { ContentRecommendations, RECOMMENDATION_COUNT, recommendEpisodes } from '../ContentRecommendations';
import { EpisodeStats } from '../EpisodeStats';

const episode = (id: number, overrides: Partial<EpisodeSummary> = {}): EpisodeSummary => ({
  id,
  displayId: id,
  slug: `episode-${id}`,
  title: `Episode ${id}`,
  subtitle: '',
  date: '2025-09-01T00:00:00.000Z',
  commit: '',
  preview: `Preview ${id}`,
  filesChanged: 1,
  linesAdded: 1,
  complexity: 50,
  tags: [],
  readingTime: 3,
  platform: 'banterpacks',
  ...overrides,
});

const LONG_AGO = '2024-01-01T00:00:00.000Z';
const current = episode(1, { tags: ['ai', 'testing'] });
const ARCHIVE = [
  current,
  episode(2, { platform: 'chimera', date: LONG_AGO, complexity: 5 }), // shares nothing: 0
  episode(3, { tags: ['ai', 'testing'] }), // two tags + platform + recent + complexity: 140
  episode(4, { tags: ['ai'] }), // one tag + platform + recent + complexity: 100
  episode(5), // platform + recent + complexity: 60
  episode(6, { platform: 'chimera', date: LONG_AGO }), // complexity only: 10
];

describe('episode recommendations', () => {
  it('scores the archive and keeps only the top picks, never the current episode', () => {
    const picks = recommendEpisodes(current, ARCHIVE);

    expect(picks).toHaveLength(RECOMMENDATION_COUNT);
    expect(picks.map((pick) => pick.id)).toEqual([3, 4, 5]);
  });

  it('renders the picks as server markup with the reason for each', () => {
    const html = renderToStaticMarkup(
      <ContentRecommendations current={current} recommendations={recommendEpisodes(current, ARCHIVE)} />,
    );

    expect(html.match(/href="\/episodes\/episode-\d+"/g)).toHaveLength(RECOMMENDATION_COUNT);
    expect(html).toContain('Similar topics: ai, testing');
    expect(html).toContain('Same platform: banterpacks');
  });

  it('labels a pick with its episode number, not the internal id', () => {
    const chimera = episode(10074, { displayId: 74, platform: 'chimera', slug: 'chimera-episode-074' });
    const html = renderToStaticMarkup(<ContentRecommendations current={current} recommendations={[chimera]} />);

    expect(html).toContain('#74');
    expect(html).not.toContain('#10074');
  });

  it('keeps the archive and the article body out of the page payload', () => {
    const read = (file: string) => readFileSync(path.resolve(__dirname, file), 'utf8');
    const page = read('../../app/episodes/[slug]/page.tsx');

    for (const component of ['../ContentRecommendations.tsx', '../EpisodeStats.tsx']) {
      expect(read(component), component).not.toMatch(/^['"]use client['"]/m);
    }
    expect(page).not.toMatch(/allEpisodes=\{/);
    expect(page).not.toMatch(/<EpisodeStats\s+episode=/);
  });
});

describe('episode stats', () => {
  it('prints the four numbers it is given', () => {
    const html = renderToStaticMarkup(
      <EpisodeStats filesChanged={12} linesAdded={3400} readingTime={7} complexity={65} />,
    );

    expect(html).toContain('>12<');
    expect(html).toContain('>3,400<');
    expect(html).toContain('>7 min<');
    expect(html).toContain('>65<');
  });
});
