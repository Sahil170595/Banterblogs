import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    expect(header.className.split(/\s+/)).toEqual(expect.arrayContaining(['border-b', 'border-transparent']));
    expect(header.firstElementChild!.className.split(/\s+/)).toContain('h-[72px]');
    expect(header.hasAttribute('data-scrolled')).toBe(false);
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
