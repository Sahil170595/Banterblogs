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
    expect(text(groups[1])).toMatch(/^Most AI demos are a chat box and a chart\./);
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
