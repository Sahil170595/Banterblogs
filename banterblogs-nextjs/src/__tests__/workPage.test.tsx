import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AboutPage from '@/app/about/page';
import WorkPage from '@/app/work/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import { PROFILE_ITEMS_AFTER } from '@/components/ui/ProfileLayout';
import { parseSpan } from '@/lib/timeline';
import {
  EDUCATION,
  EXPERIENCE,
  HERO_HEADLINE,
  HERO_SUMMARY,
  NEXT_LINKS,
  PROFILE_CTA,
  PROFILE_LINKS,
  RESEARCH,
  SKILLS,
  WORK_TITLE,
} from '@/lib/work';

// /work on the profile template (Phase R3-B): the identity and links in a
// rail, the research and the roles as hairline rows beside it, every
// sentence, figure and link of the résumé copy intact. R5: a title that
// reads as a title, with the owner's headline as its standfirst, and the
// roles drawn on one time axis under the lede.

// prefetch never reaches the DOM; surface it on the anchor
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ prefetch, children, onNavigate: _onNavigate, transitionTypes: _types, ...props }: { prefetch?: boolean | null; onNavigate?: unknown; transitionTypes?: unknown; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-prefetch': prefetch === false ? 'off' : 'auto' }, children),
  };
});

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
// the three hairline pills of the closing row; the rail's profile links are quiet text links
const MAX_BORDERED = 3;
// a title, not a sentence: one line at 48px across the page
const TITLE_MAX_CHARS = 32;
// bullets an entry shows before its disclosure: a research entry leads with
// its meta line and evidence, a role with the first two of its story
const RESEARCH_VISIBLE = 1;
const ROLE_VISIBLE = 2;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const startOf = (dates: string) => {
  const { start } = parseSpan(dates);
  return start.year * 12 + start.month;
};

let page: HTMLElement;
let markup: string;
beforeAll(() => {
  markup = renderToStaticMarkup(<WorkPage />);
});
beforeEach(() => {
  page = render(<WorkPage />).container;
});

describe('work page copy', () => {
  it('titles the page with the name the site already uses, short enough to read as a title', () => {
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(WORK_TITLE);
    expect(WORK_TITLE.length).toBeLessThanOrEqual(TITLE_MAX_CHARS);
    // not a new claim: /about names the builder the same way
    expect(text(render(<AboutPage />).container)).toContain(`Built by ${WORK_TITLE}`);
  });

  it('keeps the owner’s headline verbatim as the standfirst under the title, and the summary as the lede', () => {
    const standfirst = page.querySelector('header h1 + p')!;
    expect(text(standfirst)).toBe(HERO_HEADLINE);
    expect(text(page.querySelector('.profile-rail + div > p')!)).toBe(HERO_SUMMARY);
  });

  it('keeps every research entry: its label, annotation, every bullet and every evidence link', () => {
    const all = text(page);
    for (const item of RESEARCH) {
      expect(all, item.label).toContain(item.label);
      if (item.meta) expect(all, item.meta).toContain(item.meta);
      for (const bullet of item.bullets) expect(all, bullet.slice(0, 60)).toContain(bullet);
      expect(page.querySelector(`a[href="${item.href}"]`), item.href).not.toBeNull();
      for (const evidence of item.evidence ?? []) {
        const link = page.querySelector(`a[href="${evidence.href}"]`);
        expect(link, evidence.href).not.toBeNull();
        expect(text(link!)).toBe(evidence.label);
      }
    }
  });

  it('keeps every role, school and skill line', () => {
    const all = text(page);
    for (const job of EXPERIENCE) {
      for (const field of [job.role, job.company, job.location, job.dates, ...job.bullets]) expect(all, field.slice(0, 60)).toContain(field);
    }
    for (const school of EDUCATION) {
      for (const field of Object.values(school)) expect(all, field).toContain(field);
    }
    for (const skill of SKILLS) {
      expect(all).toContain(skill.label);
      expect(all).toContain(skill.items);
    }
  });

  it('keeps the profile links, the call to action and the links onward', () => {
    for (const link of [...PROFILE_LINKS, PROFILE_CTA, ...NEXT_LINKS]) {
      const found = [...page.querySelectorAll(`a[href="${link.href}"]`)].map(text);
      expect(found, link.href).toContain(link.label);
    }
  });
});

describe('work page layout', () => {
  it('puts the title across the page, then the call to action first in the rail, the profile links after it, and an index of the four sections', () => {
    expect(page.querySelector('header h1')).not.toBeNull();
    const rail = page.querySelector('.profile-rail')!;
    const links = [...rail.querySelectorAll('a[href]')].filter((a) => !a.getAttribute('href')!.startsWith('#'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([PROFILE_CTA.href, ...PROFILE_LINKS.map((l) => l.href)]);
    // one ember pill; the profile links are quiet text links, with no hairline box
    expect(links[0].className.split(/\s+/)).toContain('bg-primary');
    for (const link of links.slice(1)) {
      expect(link.className.split(/\s+/).filter((c) => BORDER_WIDTH.test(c)), link.getAttribute('href')!).toEqual([]);
      expect(link.getAttribute('target')).toBe('_blank');
    }
    const index = [...rail.querySelectorAll('nav[aria-label="On this page"] a')].map((a) => a.getAttribute('href') ?? '');
    expect(index).toEqual(['#research', '#experience', '#education', '#skills']);
    for (const id of index) expect(page.querySelector(`section${id}`), id).not.toBeNull();
  });

  // R5 design re-judge: /work had no visual. The roles, drawn from their
  // own dates on one axis, under the lede: the page's visual anchor.
  it('draws the roles on one time axis under the lede, oldest first, the ones still running marked', () => {
    // revealed on scroll where it starts below the fold (a phone)
    const figure = page.querySelector('.profile-rail + div > p + [data-reveal] > figure.timeline')!;
    expect(figure, 'a timeline figure right under the lede').not.toBeNull();
    const chronological = [...EXPERIENCE].sort((a, b) => startOf(a.dates) - startOf(b.dates));
    const lanes = [...figure.querySelectorAll('ol > li')];
    expect(lanes.map((li) => text(li.querySelector('.timeline-label')!))).toEqual(chronological.map((job) => job.company));
    expect(lanes.map((li) => text(li.querySelector('.timeline-dates')!))).toEqual(chronological.map((job) => job.dates));
    const running = chronological.map((job) => String(job.dates.endsWith('Present')));
    expect(lanes.map((li) => li.getAttribute('data-ongoing'))).toEqual(running);
  });

  it('sets research and roles as hairline rows, current roles marked live', () => {
    expect(page.querySelectorAll('#research li.list-row')).toHaveLength(RESEARCH.length);
    expect(page.querySelectorAll('#experience li.list-row')).toHaveLength(EXPERIENCE.length);
    const current = EXPERIENCE.filter((job) => job.dates.endsWith('Present')).length;
    expect(page.querySelectorAll('#experience .live-dot')).toHaveLength(current);
  });

  it('opens on the entrance, the first research rows joining it after the rail', () => {
    const groups = new Set([...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)].map((g) => g.style.getPropertyValue('--group')));
    expect([...groups].sort()).toEqual(['0', '1', '2']);
    const items = [...page.querySelectorAll<HTMLElement>(`[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      expect(item.closest('#research'), 'entrance items are the first research rows').not.toBeNull();
      expect(item.style.getPropertyValue('--entrance-items-after')).toBe(String(PROFILE_ITEMS_AFTER));
    }
  });

  // R4 design re-judge: /work was 9,226px of bullets. Each entry shows its
  // lead bullets and folds the rest into one closed disclosure; every word
  // stays on the page (and in find-in-page), one click away.
  it('shows the lead bullets of each entry and folds the rest, word for word, into one closed disclosure', () => {
    const rowsFor = (section: string) => [...page.querySelectorAll(`#${section} li.list-row`)];
    const entries = [
      ...rowsFor('research').map((row, i) => [row, RESEARCH[i].bullets, RESEARCH_VISIBLE] as const),
      ...rowsFor('experience').map((row, i) => [row, EXPERIENCE[i].bullets, ROLE_VISIBLE] as const),
    ];
    expect(entries).toHaveLength(RESEARCH.length + EXPERIENCE.length);
    for (const [row, bullets, visible] of entries) {
      const shown = [...row.querySelectorAll(':scope ul:not(details ul) > li')].map(text);
      expect(shown).toEqual(bullets.slice(0, visible));
      const folds = row.querySelectorAll('details');
      if (bullets.length <= visible) {
        expect(folds).toHaveLength(0);
        continue;
      }
      expect(folds).toHaveLength(1);
      const fold = folds[0] as HTMLDetailsElement;
      expect(fold.open).toBe(false);
      expect(text(fold.querySelector('summary')!)).toContain(`Show ${bullets.length - visible} more`);
      expect([...fold.querySelectorAll('ul > li')].map(text)).toEqual(bullets.slice(visible));
    }
  });

  // a11y re-judge P2-N1: five of eight summaries read "Show 1 more" with no
  // context. Each names its entry for assistive tech; the line stays quiet.
  it('names every disclosure after its entry, for assistive tech only', () => {
    const named = [
      ...[...page.querySelectorAll('#research li.list-row')].map((row, i) => [row, RESEARCH[i].label] as const),
      ...[...page.querySelectorAll('#experience li.list-row')].map((row, i) => [row, `${EXPERIENCE[i].role}, ${EXPERIENCE[i].company}`] as const),
    ];
    const summaries = named.filter(([row]) => row.querySelector('summary'));
    expect(summaries.length).toBeGreaterThanOrEqual(1);
    const names = summaries.map(([row, entry]) => {
      const context = row.querySelector('summary .sr-only')!;
      expect(context, entry).not.toBeNull();
      expect(text(context), entry).toBe(`about ${entry}`);
      return text(row.querySelector('summary')!);
    });
    expect(new Set(names).size).toBe(names.length);
  });

  // perf re-judge: plain links in view at load prefetched their pages
  it('prefetches every in-site link on intent, not on sight', () => {
    const internal = [...page.querySelectorAll('a[href^="/"]')];
    expect(internal.length).toBeGreaterThanOrEqual(1 + NEXT_LINKS.length + 1);
    for (const link of internal) expect(link.getAttribute('data-prefetch'), link.getAttribute('href')!).toBe('off');
  });

  // re-judge P1-7: "AWQ/GPTQ/SmoothQuant/FP8/RTN/GGUF;" has no break
  // opportunity and ran the page to 353px at 320; folded bullets included
  it('lets a long unbroken token in a bullet break anywhere, so it never widens the page', () => {
    const bullets = [...page.querySelectorAll('li.list-row ul > li')];
    expect(bullets.length).toBe([...RESEARCH, ...EXPERIENCE].reduce((n, entry) => n + entry.bullets.length, 0));
    for (const bullet of bullets) expect(bullet.className.split(/\s+/)).toContain('[overflow-wrap:anywhere]');
  });

  it('reveals every row as it scrolls in', () => {
    const rows = RESEARCH.length + EXPERIENCE.length;
    expect(page.querySelectorAll('li.list-row[data-reveal]').length).toBeGreaterThanOrEqual(rows);
  });

  it('draws no boxed panels: no signal classes, and only the closing row’s hairline pills', () => {
    expect(markup).not.toMatch(/signal-(panel|pill|divider)/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered.every((el) => el.classList.contains('pressable'))).toBe(true);
    expect(bordered.length).toBeLessThanOrEqual(MAX_BORDERED);
  });
});
