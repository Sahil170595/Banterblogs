import fs from 'node:fs';
import path from 'node:path';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';
import { Header } from '../Header';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('../SearchDialog', () => ({
  SearchDialog: () => null,
}));

// CSS properties that make an element a backdrop root (Filter Effects 2), so a
// backdrop-filter inside it blurs nothing behind it. Chrome includes an
// element with a view-transition-name.
const BACKDROP_ROOT_TRIGGERS = ['view-transition-name', 'filter', 'opacity', 'mask', 'clip-path', 'backdrop-filter', 'mix-blend-mode', 'will-change'];

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
});

// Phase R3 (A3) replaced the interior's gradient "CF" tile with the landing's
// orbital mark and mono wordmark, so the landing and the interior read as
// one site; this block changed on purpose.
describe('header wordmark', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  const homeLink = (html: string) => /<a [^>]*href="\/"[^>]*>[\s\S]*?<\/a>/.exec(html)?.[0] ?? '';

  it('uses the orbital Chimeraforge wordmark on the landing page', () => {
    const html = renderToStaticMarkup(<Header />);

    expect(html).toContain('data-wordmark="orbital"');
    expect(html).toContain('Chimeraforge');
    expect(html).not.toContain('>CF<');
  });

  it('uses the same wordmark, to the markup, on interior pages: no gradient tile', () => {
    const landing = homeLink(renderToStaticMarkup(<Header />));
    pathname.current = '/reports';
    const interior = homeLink(renderToStaticMarkup(<Header />));

    expect(interior).toContain('data-wordmark="orbital"');
    expect(interior).toBe(landing);
    expect(interior).not.toMatch(/>CF<|bg-gradient|rounded-2xl/);
  });

  it('sets the navigation in the mono label role on every page', () => {
    for (const route of ['/', '/papers']) {
      pathname.current = route;
      const nav = /<nav [^>]*class="([^"]*)"/.exec(renderToStaticMarkup(<Header />))?.[1] ?? '';
      expect(nav.split(/\s+/), route).toContain('text-label-12-mono');
      expect(nav, route).not.toMatch(/text-\[|tracking-\[/);
    }
  });
});

describe('header across route transitions', () => {
  it('names the frame inside the header, so page slides never move the bar and the header stays free to blur', () => {
    for (const route of ['/', '/reports', '/reports/technical-report-138']) {
      pathname.current = route;
      const html = renderToStaticMarkup(<Header />);
      // the header's own tag carries no name; its first child does
      expect(html, route).toMatch(/^<header(?![^>]*view-transition-name)[^>]*><div style="view-transition-name:site-header"/);
      expect(html.match(/view-transition-name:site-header/g), route).toHaveLength(1);
    }
  });

  it('holds its group still and drops the old snapshot, whose backdrop blur would flash', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    expect(css).toMatch(/::view-transition-group\(site-header\)\s*\{[^}]*animation:\s*none/);
    expect(css).toMatch(/::view-transition-old\(site-header\)\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/::view-transition-new\(site-header\)\s*\{[^}]*animation:\s*none/);
  });

  it('paints its group solid while pages move under it, since a snapshot carries no backdrop', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');

    // Without it the sliding page reads through the translucent bar for the whole
    // transition. A backdrop blur does not help: Chromium computes it on the group
    // but does not render it inside the transition tree.
    expect(css).toMatch(/::view-transition-group\(site-header\)\s*\{[^}]*background-color:\s*hsl\(var\(--background\)\)/);
    expect(css).not.toMatch(/::view-transition-(group|new)\(site-header\)\s*\{[^}]*backdrop-filter/);
  });
});

describe('header surface on scroll', () => {
  const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  beforeEach(() => {
    pathname.current = '/reports';
  });

  it('gives interior pages the surface layer and keeps the landing header floating', () => {
    expect(renderToStaticMarkup(<Header />)).toMatch(/^<header[^>]*class="site-header /);
    pathname.current = '/';
    expect(renderToStaticMarkup(<Header />)).toMatch(/^<header[^>]*class="fixed top-0 z-50 w-full bg-transparent"/);
  });

  it('keeps its height fixed and needs no JavaScript scroll state', () => {
    const header = render(<Header />).container.querySelector('header')!;
    const frame = header.firstElementChild!;

    // the named frame carries the transparent rule, so the group covers the whole bar
    expect(frame.className.split(/\s+/)).toEqual(expect.arrayContaining(['border-b', 'border-transparent']));
    expect(frame.firstElementChild!.className.split(/\s+/)).toContain('h-[72px]');
    expect(header.hasAttribute('data-scrolled')).toBe(false);
  });

  it('blurs the page through the glass layer: nothing makes the header a backdrop root', () => {
    const header = render(<Header />).container.querySelector('header')!;

    for (const trigger of BACKDROP_ROOT_TRIGGERS) {
      expect(header.getAttribute('style') ?? '', trigger).not.toContain(trigger);
      // rules on the header element itself, not its ::before and ::after layers
      expect(CSS, trigger).not.toMatch(new RegExp(`\\.site-header\\s*(?:,[^{]*)?\\{[^}]*(?:^|[;{\\s])${trigger}\\s*:`));
    }
  });

  it('fades a glass layer in over the first 64px on a scroll timeline, opacity only, for visitors who allow motion', () => {
    expect(CSS).toMatch(/--header-surface-range:\s*64px;/);
    expect(CSS).toMatch(/\.site-header::before \{[^}]*backdrop-filter:\s*blur\(var\(--blur-glass\)\)/);
    const gated = /@supports \(animation-timeline: scroll\(\)\) \{\s*@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(gated).toMatch(/\.site-header::before,\s*\.site-header::after \{/);
    expect(gated).toMatch(/animation-timeline:\s*scroll\(root block\);/);
    expect(gated).toMatch(/animation-range:\s*0 var\(--header-surface-range\);/);
    const frames = /@keyframes header-surface \{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(frames).toMatch(/opacity:\s*0/);
    // the layer's opacity animates, never its blur
    expect(frames).not.toMatch(/blur|filter|transform/);
  });
});

describe('header navigation state', () => {
  beforeEach(() => {
    pathname.current = '/reports';
  });

  it('announces the section a nested page belongs to, matching its active styling', () => {
    pathname.current = '/reports/technical-report-138';
    const { getAllByRole } = render(<Header />);
    const current = getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
      .map((link) => link.getAttribute('href'));

    expect(current).toEqual(['/reports']);
  });

  it('returns focus to the menu toggle when Escape closes the mobile menu', () => {
    const { getByRole, container } = render(<Header />);
    const toggle = getByRole('button', { name: 'Toggle navigation' });
    fireEvent.click(toggle);
    const firstMenuLink = container.querySelector<HTMLAnchorElement>('#mobile-nav a');
    expect(firstMenuLink).not.toBeNull();
    firstMenuLink?.focus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(container.querySelector('#mobile-nav')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('caps the mobile menu to the space under the bar and lets it scroll', () => {
    const { getByRole, container } = render(<Header />);
    fireEvent.click(getByRole('button', { name: 'Toggle navigation' }));
    const menuClasses = container.querySelector('#mobile-nav')?.className.split(/\s+/) ?? [];

    expect(menuClasses).toEqual(
      expect.arrayContaining(['max-h-[calc(100svh-72px)]', 'overflow-y-auto', 'overscroll-contain']),
    );
  });
});

// B16: the mobile menu's items rise in one after another, and the menu leaves
// in a single short fade. Timing lives in globals.css; the component numbers
// the items and holds the panel for its fade.
describe('mobile menu motion', () => {
  const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleBody = (selector: string) => {
    const at = CSS.indexOf(`${selector} {`);
    return at < 0 ? '' : CSS.slice(at, CSS.indexOf('}', at));
  };
  const toggle = (getByRole: ReturnType<typeof render>['getByRole']) => getByRole('button', { name: 'Toggle navigation' });

  beforeEach(() => {
    pathname.current = '/papers';
  });

  it('numbers every item in reading order and marks the page the visitor is on', () => {
    const { getByRole, container } = render(<Header />);
    fireEvent.click(toggle(getByRole));
    const panel = container.querySelector<HTMLElement>('#mobile-nav')!;
    const items = [...panel.querySelectorAll<HTMLElement>('.menu-item')];

    expect(panel.dataset.state).toBe('open');
    expect(items.length).toBeGreaterThanOrEqual(10);
    expect(items.map((item) => item.style.getPropertyValue('--i'))).toEqual(items.map((_, i) => String(i)));
    expect(panel.querySelector('a[aria-current="page"]')?.getAttribute('href')).toBe('/papers');
  });

  it('rises the items 33-40ms apart over the base token on strong-out, only while motion is armed', () => {
    const stagger = Number(/--stagger-menu:\s*(\d+)ms;/.exec(CSS)?.[1]);
    expect(stagger).toBeGreaterThanOrEqual(33);
    expect(stagger).toBeLessThanOrEqual(40);
    const items = ruleBody('html[data-motion="on"] #mobile-nav[data-state="open"] .menu-item');
    expect(items).toMatch(/animation:\s*menu-item-in var\(--duration-base\) var\(--ease-strong-out\) both;/);
    expect(items).toMatch(/animation-delay:\s*calc\(var\(--i, 0\) \* var\(--stagger-menu\)\)/);
    const rise = /@keyframes menu-item-in \{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(rise).toMatch(/opacity:\s*0/);
    expect(rise).toMatch(/transform:\s*translateY\(var\(--motion-menu\)\)/);
  });

  it('leaves in one fade over the fast token, opacity only', () => {
    const closing = ruleBody('html[data-motion="on"] #mobile-nav[data-state="closing"]');
    expect(closing).toMatch(/animation:\s*menu-out var\(--duration-fast\) var\(--ease-strong-out\) both;/);
    const out = /@keyframes menu-out \{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(out).toMatch(/opacity:\s*0/);
    expect(out).not.toMatch(/transform|filter/);
  });

  it('holds the panel, inert, through its fade when motion is armed, then unmounts it', () => {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'on');
    const { getByRole, container } = render(<Header />);
    fireEvent.click(toggle(getByRole));
    fireEvent.click(toggle(getByRole));
    const panel = container.querySelector<HTMLElement>('#mobile-nav')!;

    expect(panel.dataset.state).toBe('closing');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(toggle(getByRole).getAttribute('aria-expanded')).toBe('false');
    // an item's own animation ending is not the panel's fade
    fireEvent.animationEnd(panel.querySelector('.menu-item')!);
    expect(container.querySelector('#mobile-nav')).not.toBeNull();
    fireEvent.animationEnd(panel);
    expect(container.querySelector('#mobile-nav')).toBeNull();
  });

  it('closes at once when a menu link is followed, so no fading menu rides the route change', () => {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'on');
    const { getByRole, container } = render(<Header />);
    fireEvent.click(toggle(getByRole));
    fireEvent.click(container.querySelector<HTMLAnchorElement>('#mobile-nav a[href="/work"]')!);

    expect(container.querySelector('#mobile-nav')).toBeNull();
  });

  it('never moves under reduced motion: the items only appear', () => {
    const reduced = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g;
    const blocks = [...CSS.matchAll(reduced)].map((m) => m[1]).join('\n');
    expect(blocks).toMatch(/\.menu-item\s*\{[^}]*animation:\s*none\s*!important/);
    expect(/@media \(prefers-reduced-motion: reduce\) \{\s*:root \{([^}]*)\}/.exec(CSS)?.[1]).toMatch(/--motion-menu:\s*0px;/);
  });
});
