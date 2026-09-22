import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ENTRANCE_GROUP_CLASS } from '@/components/motion/entrance';
import { PROFILE_ITEMS_AFTER, ProfileLayout } from '../ProfileLayout';

const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const layout = () =>
  render(
    <ProfileLayout
      eyebrow="Work"
      title="Founding ML engineer."
      lede="Architected the platform."
      identity={<a href="https://github.com/Sahil170595">GitHub</a>}
      sections={[
        { id: 'research', label: 'Research' },
        { id: 'experience', label: 'Experience' },
      ]}
    >
      <section id="research">Rows</section>
    </ProfileLayout>,
  ).container.firstElementChild as HTMLElement;

describe('ProfileLayout', () => {
  it('opens on the eyebrow and the title across the page, then the identity in a rail beside the page: links and an index of the sections', () => {
    const el = layout();
    const head = el.querySelector('header')!;
    expect(head.querySelector('h1')?.textContent).toBe('Founding ML engineer.');
    expect(head.textContent).toContain('Work');
    // the title is not squeezed into the rail, so it keeps the one page-title size
    expect(head.closest('.profile-rail')).toBeNull();
    const rail = el.querySelector('.profile-rail')!;
    expect(rail.querySelector('a[href="https://github.com/Sahil170595"]')).not.toBeNull();
    const index = rail.querySelector('nav[aria-label="On this page"]')!;
    expect([...index.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['#research', '#experience']);
    expect(el.querySelector('.profile-rail + div section#research')).not.toBeNull();
  });

  it('sets the lede at the reading size in the prose colour within 60ch, at the top of the page column', () => {
    const lede = layout().querySelector('.profile-rail + div > p')!;
    expect(lede.textContent).toBe('Architected the platform.');
    expect(lede.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-copy-18', 'text-prose', 'max-w-[60ch]']));
  });

  it('sets the title at the page-title role on every screen, the size every interior page uses', () => {
    const h1 = layout().querySelector('h1')!;
    expect(h1.className.split(/\s+/)).toContain('text-heading-48');
    expect(h1.className).not.toMatch(/:text-heading-(?!48)/);
  });

  it('rises in three groups, the title, the links, then the index; the lede, the largest text and so the LCP element, paints at once', () => {
    // the head is group 0 itself, with the eyebrow and title inside it
    const el = layout();
    const group = (selector: string) => el.querySelector<HTMLElement>(selector)!.closest<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)?.style.getPropertyValue('--group');
    expect(group('h1')).toBe('0');
    // a fade from 0 is credited to LCP only when it ends (~1 s measured on /work), even on group 0
    expect(group('.profile-rail + div > p')).toBeUndefined();
    expect(group('a[href="https://github.com/Sahil170595"]')).toBe('1');
    expect(group('nav[aria-label="On this page"]')).toBe('2');
    // the page's first rows follow the links, so phones (no index) keep an even cadence
    expect(PROFILE_ITEMS_AFTER).toBe(2);
  });

  it('draws nothing around itself, and the rail sticks only where the screen is wide and tall enough to hold it', () => {
    const el = layout();
    const classes = [el, ...el.querySelectorAll('*')].flatMap((node) => [...node.classList]);
    expect(classes.filter((c) => BORDER_WIDTH.test(c) || /^signal-/.test(c))).toEqual([]);
    expect(CSS).toMatch(/@media \(min-width: 1024px\) and \(min-height: 45rem\) \{\s*\.profile-rail \{[^}]*position:\s*sticky;/);
  });
});
