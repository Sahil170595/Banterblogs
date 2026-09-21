import Link from 'next/link';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import { PageHeader } from '../PageHeader';

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;

describe('PageHeader', () => {
  const header = () =>
    render(
      <PageHeader eyebrow="Research" title="Papers" lede="Independent research." meta={<span>1 presented</span>} actions={<Link href="/reports">Reports</Link>} />,
    ).container.firstElementChild as HTMLElement;

  it('is unboxed: title, lede, then the meta row and actions, with nothing drawn around them', () => {
    const el = header();
    expect(el.tagName).toBe('HEADER');
    const classes = [...el.querySelectorAll('*'), el].flatMap((node) => [...node.classList]);
    expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^signal-/.test(c) || /^shadow/.test(c))).toEqual([]);
    expect(el.querySelector('h1')?.textContent).toBe('Papers');
  });

  it('sets the title at the page-title role and the lede at 17px in the prose colour within 60ch', () => {
    const el = header();
    expect(el.querySelector('h1')?.className).toContain('text-heading-48');
    const lede = el.querySelector('p:not(.text-label-12-mono)') as HTMLElement;
    expect(lede.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-copy-17', 'text-prose', 'max-w-[60ch]']));
  });

  it('rises in three groups: the eyebrow with the title first, so the LCP heading starts on the first frame', () => {
    const el = header();
    const groups = [...el.querySelectorAll<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)];
    expect(groups.map((g) => g.style.getPropertyValue('--group'))).toEqual(['0', '1', '2']);
    expect(groups[0].querySelector('h1')).not.toBeNull();
    expect(groups[0].textContent).toContain('Research');
    expect(groups[1].textContent).toBe('Independent research.');
    expect(groups[2].textContent).toContain('1 presented');
    expect(groups[2].querySelector('a[href="/reports"]')).not.toBeNull();
  });

  it('can opt out of the entrance, and leaves out what it is not given', () => {
    const markup = renderToStaticMarkup(<PageHeader title="Papers" entrance={false} />);
    expect(markup).not.toContain(ENTRANCE_GROUP_CLASS);
    expect(markup).not.toContain('--group');
    expect(markup).not.toContain('<p');
  });
});
