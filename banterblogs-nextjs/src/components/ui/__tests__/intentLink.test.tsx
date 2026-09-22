import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAV_RECEDE_ATTRIBUTE } from '@/components/motion/navRecede';
import { IntentLink, NAV_RECEDE_RESET_MS } from '../IntentLink';

// List and card links prefetch on intent, not on sight (Phase R4, perf P1-1
// and P1-3): a dense list prefetched every row that scrolled into view, and
// decoding those payloads cost frames mid-scroll. The link turns Next's own
// prefetch on the first time the pointer rests on it, it takes focus or it
// is pressed; the press is the floor for a click with no hover (touch).

// prefetch never reaches the DOM; surface it, and the handlers, on the anchor.
// A plain click stands for a client navigation, which is when Next calls onNavigate.
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({
      prefetch,
      transitionTypes,
      onNavigate,
      children,
      ...props
    }: {
      prefetch?: boolean | null;
      transitionTypes?: string[];
      onNavigate?: (event: { preventDefault: () => void }) => void;
      children?: ReactNode;
    }) =>
      createElement(
        'a',
        {
          ...props,
          'data-prefetch': prefetch === false ? 'off' : 'auto',
          'data-transition-types': transitionTypes?.join(' '),
          // a client navigation: Next keeps the browser from following the href
          onClick: (event: { preventDefault: () => void }) => {
            event.preventDefault();
            onNavigate?.({ preventDefault: () => undefined });
          },
        },
        children,
      ),
  };
});

afterEach(cleanup);

const link = (onFocus?: () => void) =>
  render(
    <IntentLink href="/reports/technical-report-138" transitionTypes={['nav-forward']} className="card" onFocus={onFocus}>
      TR138
    </IntentLink>,
  ).getByRole('link');

describe('intent link', () => {
  it('does not prefetch on sight', () => {
    expect(link().dataset.prefetch).toBe('off');
  });

  it.each([
    ['the pointer rests on it', (el: HTMLElement) => fireEvent.pointerEnter(el)],
    ['it takes focus', (el: HTMLElement) => fireEvent.focus(el)],
    ['it is pressed', (el: HTMLElement) => fireEvent.pointerDown(el)],
  ])('prefetches once %s', (_, intend) => {
    const el = link();
    intend(el);

    expect(el.dataset.prefetch).toBe('auto');
  });

  // Phase R4: removing the focused link made Chrome restyle the whole leaving
  // page inside the view transition's update (23-34ms on /reports, trace).
  // Focus goes to the document either way once the link's page is gone.
  it('lets go of focus as its navigation starts', () => {
    const el = link();
    el.focus();
    expect(document.activeElement).toBe(el);

    fireEvent.click(el);
    expect(document.activeElement).not.toBe(el);
  });

  // Phase R4 (re-judge 3, P0-1): the next page cannot be drawn until it is
  // rendered, so the page being left answers the click at once (navRecede.ts).
  // A navigation that has not replaced the page by NAV_RECEDE_RESET_MS did
  // not happen; the page comes back.
  it('recedes the rest of its page as its navigation starts, and brings it back if the page stays', () => {
    vi.useFakeTimers();
    try {
      const { getByRole, getByText } = render(
        <main>
          <h1>Archive</h1>
          <IntentLink href="/reports/technical-report-138">TR138</IntentLink>
        </main>,
      );
      const heading = getByText('Archive');

      fireEvent.click(getByRole('link'));
      expect(heading.hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(true);
      expect(getByRole('link').hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(false);

      act(() => vi.advanceTimersByTime(NAV_RECEDE_RESET_MS));
      expect(heading.hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the link itself: its href, class, transition types and text, and the caller handlers', () => {
    const onFocus = vi.fn();
    const el = link(onFocus);
    fireEvent.focus(el);

    expect(el.getAttribute('href')).toBe('/reports/technical-report-138');
    expect(el.className).toBe('card');
    expect(el.dataset.transitionTypes).toBe('nav-forward');
    expect(el.textContent).toBe('TR138');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});

describe('list and card links prefetch on intent', () => {
  const SRC = path.join(process.cwd(), 'src');
  // the dense lists and card grids the performance review measured, the
  // archive's secondary lists, and the links into the /show scenes (each
  // scene's route pulls the framer chunk)
  const LIST_LINKS = [
    'components/reports/ReportCard.tsx',
    'components/ui/ListRow.tsx',
    'components/ui/Card.tsx',
    'components/EpisodeRow.tsx',
    'app/reports/page.tsx',
    'app/show/page.tsx',
    'app/platform/page.tsx',
    // the onward links that close /papers and /platform (R4 layout)
    'components/ui/OnwardLinks.tsx',
  ];

  it.each(LIST_LINKS)('%s links through IntentLink, never a viewport-prefetching Link', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    expect(source).toMatch(/<IntentLink\b/);
    expect(source).not.toMatch(/<Link\b/);
    expect(source).not.toMatch(/from ['"]next\/link['"]/);
  });
});
