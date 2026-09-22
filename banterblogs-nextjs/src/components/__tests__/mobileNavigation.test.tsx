import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EPISODE_PAGER_ID } from '../EpisodeNavigation';
import { MobileNavigation } from '../MobileOptimization';

// re-judge P1-6: the phone prev/next pill never hid (its bottom test could
// not pass) and covered the Bookmarks control and, at the end, the footer's
// Reader settings

type Callback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
const observers: Array<{ callback: Callback; targets: Element[] }> = [];

class FakeIntersectionObserver {
  targets: Element[] = [];
  constructor(public callback: Callback) {
    observers.push(this);
  }
  observe(target: Element) {
    this.targets.push(target);
  }
  unobserve() {}
  disconnect() {
    this.targets = [];
  }
}

const VIEWPORT_HEIGHT = 844;

// animation frames run when the test says, as a browser runs them after the event
type Frame = (time: number) => void;
const frames: Frame[] = [];
function flushFrames() {
  act(() => {
    while (frames.length) frames.shift()!(0);
  });
}

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
    window.dispatchEvent(new Event('scroll'));
  });
  flushFrames();
}

function report(target: Element, isIntersecting: boolean, top: number) {
  act(() => {
    for (const observer of observers) {
      if (observer.targets.includes(target)) {
        observer.callback([{ target, isIntersecting, boundingClientRect: { top } as DOMRectReadOnly }]);
      }
    }
  });
}

const EPISODE = { slug: 'episode-002', title: 'Two' };

function mountPage() {
  const pager = document.createElement('nav');
  pager.id = EPISODE_PAGER_ID;
  const footer = document.createElement('footer');
  document.body.append(pager, footer);
  const view = render(<MobileNavigation prevEpisode={EPISODE} nextEpisode={EPISODE} />);
  flushFrames();
  const pill = view.container.firstElementChild as HTMLElement;
  return { pager, footer, pill, shown: () => !pill.hasAttribute('inert') && pill.className.includes('opacity-100') };
}

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  frames.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: Frame) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  Object.defineProperty(window, 'innerHeight', { value: VIEWPORT_HEIGHT, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('episode prev/next pill on phones', () => {
  it('appears once the reader is into the article', () => {
    const { shown } = mountPage();
    expect(shown()).toBe(false);
    scrollTo(VIEWPORT_HEIGHT);
    expect(shown()).toBe(true);
  });

  it('leaves, inert, once the in-page pager comes into view, and stays gone below it', () => {
    const { pager, shown } = mountPage();
    scrollTo(VIEWPORT_HEIGHT * 4);
    report(pager, true, VIEWPORT_HEIGHT - 100);
    expect(shown()).toBe(false);
    // scrolled past it, into the recommendations
    report(pager, false, -200);
    expect(shown()).toBe(false);
    // back up above it
    report(pager, false, VIEWPORT_HEIGHT + 400);
    expect(shown()).toBe(true);
  });

  it('leaves when the footer comes into view', () => {
    const { footer, shown } = mountPage();
    scrollTo(VIEWPORT_HEIGHT * 4);
    report(footer, true, VIEWPORT_HEIGHT - 50);
    expect(shown()).toBe(false);
  });
});
