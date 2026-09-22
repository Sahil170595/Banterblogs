import type { ReactElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BanterpacksPage from '@/app/banterpacks/page';
import ChimeraPage from '@/app/chimera/page';
import EpisodesPage from '@/app/episodes/page';
import TagPage from '@/app/tags/[tag]/page';
import TagsPage from '@/app/tags/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import type { Episode } from '@/lib/episodes';

// The archived build-log index pages on the R3 index template: an unboxed
// PageHeader with its entrance, then hairline rows (or, for the topic map, a
// hairline grid), with reveals, and none of the glass cards or boxed hero.

const make = (n: number, platform: 'banterpacks' | 'chimera', tags: string[]): Episode => ({
  id: platform === 'chimera' ? 10000 + n : n,
  displayId: n,
  slug: platform === 'chimera' ? `chimera-episode-00${n}` : `episode-00${n}`,
  title: `${platform} ${n}`,
  subtitle: '',
  date: `2025-10-0${n}T00:00:00.000Z`,
  commit: 'abcdef0123',
  preview: `Preview ${n}`,
  content: '<p>body</p>',
  filesChanged: n,
  linesAdded: n * 10,
  complexity: n,
  tags,
  readingTime: 2,
  platform,
});
const ARCHIVE = [
  make(1, 'banterpacks', ['architecture', 'ai']),
  make(2, 'banterpacks', ['architecture']),
  make(3, 'banterpacks', ['performance']),
  make(1, 'chimera', ['architecture', 'chimera']),
  make(2, 'chimera', ['chimera']),
];
// the page renders the archive through the real pipeline; these tests need only its shape
vi.mock('@/lib/episodes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/episodes')>();
  return { ...actual, getAllEpisodes: async () => ARCHIVE };
});

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const mount = (element: ReactElement) => render(element).container;
const groups = (page: HTMLElement) => [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)].map((g) => g.style.getPropertyValue('--group'));
// bordered elements a page draws itself: only the form fields and hairline buttons may carry one
const boxes = (page: HTMLElement) =>
  [...page.querySelectorAll('*')].filter(
    (el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)) && !['INPUT', 'SELECT', 'BUTTON'].includes(el.tagName) && !el.classList.contains('pressable'),
  );

afterEach(cleanup);

// a head with a meta or actions row rises in three groups; without one, the
// first rows or cells take the third step, one group after the lede
function expectIndexTemplate(page: HTMLElement, headGroups = 3) {
  expect(page.querySelectorAll('h1')).toHaveLength(1);
  expect(groups(page)).toEqual(['0', '1', '2'].slice(0, headGroups));
  const items = [...page.querySelectorAll<HTMLElement>(`[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
  expect(items.length).toBeGreaterThanOrEqual(1);
  for (const item of items) expect(item.style.getPropertyValue('--entrance-items-after')).toBe(String(headGroups));
  expect(page.innerHTML).not.toMatch(/signal-(panel|pill|divider)|glass-ultra|backdrop-blur/);
  expect(boxes(page)).toEqual([]);
}

describe('/episodes', () => {
  it('opens on the archive head with the archived notice and the two platform archives as buttons', async () => {
    const page = mount(await EpisodesPage());
    expectIndexTemplate(page);
    expect(text(page.querySelector('h1')!)).toBe('Episode Archive');
    const all = text(page);
    expect(all).toContain('Archive');
    expect(all).toContain('The full development narrative across Banterpacks and Chimera Engine, from raw commits to benchmarked outcomes.');
    expect(all).toContain(
      'Archived 2026-06-26. These episodes were generated from git commits by a multi-persona pipeline between September 2025 and June 2026. The pipeline is retired; the research program continues at /reports.',
    );
    expect(page.querySelector('a[href="/reports"]')).not.toBeNull();
    const banterpacks = page.querySelector('a[href="/banterpacks"]')!;
    const chimera = page.querySelector('a[href="/chimera"]')!;
    expect(text(banterpacks)).toBe('Banterpacks Episodes 3 episodes');
    expect(text(chimera)).toBe('Chimera Episodes 2 episodes');
    for (const button of [banterpacks, chimera]) expect(button.classList.contains('pressable')).toBe(true);
  });

  it('lists every episode as a row, the first ones joining the entrance', async () => {
    const page = mount(await EpisodesPage());
    expect(page.querySelectorAll('article a.list-row')).toHaveLength(ARCHIVE.length);
    expect(page.querySelectorAll(`[${ENTRANCE_ITEM_ATTRIBUTE}]`).length).toBeGreaterThanOrEqual(2);
  });
});

describe.each([
  ['/chimera', ChimeraPage, 'Chimera Engine', 'Chimera Episodes', '2 episodes covering the constitutional AI debate engine and alignment architecture.', 'Learn about Chimera on the Platform page', 2],
  [
    '/banterpacks',
    BanterpacksPage,
    'Banterpacks',
    'Banterpacks Episodes',
    '3 episodes covering development of the production monorepo — JARVIS gateway, intelligence pipeline, and constitutional AI.',
    'Learn about Banterpacks on the Platform page',
    3,
  ],
])('%s', (_route, Page, eyebrow, title, lede, platformLink, rows) => {
  it('is the index template: head, lede, the platform link as a button, then the rows', async () => {
    const page = mount(await Page());
    expectIndexTemplate(page);
    expect(text(page.querySelector('h1')!)).toBe(title);
    expect(text(page.querySelector('header')!)).toContain(eyebrow);
    expect(text(page)).toContain(lede);
    const link = page.querySelector('a[href="/platform"]')!;
    expect(text(link)).toBe(platformLink);
    expect(link.classList.contains('pressable')).toBe(true);
    expect(page.querySelectorAll('article a.list-row')).toHaveLength(rows);
  });
});

describe('/tags/[tag]', () => {
  it('lists every episode with the tag as a row that reveals, under the topic head', async () => {
    const page = mount(await TagPage({ params: Promise.resolve({ tag: 'architecture' }) }));
    expectIndexTemplate(page, 2);
    expect(text(page.querySelector('h1')!)).toBe('architecture');
    expect(text(page.querySelector('header')!)).toContain('Topic Focus');
    expect(text(page)).toContain('3 episodes tagged with “architecture”.');
    const rows = [...page.querySelectorAll('article a.list-row')];
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row.closest('li[data-reveal]')).not.toBeNull();
    expect(page.querySelectorAll(`[${ENTRANCE_ITEM_ATTRIBUTE}]`).length).toBeGreaterThanOrEqual(2);
  });
});

describe('/tags', () => {
  it('maps every tag to its page in a hairline grid, busiest first, with its count', async () => {
    const page = mount(await TagsPage());
    expectIndexTemplate(page, 2);
    expect(text(page.querySelector('h1')!)).toBe('Chimera Tags');
    expect(text(page.querySelector('header')!)).toContain('Topic Map');
    expect(text(page)).toContain('Explore the full signal surface by topic, platform, and technology.');
    const grid = page.querySelector('.hairline-grid')!;
    const links = [...grid.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/tags/architecture', '/tags/chimera', '/tags/ai', '/tags/performance']);
    expect(text(links[0])).toContain('Signal cluster');
    expect(text(links[0])).toContain('3 episodes');
    expect(text(links[2])).toContain('1 episode');
    expect(text(links[2])).not.toContain('1 episodes');
  });
});
