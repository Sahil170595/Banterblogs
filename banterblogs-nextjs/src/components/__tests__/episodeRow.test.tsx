import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EpisodeSummary } from '@/lib/episodes';
import { EpisodeRow } from '../EpisodeRow';

// The archived episodes' index entry (Phase R3): the /show row pattern, light
// enough for 268 of them, instead of a glass card with a stat box. Every figure
// the card printed is still there, on one mono meta line.

const episode = (overrides: Partial<EpisodeSummary> = {}): EpisodeSummary => ({
  id: 10074,
  displayId: 74,
  slug: 'chimera-episode-074',
  title: 'Heat-based escalation',
  subtitle: 'The debate engine learns to escalate',
  date: '2026-05-08T00:00:00.000Z',
  commit: 'a16e4c8f9b2d',
  preview: 'Escalation now follows the heat of the debate.',
  filesChanged: 12,
  linesAdded: 3400,
  complexity: 65,
  tags: ['chimera', 'architecture', 'performance', 'ai', 'safety'],
  readingTime: 7,
  platform: 'chimera',
  ...overrides,
});
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const classesIn = (markup: string) => [...markup.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

describe('EpisodeRow', () => {
  it('is one article whose link is a hairline row with a trailing arrow', () => {
    const markup = renderToStaticMarkup(<EpisodeRow episode={episode()} />);
    expect(markup).toMatch(/^<article[^>]*><a [^>]*class="[^"]*list-row/);
    expect(markup.match(/<a /g)).toHaveLength(1);
    expect(markup).toContain('href="/episodes/chimera-episode-074"');
    expect(markup).toMatch(/<h2 class="[^"]*text-heading-20[^"]*">Heat-based escalation<\/h2>/);
    expect(markup).toMatch(/class="[^"]*row-arrow/);
  });

  it('keeps every figure the card printed: number, platform, date, subtitle, preview, stats, commit and tags', () => {
    const all = text(renderToStaticMarkup(<EpisodeRow episode={episode()} />));
    for (const part of [
      '74',
      'Chimera',
      'May 8, 2026',
      'The debate engine learns to escalate',
      'Escalation now follows the heat of the debate.',
      '12 files changed',
      '3,400 lines added',
      '7 min read',
      'chaos score 65/100',
      '#a16e4c8',
      'chimera',
      'architecture',
      'performance',
      '+2 more',
    ]) {
      expect(all, part).toContain(part);
    }
    // the fourth tag onward is counted, not listed
    expect(all).not.toMatch(/\bsafety\b/);
  });

  it('pads the number, dates in UTC, and says untracked without a commit', () => {
    const all = text(renderToStaticMarkup(<EpisodeRow episode={episode({ displayId: 7, commit: '', date: '2026-05-08T00:30:00.000Z' })} />));
    expect(all).toContain('07');
    expect(all).toContain('May 8, 2026');
    expect(all).toContain('untracked');
    expect(text(renderToStaticMarkup(<EpisodeRow episode={episode({ displayId: 142 })} />))).toContain('142');
  });

  it('draws no box: no border, no glass, no retired panel classes', () => {
    const markup = renderToStaticMarkup(<EpisodeRow episode={episode()} />);
    expect(classesIn(markup).filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
    expect(markup).not.toMatch(/glass-ultra|backdrop|signal-|blur/);
  });

  // R4 design re-judge: /episodes rendered 160 uppercase and 196 mono
  // elements and a wall of boxed tag pills. Mono stays where it carries
  // meaning (the number and the commit hash); nothing in a row shouts.
  it('keeps mono for the number and the commit hash only, and sets nothing in uppercase', () => {
    const markup = renderToStaticMarkup(<EpisodeRow episode={episode()} />);
    expect(classesIn(markup)).not.toContain('text-label-12-mono');
    expect(classesIn(markup)).not.toContain('uppercase');
    const mono = [...markup.matchAll(/<(\w+) [^>]*class="[^"]*font-mono[^"]*"[^>]*>([^<]*)</g)].map((m) => m[2]);
    expect(mono).toEqual(['74', '#a16e4c8']);
    // without a commit there is no hash to set in mono
    const untracked = renderToStaticMarkup(<EpisodeRow episode={episode({ commit: '' })} />);
    expect([...untracked.matchAll(/class="[^"]*font-mono/g)]).toHaveLength(1);
  });

  it('lists its tags as one quiet sentence-case line, the rest counted, with no pills', () => {
    const markup = renderToStaticMarkup(<EpisodeRow episode={episode()} />);
    expect(classesIn(markup)).not.toContain('rounded-full');
    const line = /<p class="([^"]*)"[^>]*>(?:(?!<\/p>).)*chimera, architecture, performance(?:(?!<\/p>).)*\+2 more(?:(?!<\/p>).)*<\/p>/.exec(markup);
    expect(line).not.toBeNull();
    expect(line![1].split(/\s+/)).toEqual(expect.arrayContaining(['text-label-13']));
  });
});
