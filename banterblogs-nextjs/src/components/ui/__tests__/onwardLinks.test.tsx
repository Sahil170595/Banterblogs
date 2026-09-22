import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OnwardLinks } from '../OnwardLinks';

// The quiet close of a page (R4): where to go next as plain links with their
// one-line reasons over one hairline, in place of a row of link cards. No
// surface, no border and no ember until the pointer is on a link.

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const LINKS = [
  { href: '/reports', title: 'Research Archive', blurb: 'The evidence layer.' },
  { href: '/work', title: 'Work', blurb: 'Experience and education.' },
  { href: 'https://example.com', title: 'Elsewhere', blurb: 'Off site.' },
];

describe('OnwardLinks', () => {
  it('is one labelled nav of plain links, each with its reason', () => {
    const nav = render(<OnwardLinks links={LINKS} />).container.firstElementChild as HTMLElement;
    expect(nav.tagName).toBe('NAV');
    expect(nav.getAttribute('aria-label')).toBe('Onward');
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(LINKS.map((l) => l.href));
    expect(links.map((a) => a.textContent?.trim())).toEqual(LINKS.map((l) => l.title));
    for (const link of LINKS) expect(nav.textContent).toContain(link.blurb);
    // an external link opens in a new tab
    expect(links[2].getAttribute('target')).toBe('_blank');
  });

  it('draws no card, border or ember: a hairline row whose links answer the pointer like a row title', () => {
    const nav = render(<OnwardLinks links={LINKS} />).container.firstElementChild as HTMLElement;
    const classes = [nav, ...nav.querySelectorAll('*')].flatMap((el) => [...el.classList]);
    expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^card-|^signal-|^bg-|text-primary/.test(c))).toEqual([]);
    expect(nav.querySelectorAll('a.row-link .row-arrow')).toHaveLength(LINKS.length);
    expect(nav.querySelectorAll('.list-row')).toHaveLength(LINKS.length);
  });
});
