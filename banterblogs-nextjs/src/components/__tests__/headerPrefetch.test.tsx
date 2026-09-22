import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from '../Header';

// Phase R5 (final perf re-judge, P1-A): a PSI run whose first paint stalls
// until ~2.3 s is charged for everything requested before it. The header's
// wordmark prefetched the landing on every page, before the paint. The
// sections (desktop only; hidden on phones) stay warm, but only once the page
// has painted; the phone menu's rows prefetch when it opens, which is intent.

vi.mock('next/navigation', () => ({
  usePathname: () => '/reports/technical-report-138',
}));

vi.mock('../SearchDialog', () => ({
  SearchDialog: () => null,
}));

// prefetch never reaches the DOM; surface it on the anchor
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ prefetch, transitionTypes, onNavigate, children, ...props }: { prefetch?: boolean | null; transitionTypes?: string[]; onNavigate?: () => void; children?: ReactNode }) => {
      void transitionTypes;
      void onNavigate;
      return createElement('a', { ...props, 'data-prefetch': prefetch === false ? 'off' : 'auto' }, children);
    },
  };
});

const fcp = { name: 'first-contentful-paint', entryType: 'paint', startTime: 120 } as PerformanceEntry;

describe('header prefetch', () => {
  let runIdle: () => void;

  beforeEach(() => {
    const idle: Array<() => void> = [];
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => idle.push(callback));
    vi.stubGlobal('cancelIdleCallback', () => undefined);
    vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => (type === 'paint' ? [fcp] : []));
    runIdle = () => act(() => idle.splice(0).forEach((callback) => callback()));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const primary = (container: HTMLElement) => [...container.querySelectorAll<HTMLAnchorElement>('header nav[aria-label="Primary"]:not(#mobile-nav) a[href^="/"]')];

  it('prefetches the landing from the wordmark on intent only', () => {
    const { container } = render(<Header />);
    const wordmark = container.querySelector<HTMLAnchorElement>('a[href="/"]')!;
    runIdle();

    expect(wordmark.dataset.prefetch).toBe('off');
  });

  it('keeps the sections warm once the page has painted and gone idle, not before', () => {
    const { container } = render(<Header />);
    const links = primary(container);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/platform', '/reports', '/papers', '/tools', '/show', '/work', '/about']);
    expect(links.map((link) => link.dataset.prefetch)).toEqual(links.map(() => 'off'));

    runIdle();
    expect(links.map((link) => link.dataset.prefetch)).toEqual(links.map(() => 'auto'));
  });

  it('prefetches the phone menu rows as it opens', () => {
    const { container, getByRole } = render(<Header />);
    fireEvent.click(getByRole('button', { name: 'Toggle navigation' }));
    const rows = [...container.querySelectorAll<HTMLAnchorElement>('#mobile-nav a[href^="/"]')];

    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.dataset.prefetch)).toEqual(rows.map(() => 'auto'));
  });
});
