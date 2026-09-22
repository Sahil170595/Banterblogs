import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import EpisodePage from '@/app/episodes/[slug]/page';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import type { Episode } from '@/lib/episodes';

// The archived episode article in the R2 reading register (Phase R3): a
// breadcrumb, the report title and dek, the meta row with every figure the
// stat tiles printed, the report contents and reading bar, the body in the
// reading type, the report pager, and no glass anywhere.

vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect: vi.fn(), usePathname: () => '/episodes/episode-002' }));

const BODY =
  '<h2 id="what-changed">What changed</h2><p>Words of the body.</p><h2 id="why-it-matters">Why it matters</h2>' +
  '<pre data-reveal=""><code>npm run verify</code></pre><h2 id="next">Next</h2><p>More words.</p>';
const make = (n: number, overrides: Partial<Episode> = {}): Episode => ({
  id: n,
  displayId: n,
  slug: `episode-00${n}`,
  title: `The Architect ${n}`,
  subtitle: `docs: step ${n}`,
  date: `2025-10-0${n}T00:00:00.000Z`,
  commit: 'abcdef0123',
  preview: `Preview ${n}`,
  content: BODY,
  filesChanged: 12,
  linesAdded: 3400,
  complexity: 65,
  tags: ['architecture'],
  readingTime: 7,
  platform: 'banterpacks',
  ...overrides,
});
const ARCHIVE = [make(1), make(2), make(3)];
vi.mock('@/lib/episodes', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/episodes')>();
  return { ...actual, getAllEpisodes: async () => ARCHIVE };
});

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
let element: ReactElement;
let page: HTMLElement;

beforeAll(async () => {
  element = await EpisodePage({ params: Promise.resolve({ slug: 'episode-002' }) });
});
beforeEach(() => {
  page = render(element).container;
});

describe('episode head', () => {
  it('opens on a breadcrumb into the archive, the title and the subtitle as its dek', () => {
    const crumbs = page.querySelector('nav[aria-label="Breadcrumb"] .report-crumbs')!;
    expect([...crumbs.querySelectorAll('a')].map((a) => [a.getAttribute('href'), text(a)])).toEqual([
      ['/episodes', 'Episode archive'],
      ['/banterpacks', 'Banterpacks episodes'],
    ]);
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].classList.contains('report-title')).toBe(true);
    expect(text(h1s[0])).toBe('The Architect 2');
    expect(text(page.querySelector('.report-dek')!)).toBe('docs: step 2');
  });

  it('keeps every figure: episode number, platform, date, read time, and the change and content counts', () => {
    const meta = text(page.querySelector('ul.report-meta')!);
    for (const part of ['Episode 2', 'Banterpacks', 'October 2, 2025']) expect(meta, part).toContain(part);
    const all = text(page);
    for (const part of ['12 files', '3,400 lines', '7 min read', '65 complexity', 'words', '3 sections', '0 images', '1 code block', '0 links']) {
      expect(all, part).toContain(part);
    }
  });

  it('rises in three entrance groups on a full load, the breadcrumb and title first', () => {
    const groups = [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)];
    expect(groups.map((g) => g.style.getPropertyValue('--group'))).toEqual(['0', '1', '2']);
    expect(groups[0].querySelector('h1')).not.toBeNull();
    expect(groups[0].querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(groups[1].classList.contains('report-dek')).toBe(true);
  });
});

describe('episode body', () => {
  it('sets the article in the reading type and reveals its code blocks and tables', () => {
    const body = page.querySelector('#episode-article .report-prose')!;
    expect(body).not.toBeNull();
    expect(text(body)).toContain('Words of the body.');
    expect(body.querySelector('pre[data-reveal]')).not.toBeNull();
  });

  it('has the report contents and reading bar, and the report pager', () => {
    expect(page.querySelector('nav.report-toc[aria-label="Table of contents"]')).not.toBeNull();
    expect(page.querySelector('details.report-toc-mobile')).not.toBeNull();
    expect(page.querySelector('.report-progress')).not.toBeNull();
    expect(page.querySelector('[data-report-end]')).not.toBeNull();
    const pager = page.querySelector('nav.report-pager')!;
    expect([...pager.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['/episodes/episode-001', '/episodes/episode-003']);
    expect(text(pager)).toContain('Previous Episode');
    expect(text(pager)).toContain('Next Episode');
  });

  it('draws no glass and no retired panels, and recommends episodes as rows', () => {
    expect(page.innerHTML).not.toMatch(/signal-(panel|pill|divider)|glass-ultra|backdrop-blur/);
    const recommended = page.querySelector('#recommended-heading')!;
    expect(text(recommended)).toBe('Recommended Episodes');
    expect(recommended.closest('section')!.querySelectorAll('a.list-row').length).toBeGreaterThan(0);
  });
});
