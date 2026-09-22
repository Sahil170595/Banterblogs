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
  it('puts the identity in a rail beside the page: eyebrow, title, links and an index of the sections', () => {
    const el = layout();
    const rail = el.querySelector('header.profile-rail')!;
    expect(rail.querySelector('h1')?.textContent).toBe('Founding ML engineer.');
    expect(rail.textContent).toContain('Work');
    expect(rail.querySelector('a[href="https://github.com/Sahil170595"]')).not.toBeNull();
    const index = rail.querySelector('nav[aria-label="On this page"]')!;
    expect([...index.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['#research', '#experience']);
    expect(el.querySelector('header.profile-rail + div section#research')).not.toBeNull();
  });

  it('sets the lede at the reading size in the prose colour within 60ch, at the top of the page column', () => {
    const lede = layout().querySelector('header.profile-rail + div > p')!;
    expect(lede.textContent).toBe('Architected the platform.');
    expect(lede.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-copy-18', 'text-prose', 'max-w-[60ch]']));
  });

  it('sets the title at the page-title role, stepping down to 32px in the rail on wide screens', () => {
    const h1 = layout().querySelector('h1')!;
    expect(h1.className.split(/\s+/)).toEqual(expect.arrayContaining(['text-heading-48', 'lg:text-heading-32']));
  });

  it('rises in three groups, the title, the links, then the index; the lede, the largest text and so the LCP element, paints at once', () => {
    const el = layout();
    const group = (selector: string) => el.querySelector<HTMLElement>(selector)!.closest<HTMLElement>(`.${ENTRANCE_GROUP_CLASS}`)?.style.getPropertyValue('--group');
    expect(group('h1')).toBe('0');
    // a fade from 0 is credited to LCP only when it ends (~1 s measured on /work), even on group 0
    expect(group('header.profile-rail + div > p')).toBeUndefined();
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
