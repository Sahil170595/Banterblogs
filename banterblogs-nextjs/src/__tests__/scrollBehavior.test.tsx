import fs from 'node:fs';
import path from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HISTORY_RESTORE_WINDOW_MS, HistoryScrollGuard } from '@/components/motion/HistoryScrollGuard';

// Browser Back to a long page (the /reports archive) restores its scroll with
// window.scrollTo, which the document-wide `scroll-behavior: smooth` animated:
// the archive showed its top, then glided ~2,900px down over ~3 s (final
// design re-judge, P0-A). In-page anchors keep gliding; a history traversal
// holds the document at instant scrolling while its restore settles. An
// #anchor link fires popstate too, so a traversal is told apart by the
// Navigation API's navigationType, or else by the router state it carries.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const htmlRule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selector]) => selector.trim() === 'html')?.[2] ?? '';
const root = document.documentElement;

describe('document scroll behavior', () => {
  it('keeps in-page anchors smooth and anchored headings clear of the sticky header', () => {
    expect(htmlRule).toMatch(/scroll-behavior:\s*smooth/);
    expect(htmlRule).toMatch(/scroll-padding-top:\s*5\.5rem/);
  });
});

describe('history scroll guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    root.style.removeProperty('scroll-behavior');
    root.style.removeProperty('font-size');
  });

  // a router history entry carries its state; a plain #anchor link, which
  // also fires popstate, carries none
  const ROUTER_STATE = { __NA: true };
  const traverse = () => window.dispatchEvent(new PopStateEvent('popstate', { state: ROUTER_STATE }));

  it('holds scrolling instant from a Back/Forward traversal until its restore settles', () => {
    render(<HistoryScrollGuard />);
    act(() => {
      traverse();
    });
    expect(root.style.scrollBehavior).toBe('auto');
    act(() => {
      vi.advanceTimersByTime(HISTORY_RESTORE_WINDOW_MS - 1);
    });
    expect(root.style.scrollBehavior).toBe('auto');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(root.style.scrollBehavior).toBe('');
  });

  it('restarts the window on a second traversal and leaves other inline styles alone', () => {
    root.style.fontSize = '112.5%';
    render(<HistoryScrollGuard />);
    act(() => {
      traverse();
      vi.advanceTimersByTime(HISTORY_RESTORE_WINDOW_MS - 100);
      traverse();
      vi.advanceTimersByTime(HISTORY_RESTORE_WINDOW_MS - 100);
    });
    expect(root.style.scrollBehavior).toBe('auto');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(root.style.scrollBehavior).toBe('');
    expect(root.style.fontSize).toBe('112.5%');
  });

  it('leaves an in-page #anchor jump smooth: its popstate carries no router state', () => {
    render(<HistoryScrollGuard />);
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
    expect(root.style.scrollBehavior).toBe('');
  });

  it('uses the Navigation API where the browser has it: only a traverse holds', () => {
    const navigation = new EventTarget();
    const withType = (navigationType: string) => Object.assign(new Event('navigate'), { navigationType });
    vi.stubGlobal('navigation', navigation);
    try {
      render(<HistoryScrollGuard />);
      act(() => {
        navigation.dispatchEvent(withType('push'));
        // with the API present, popstate is not consulted
        traverse();
      });
      expect(root.style.scrollBehavior).toBe('');
      act(() => {
        navigation.dispatchEvent(withType('traverse'));
      });
      expect(root.style.scrollBehavior).toBe('auto');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does nothing until a traversal, and cleans up when unmounted', () => {
    const { unmount } = render(<HistoryScrollGuard />);
    expect(root.style.scrollBehavior).toBe('');
    act(() => {
      traverse();
    });
    unmount();
    expect(root.style.scrollBehavior).toBe('');
  });

  it('is mounted once, in the root layout', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout.match(/<HistoryScrollGuard \/>/g)).toHaveLength(1);
  });
});
