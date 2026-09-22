import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Footer } from '../Footer';

// Surfaces the prefetch prop, which next/link never renders into the DOM.
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean | null; children: ReactNode }) => (
    <a href={href} data-prefetch={prefetch === false ? 'off' : 'default'} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const footerLinks = (container: HTMLElement, href: string) =>
  [...container.querySelectorAll<HTMLAnchorElement>('a')].filter((link) => link.getAttribute('href') === href);

describe('site footer', () => {
  it('uses the copyright sign and h2 section headings', () => {
    const { container } = render(<Footer />);

    expect(container.textContent).toContain('© 2026 Chimeraforge.');
    expect(container.textContent).not.toContain('(c)');
    expect([...container.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'Explore',
      'Resources',
    ]);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('gives each icon link at least a 24px hit area without moving it', () => {
    const { container } = render(<Footer />);
    const iconLinks = [...container.querySelectorAll<HTMLAnchorElement>('a[aria-label]')];

    expect(iconLinks.length).toBeGreaterThan(0);
    for (const link of iconLinks) {
      expect(link.className.split(/\s+/), link.getAttribute('aria-label') ?? '').toEqual(
        expect.arrayContaining(['p-2', '-m-2']),
      );
    }
  });

  it('carries the orbital wordmark and sets its headings in the mono label role, with no gradient tile', () => {
    const { container } = render(<Footer />);

    expect(container.querySelector('[data-wordmark="orbital"]')?.textContent).toBe('Chimeraforge');
    expect(container.innerHTML).not.toMatch(/>CF<|bg-gradient|rounded-2xl/);
    for (const heading of container.querySelectorAll('h2')) {
      expect(heading.className.split(/\s+/)).toContain('text-label-12-mono');
      expect(heading.className).not.toMatch(/tracking-\[/);
    }
  });

  it('does not prefetch the feed and sitemap route handlers', () => {
    const { container } = render(<Footer />);

    for (const href of ['/rss.xml', '/sitemap.xml']) {
      const links = footerLinks(container, href);
      expect(links.length, href).toBeGreaterThan(0);
      for (const link of links) expect(link.dataset.prefetch, href).toBe('off');
    }
  });

  // Phase R5 (final perf re-judge, P1-B): reaching the bottom of a page
  // prefetched all ten of the footer's pages on sight
  it('prefetches its pages on intent, not as a reader reaches the bottom', () => {
    const { container } = render(<Footer />);

    for (const href of ['/platform', '/reports', '/episodes', '/tools/chimeraforge']) {
      const [link] = footerLinks(container, href);
      expect(link.dataset.prefetch, href).toBe('off');
      fireEvent.focus(link);
      expect(link.dataset.prefetch, href).toBe('default');
    }
  });
});
