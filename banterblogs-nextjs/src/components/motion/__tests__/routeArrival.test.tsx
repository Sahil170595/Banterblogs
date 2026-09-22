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
    window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
    pathname.current = '/reports';
    rerender(<RouteArrival />);
    expect(scrollTo).not.toHaveBeenCalled();

    // the next push is a push again
    go('/tools', rerender);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  // R6 bug 2: the history restores a number into a page whose skipped blocks
  // hold estimated heights (TR142 landed 2,125px off). The block that topped
  // the view goes back to its offset (scrollAnchor.ts), in the frame after
  // the commit: the browser restores the number once the popstate that
  // rendered the page returns, and the correction must come after it.
  it('reached by Back or Forward puts the entry’s top block back, after the browser’s own restore', () => {
    const { rerender } = render(<RouteArrival />);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
    pathname.current = '/reports';
    history.replaceState({ __NA: true }, '', '/reports');
    rerender(<RouteArrival />);
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
