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
