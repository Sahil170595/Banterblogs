import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAV_RECEDE_ATTRIBUTE, NAV_START_EVENT } from '@/components/motion/navRecede';
import { ButtonLink } from '../Button';
import { INTENT_DWELL_MS, IntentLink, NAV_RECEDE_RESET_MS } from '../IntentLink';

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
    ['it takes focus', (el: HTMLElement) => fireEvent.focus(el)],
    ['a mouse presses it', (el: HTMLElement) => fireEvent.pointerDown(el, { pointerType: 'mouse' })],
  ])('prefetches at once when %s', (_, intend) => {
    const el = link();
    intend(el);

    expect(el.dataset.prefetch).toBe('auto');
  });

  // Phase R5 (final perf re-judge, P1-B): Chrome fires pointerenter when a
  // list scrolls under a resting cursor, and every touch scroll begins with a
  // pointerdown, so both prefetched whatever the page scrolled past (desktop
  // /reports 17 requests / 696 KB per 6,000px; phone 29 / 393 KB per 12
  // swipes). A pointer must rest on the link, and a touch must not become a
  // scroll.
  describe('while the visitor only scrolls', () => {
    afterEach(() => vi.useRealTimers());

    it('prefetches once the mouse has rested on it for the dwell, not as it arrives', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerEnter(el, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS - 1));
      expect(el.dataset.prefetch).toBe('off');

      act(() => vi.advanceTimersByTime(1));
      expect(el.dataset.prefetch).toBe('auto');
    });

    it('does not prefetch for a pointer that passes over it', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerEnter(el, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS / 2));
      fireEvent.pointerLeave(el, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS * 4));

      expect(el.dataset.prefetch).toBe('off');
    });

    it('does not prefetch while the page scrolls under a resting pointer, and does once the pointer moves and rests', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerEnter(el, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS / 2));
      fireEvent.scroll(document);
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS * 4));
      expect(el.dataset.prefetch).toBe('off');

      fireEvent.pointerMove(el, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS));
      expect(el.dataset.prefetch).toBe('auto');
    });

    it('does not prefetch a touch the browser takes over as a scroll', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerDown(el, { pointerType: 'touch' });
      expect(el.dataset.prefetch).toBe('off');
      fireEvent.pointerCancel(el, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS * 4));

      expect(el.dataset.prefetch).toBe('off');
    });

    it('prefetches a tap as the finger lifts without having scrolled', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerDown(el, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS / 2));
      fireEvent.pointerUp(el, { pointerType: 'touch' });

      expect(el.dataset.prefetch).toBe('auto');
    });

    it('prefetches a finger held still on it for the dwell', () => {
      vi.useFakeTimers();
      const el = link();
      fireEvent.pointerDown(el, { pointerType: 'touch' });
      act(() => vi.advanceTimersByTime(INTENT_DWELL_MS));

      expect(el.dataset.prefetch).toBe('auto');
    });

    it('keeps the dwell short of a reader hovering before a click', () => {
      // the payload must be in hand by a click 300 ms into a hover
      expect(INTENT_DWELL_MS).toBeGreaterThanOrEqual(80);
      expect(INTENT_DWELL_MS).toBeLessThanOrEqual(150);
    });
  });

  // Primary links (the header's sections, the landing's main call to action)
  // stay warm, but only once the page has painted: a prefetch issued before a
  // delayed first paint is charged to it (final perf re-judge, P1-A).
  describe('a warm link', () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    const fcp = { name: 'first-contentful-paint', entryType: 'paint', startTime: 120 } as PerformanceEntry;

    function stubIdle() {
      const idle: Array<() => void> = [];
      vi.stubGlobal('requestIdleCallback', (callback: () => void) => idle.push(callback));
      vi.stubGlobal('cancelIdleCallback', () => undefined);
      return () => act(() => idle.splice(0).forEach((callback) => callback()));
    }

    const warmLink = () => render(<IntentLink href="/reports" warm>Research</IntentLink>).getByRole('link');

    it('prefetches once the page has painted and gone idle, not before', () => {
      const runIdle = stubIdle();
      vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => (type === 'paint' ? [fcp] : []));
      const el = warmLink();
      expect(el.dataset.prefetch).toBe('off');

      runIdle();
      expect(el.dataset.prefetch).toBe('auto');
    });

    it('waits for a first paint that has not happened yet', () => {
      const runIdle = stubIdle();
      vi.spyOn(performance, 'getEntriesByType').mockReturnValue([]);
      let painted: ((list: { getEntries: () => PerformanceEntry[] }) => void) | undefined;
      class PaintObserver {
        static supportedEntryTypes = ['paint'];
        constructor(callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {
          painted = callback;
        }
        observe() {}
        disconnect() {}
      }
      vi.stubGlobal('PerformanceObserver', PaintObserver);
      const el = warmLink();
      runIdle();
      expect(el.dataset.prefetch).toBe('off');

      act(() => painted?.({ getEntries: () => [fcp] }));
      runIdle();
      expect(el.dataset.prefetch).toBe('auto');
    });

    it('is not warm unless asked', () => {
      const runIdle = stubIdle();
      vi.spyOn(performance, 'getEntriesByType').mockImplementation((type: string) => (type === 'paint' ? [fcp] : []));
      const el = link();
      runIdle();

      expect(el.dataset.prefetch).toBe('off');
    });
  });

  // Phase R5 (design re-judge P1-C): the landing's scene keeps rendering
  // while the next page renders unless the page hears that a navigation began.
  it('announces the navigation it starts', () => {
    const heard = vi.fn();
    window.addEventListener(NAV_START_EVENT, heard);
    try {
      fireEvent.click(link());
      expect(heard).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(NAV_START_EVENT, heard);
    }
  });

  // the wordmark on the landing leads to the landing: nothing leaves
  it('neither recedes nor announces a link to the page it is on', () => {
    const heard = vi.fn();
    window.addEventListener(NAV_START_EVENT, heard);
    try {
      const { getByRole, getByText } = render(
        <main>
          <h1>Here</h1>
          <IntentLink href={window.location.pathname}>This page</IntentLink>
        </main>,
      );
      fireEvent.click(getByRole('link'));

      expect(heard).not.toHaveBeenCalled();
      expect(getByText('Here').hasAttribute(NAV_RECEDE_ATTRIBUTE)).toBe(false);
    } finally {
      window.removeEventListener(NAV_START_EVENT, heard);
    }
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

// Phase R5 (final perf re-judge, P1-A and P1-C): /papers' evidence links and
// /episodes' archive buttons were plain Links, so they prefetched report and
// archive payloads on sight (/papers phone: 41 requests / 1.09 MB over 12
// swipes; /episodes: 9 requests / 75 KB before first paint).
describe('button links', () => {
  it('prefetch a page inside the site on intent, not on sight', () => {
    const el = render(<ButtonLink href="/reports/technical-report-138">TR138</ButtonLink>).getByRole('link');
    expect(el.dataset.prefetch).toBe('off');

    fireEvent.focus(el);
    expect(el.dataset.prefetch).toBe('auto');
  });

  it('prefetch on sight only when asked, with intent={false}', () => {
    const el = render(
      <ButtonLink href="/reports" intent={false}>
        Research
      </ButtonLink>,
    ).getByRole('link');

    expect(el.dataset.prefetch).toBe('auto');
  });

  it('open a page outside the site in a new tab, as a plain link with nothing to prefetch', () => {
    const el = render(<ButtonLink href="https://arxiv.org/abs/2605.27763">arXiv</ButtonLink>).getByRole('link');

    expect(el.getAttribute('target')).toBe('_blank');
    expect(el.getAttribute('rel')).toBe('noopener noreferrer');
    expect(el.dataset.prefetch).toBeUndefined();
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
    // R5: the links in view as a page loads, and the ones a reader reaches
    // at the end of a page (breadcrumbs, back links, pagers, tag cells)
    'components/galactic/GalacticHero.tsx',
    'app/reports/[id]/page.tsx',
    'app/reports/compendium/page.tsx',
    'app/episodes/page.tsx',
    'app/episodes/[slug]/page.tsx',
    'components/EpisodeNavigation.tsx',
    'app/tags/page.tsx',
    'app/tools/page.tsx',
    'app/show/bft-consensus/page.tsx',
    'app/show/cognitive-agents/page.tsx',
    'app/show/provenance-chain/page.tsx',
    'app/show/streaming-ladder/page.tsx',
    'app/show/zk-alignment-proof/page.tsx',
  ];

  it.each(LIST_LINKS)('%s links through IntentLink, never a viewport-prefetching Link', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    expect(source).toMatch(/<IntentLink\b/);
    expect(source).not.toMatch(/<Link\b/);
    expect(source).not.toMatch(/from ['"]next\/link['"]/);
  });

  // pages whose only internal links are ButtonLinks, which prefetch on intent
  const BUTTON_ONLY = ['app/papers/page.tsx', 'app/about/page.tsx', 'app/chimera/page.tsx', 'app/banterpacks/page.tsx', 'app/tags/[tag]/page.tsx', 'components/ToolPage.tsx', 'app/error.tsx'];

  it.each(BUTTON_ONLY)('%s has no viewport-prefetching Link', (file) => {
    const source = fs.readFileSync(path.join(SRC, file), 'utf8');
    expect(source).not.toMatch(/<Link\b/);
    expect(source).not.toMatch(/from ['"]next\/link['"]/);
    expect(source).not.toMatch(/\bintent=\{false\}/);
  });
});
