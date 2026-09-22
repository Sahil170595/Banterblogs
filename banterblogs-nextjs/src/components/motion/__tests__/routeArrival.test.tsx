import type { ReactElement } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteArrival } from '../RouteArrival';

// Final WIG re-judge N3: Enter pressed while the Tab's smooth focus scroll
// was still running carried that scroll onto the next page (Chromium opened
// /reports at scrollY 413, the title above the viewport). The router leaves
// the scroll alone when the new page's top is already in view, so the old
// animation ran on. A new page now starts at the top, at once, which also
// cancels anything in flight; a #fragment only cancels it (the router
// scrolls there next), and Back/Forward leaves the restore alone.

const { pathname, restoreScrollAnchor } = vi.hoisted(() => ({ pathname: { current: '/papers' }, restoreScrollAnchor: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }));
vi.mock('../scrollAnchor', () => ({ restoreScrollAnchor, currentEntryKey: () => `key:${location.pathname}` }));

const scrollTo = vi.fn();
// longer than any window a restore could be given: the page still belongs to
// the traversal that asked for it
const LATE_COMMIT_MS = 20_000;
type Frame = Parameters<typeof requestAnimationFrame>[0];
let frames: Frame[] = [];
const runFrames = () => {
  const due = frames;
  frames = [];
  due.forEach((frame) => frame(performance.now()));
};
const go = (to: string, rerender: (ui: ReactElement) => void) => {
  const [path] = to.split('#');
  pathname.current = path;
  history.pushState({ __NA: true }, '', to);
  rerender(<RouteArrival />);
};

// Back or Forward, as the browser runs it: the entry is current, so popstate
// already reads the destination; the page it reaches commits after, however
// long the render takes.
const traverseTo = (to: string) => {
  history.replaceState({ __NA: true }, '', to);
  window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
};
const commit = (to: string, rerender: (ui: ReactElement) => void) => {
  pathname.current = to.split('#')[0];
  rerender(<RouteArrival />);
};

beforeEach(() => {
  pathname.current = '/papers';
  history.replaceState(null, '', '/papers');
  scrollTo.mockClear();
  restoreScrollAnchor.mockClear();
  frames = [];
  vi.stubGlobal('scrollTo', scrollTo);
  vi.stubGlobal('requestAnimationFrame', (frame: Frame) => frames.push(frame));
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 413 });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, 'scrollY');
});

describe('a new page', () => {
  it('starts at the top at once, cancelling a scroll still running from the last page', () => {
    const { rerender } = render(<RouteArrival />);
    expect(scrollTo).not.toHaveBeenCalled();
    go('/reports', rerender);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('reached at a #fragment only stops that scroll where it is: the router scrolls to the fragment next', () => {
    const { rerender } = render(<RouteArrival />);
    go('/reports/technical-report-138#references', rerender);
    expect(scrollTo).toHaveBeenCalledWith({ top: 413, left: 0, behavior: 'instant' });
  });

  it('reached by Back or Forward keeps the position the history restores', () => {
    const { rerender } = render(<RouteArrival />);
    traverseTo('/reports');
    commit('/reports', rerender);
    expect(scrollTo).not.toHaveBeenCalled();

    // the next push is a push again
    go('/tools', rerender);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  // CI, in the Playwright image with two workers: TR142 committed after the
  // window a restore used to get, so Back took the page for a new one and
  // started it at the top, 10,041px from where the reader left (locally:
  // Chromium at 16x CPU, commit 19.2s after the traversal). A page a
  // traversal reaches is its own, however long it takes to render.
  it('reached by Back or Forward is restored however late it commits', () => {
    const { rerender } = render(<RouteArrival />);
    traverseTo('/reports');
    vi.spyOn(performance, 'now').mockReturnValue(performance.now() + LATE_COMMIT_MS);
    commit('/reports', rerender);
    expect(scrollTo).not.toHaveBeenCalled();
    runFrames();
    expect(restoreScrollAnchor).toHaveBeenCalledWith('key:/reports');
  });

  // a traversal that changes no page (an #jump's entry, an archive tab) must
  // not leave the next page it does change taking itself for one
  it('does not hand the next page a traversal meant for another', () => {
    const { rerender } = render(<RouteArrival />);
    traverseTo('/papers#top');
    go('/reports', rerender);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    runFrames();
    expect(restoreScrollAnchor).not.toHaveBeenCalled();
  });

  // R6 bug 2: the history restores a number into a page whose skipped blocks
  // hold estimated heights (TR142 landed 2,125px off). The block that topped
  // the view goes back to its offset (scrollAnchor.ts), in the frame after
  // the commit: the browser restores the number once the popstate that
  // rendered the page returns, and the correction must come after it.
  it('reached by Back or Forward puts the entry’s top block back, after the browser’s own restore', () => {
    const { rerender } = render(<RouteArrival />);
    traverseTo('/reports');
    commit('/reports', rerender);
    expect(restoreScrollAnchor).not.toHaveBeenCalled();
    runFrames();
    expect(restoreScrollAnchor).toHaveBeenCalledTimes(1);
    expect(restoreScrollAnchor).toHaveBeenCalledWith('key:/reports');
  });

  it('reached by a link restores no anchor', () => {
    const { rerender } = render(<RouteArrival />);
    go('/reports', rerender);
    runFrames();
    expect(restoreScrollAnchor).not.toHaveBeenCalled();
  });

  it('is the same page after a query change: nothing moves', () => {
    const { rerender } = render(<RouteArrival />);
    history.replaceState(null, '', '/papers?x=1');
    rerender(<RouteArrival />);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
