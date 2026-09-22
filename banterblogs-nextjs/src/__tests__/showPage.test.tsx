import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShowPage from '@/app/show/page';
import { ENTRANCE_GROUP_CLASS, ENTRANCE_ITEM_ATTRIBUTE } from '@/components/motion/entrance';

// /show is already at the bar (R3): its head only adopts the first-load
// entrance the PageHeader runs, and its first scene rows join the sequence.
// The display type, the copy and the rows are unchanged.

const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
const SCENES = 5;

describe('/show head', () => {
  it('rises in groups on a full load: eyebrow and title first, then the lede', () => {
    const page = render(<ShowPage />).container;
    const groups = [...page.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)];
    expect(groups.map((g) => g.style.getPropertyValue('--group'))).toEqual(['0', '1']);
    expect(groups[0].querySelector('h1')).not.toBeNull();
    expect(text(groups[0])).toContain('Chimera · Show');
    expect(text(groups[1]).startsWith('Most AI demos are a chat box and a chart.')).toBe(true);
  });

  it('lets the first scene rows take the third step, one group after the lede', () => {
    const page = render(<ShowPage />).container;
    const items = [...page.querySelectorAll<HTMLElement>(`[${ENTRANCE_ITEM_ATTRIBUTE}]`)];
    expect(items.length).toBeGreaterThanOrEqual(2);
    for (const item of items) expect(item.style.getPropertyValue('--entrance-items-after')).toBe('2');
    expect(page.querySelectorAll('ol > li')).toHaveLength(SCENES);
    // the two phrases sit either side of a line break
    expect(text(page.querySelector('h1')!)).toBe('The internals,on display.');
    expect(page.querySelector('h1 br')).not.toBeNull();
  });
});

describe('/show type', () => {
  // the one display exception keeps its size but takes the title weight, and
  // the scene titles and labels come onto the roles every other page uses
  it('sets the title in the display role, the scene titles in the heading roles and the labels in the 12px mono role', () => {
    const page = render(<ShowPage />).container;
    expect(page.querySelector('h1')!.className.split(/\s+/)).toContain('text-display-72');
    const titles = [...page.querySelectorAll('ol h2')];
    expect(titles).toHaveLength(SCENES);
    for (const title of titles) {
      expect(title.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-heading-24', 'md:text-heading-32']));
      expect(title.className).not.toMatch(/font-bold|text-\dxl/);
    }
    // no arbitrary sub-12px labels
    expect(page.innerHTML).not.toMatch(/text-\[\d+px\]/);
    expect(page.querySelectorAll('.text-label-12-mono').length).toBeGreaterThanOrEqual(SCENES + 1);
  });
});
