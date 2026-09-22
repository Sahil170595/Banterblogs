import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import WorkPage from '@/app/work/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';
import { PROFILE_ITEMS_AFTER } from '@/components/ui/ProfileLayout';
import { EDUCATION, EXPERIENCE, HERO_HEADLINE, HERO_SUMMARY, NEXT_LINKS, PROFILE_LINKS, RESEARCH, SKILLS } from '@/lib/work';

// /work on the profile template (Phase R3-B): the identity and links in a
// rail, the research and the roles as hairline rows beside it, every
// sentence, figure and link of the résumé copy intact.

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const MAX_BORDERED = 12;
const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

let page: HTMLElement;
let markup: string;
beforeAll(() => {
  markup = renderToStaticMarkup(<WorkPage />);
});
beforeEach(() => {
  page = render(<WorkPage />).container;
});

describe('work page copy', () => {
  it('keeps the headline as the one h1, and the summary as the lede', () => {
    const h1s = page.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0])).toBe(HERO_HEADLINE);
    expect(text(page)).toContain(HERO_SUMMARY);
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

  it('keeps the profile links and the links onward', () => {
    for (const link of [...PROFILE_LINKS, ...NEXT_LINKS]) {
      const found = [...page.querySelectorAll(`a[href="${link.href}"]`)].map(text);
      expect(found, link.href).toContain(link.label);
    }
  });
});

describe('work page layout', () => {
  it('puts the headline and the profile links in the rail, with an index of the four sections', () => {
    const rail = page.querySelector('header.profile-rail')!;
    expect(rail.querySelector('h1')).not.toBeNull();
    for (const link of PROFILE_LINKS) expect(rail.querySelector(`a[href="${link.href}"]`), link.href).not.toBeNull();
    const index = [...rail.querySelectorAll('nav[aria-label="On this page"] a')].map((a) => a.getAttribute('href') ?? '');
    expect(index).toEqual(['#research', '#experience', '#education', '#skills']);
    for (const id of index) expect(page.querySelector(`section${id}`), id).not.toBeNull();
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

  it('reveals every row as it scrolls in', () => {
    const rows = RESEARCH.length + EXPERIENCE.length;
    expect(page.querySelectorAll('li.list-row[data-reveal]').length).toBeGreaterThanOrEqual(rows);
  });

  it('draws no boxed panels: no signal classes, and at most a handful of hairline buttons', () => {
    expect(markup).not.toMatch(/signal-(panel|pill|divider)/);
    const bordered = [...page.querySelectorAll('*')].filter((el) => [...el.classList].some((c) => BORDER_WIDTH.test(c)));
    expect(bordered.every((el) => el.classList.contains('pressable'))).toBe(true);
    expect(bordered.length).toBeLessThanOrEqual(MAX_BORDERED);
  });
});
