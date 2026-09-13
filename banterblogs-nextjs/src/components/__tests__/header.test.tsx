import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/' } }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('../SearchDialog', () => ({
  SearchDialog: () => null,
}));

describe('header landing wordmark', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('uses the orbital Chimeraforge wordmark on the landing page', () => {
    const html = renderToStaticMarkup(<Header />);

    expect(html).toContain('data-landing-wordmark="orbital"');
    expect(html).toContain('Chimeraforge');
    expect(html).not.toContain('>CF<');
  });

  it('keeps the established wordmark on interior pages', () => {
    pathname.current = '/reports';
    const html = renderToStaticMarkup(<Header />);

    expect(html).not.toContain('data-landing-wordmark="orbital"');
    expect(html).toContain('>CF<');
  });
});

describe('header across route transitions', () => {
  it('carries its own view-transition name, so page slides never move it', () => {
    for (const route of ['/', '/reports', '/reports/technical-report-138']) {
      pathname.current = route;
      expect(renderToStaticMarkup(<Header />), route).toMatch(/^<header[^>]*style="view-transition-name:site-header"/);
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

describe('header scroll state', () => {
  const scrollTo = (y: number) =>
    act(() => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
      fireEvent.scroll(window);
    });
  const classes = (el: Element) => el.className.split(/\s+/);

  beforeEach(() => {
    pathname.current = '/reports';
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });

  it('blends with the page at the top of an interior page', () => {
    const header = render(<Header />).container.querySelector('header')!;

    expect(header.dataset.scrolled).toBe('false');
    expect(classes(header)).toEqual(expect.arrayContaining(['bg-transparent', 'border-transparent']));
  });

  it('turns solid with a hairline once scrolled past 8px, and blends again at the top', () => {
    const header = render(<Header />).container.querySelector('header')!;

    scrollTo(8);
    expect(header.dataset.scrolled).toBe('false');
    scrollTo(9);
    expect(header.dataset.scrolled).toBe('true');
    expect(classes(header)).toEqual(expect.arrayContaining(['bg-background/80', 'border-border/60']));
    expect(classes(header)).not.toContain('bg-transparent');
    scrollTo(0);
    expect(header.dataset.scrolled).toBe('false');
  });

  it('keeps its height in both states: the border is always drawn, only its colour changes', () => {
    const { container } = render(<Header />);
    const header = container.querySelector('header')!;
    const bar = header.firstElementChild!;

    for (const y of [0, 1500]) {
      scrollTo(y);
      expect(classes(header), `scrollY ${y}`).toContain('border-b');
      expect(classes(bar), `scrollY ${y}`).toContain('h-[72px]');
    }
  });

  it('changes over the hover token and animates colour only', () => {
    const header = render(<Header />).container.querySelector('header')!;

    expect(classes(header)).toEqual(
      expect.arrayContaining(['transition-[background-color,border-color]', 'duration-hover', 'ease-out-quad']),
    );
  });

  it('renders blended on the server, before any scroll is known', () => {
    expect(renderToStaticMarkup(<Header />)).toMatch(/^<header[^>]*data-scrolled="false"/);
  });

  it('leaves the landing header floating and transparent however far the page scrolls', () => {
    pathname.current = '/';
    const header = render(<Header />).container.querySelector('header')!;
    scrollTo(1500);

    expect(header.hasAttribute('data-scrolled')).toBe(false);
    expect(classes(header)).toEqual(expect.arrayContaining(['fixed', 'bg-transparent']));
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
