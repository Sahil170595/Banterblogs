import type { CSSProperties } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import RootLayout from '@/app/layout';
import { Reveal } from '../Reveal';
import { armReveal, REVEAL_ATTRIBUTE, REVEAL_PENDING, REVEAL_SHOWN, REVEAL_STAGGER_CAP } from '../revealObserver';
import { ENTRANCE_ATTRIBUTE, MOTION_ATTRIBUTE, MOTION_GATE_SCRIPT, MOTION_GATE_SCRIPT_ID } from '../prePaint';

vi.mock('next/font/google', () => ({
  Manrope: () => ({ variable: 'font-sans' }),
  Space_Grotesk: () => ({ variable: 'font-display' }),
  JetBrains_Mono: () => ({ variable: 'font-mono' }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
vi.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));
vi.mock('@/components/SearchDialog', () => ({ SearchDialog: () => null }));

type ObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

// One shared observer backs every <Reveal>; this stand-in records what it is
// asked to watch and lets a test deliver intersection entries.
const io = vi.hoisted(() => ({
  instances: [] as Array<{ callback: ObserverCallback; observed: Set<Element>; unobserved: Element[] }>,
}));

class RecordingObserver {
  observed = new Set<Element>();
  unobserved: Element[] = [];
  constructor(public callback: ObserverCallback) {
    io.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
    this.unobserved.push(el);
  }
  disconnect() {
    this.observed.clear();
  }
}

const VIEWPORT_HEIGHT = 800;
const BELOW_FOLD = 1600;
const ON_SCREEN = 200;

const html = document.documentElement;
const armMotion = () => html.setAttribute(MOTION_ATTRIBUTE, 'on');
const observer = () => io.instances[0];

// Renders reveals whose boxes sit at the given page offsets before the
// mount effect measures them.
function renderRevealsAt(tops: number[]) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  let next = 0;
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.hasAttribute(REVEAL_ATTRIBUTE) && this.dataset.top === undefined) this.dataset.top = String(tops[next++] ?? 0);
    const top = Number(this.dataset.top ?? 0);
    return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
  };
  try {
    return render(
      <>
        {tops.map((top) => (
          <Reveal key={top}>item at {top}</Reveal>
        ))}
      </>,
    );
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
}

// the rect is the offset the reveal was rendered at (renderRevealsAt)
const entry = (target: Element, isIntersecting = true) =>
  ({
    target,
    isIntersecting,
    boundingClientRect: { top: Number((target as HTMLElement).dataset.top ?? 0), left: 0 },
  }) as unknown as IntersectionObserverEntry;

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', RecordingObserver);
  vi.stubGlobal('innerHeight', VIEWPORT_HEIGHT);
});

beforeEach(() => {
  html.removeAttribute(MOTION_ATTRIBUTE);
  html.removeAttribute(ENTRANCE_ATTRIBUTE);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('<Reveal> markup', () => {
  it('renders its content visible, with no hidden state in the HTML', () => {
    const markup = renderToStaticMarkup(
      <Reveal as="li" className="card">
        report
      </Reveal>,
    );

    expect(markup).toBe('<li data-reveal="" class="card">report</li>');
    expect(markup).not.toMatch(/pending|opacity|transform/);
  });

  it('passes data attributes and style through for the entrance', () => {
    const markup = renderToStaticMarkup(
      <Reveal data-entrance-card="" style={{ '--entrance-i': 2 } as CSSProperties}>
        card
      </Reveal>,
    );

    expect(markup).toContain('data-entrance-card=""');
    expect(markup).toContain('style="--entrance-i:2"');
  });
});

describe('<Reveal> behaviour', () => {
  it('leaves everything at rest while the motion gate is off (no JavaScript gate, reduced motion)', () => {
    const { container } = renderRevealsAt([BELOW_FOLD]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;

    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
    expect(io.instances.every((instance) => !instance.observed.has(el))).toBe(true);
  });

  it('never hides what is already on screen', () => {
    armMotion();
    const { container } = renderRevealsAt([ON_SCREEN]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;

    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
  });

  it('holds back content below the fold and reveals it once as it enters', () => {
    armMotion();
    const { container } = renderRevealsAt([BELOW_FOLD]);
    const el = container.querySelector<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`)!;

    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);
    expect(observer().observed.has(el)).toBe(true);

    act(() => observer().callback([entry(el, false)], observer() as unknown as IntersectionObserver));
    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);

    act(() => observer().callback([entry(el)], observer() as unknown as IntersectionObserver));
    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_SHOWN);
    expect(el.style.getPropertyValue('--reveal-i')).toBe('0');
    expect(observer().observed.has(el)).toBe(false);
  });

  it('staggers a batch entering together in reading order, capped at six steps', () => {
    armMotion();
    const tops = [BELOW_FOLD, BELOW_FOLD + 10, BELOW_FOLD + 20, BELOW_FOLD + 30, BELOW_FOLD + 40, BELOW_FOLD + 50, BELOW_FOLD + 60, BELOW_FOLD + 70];
    const { container } = renderRevealsAt(tops);
    const els = [...container.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`)];
    const shuffled = [els[3], els[0], els[7], els[5], els[1], els[6], els[2], els[4]];

    act(() => observer().callback(shuffled.map((el) => entry(el)), observer() as unknown as IntersectionObserver));

    expect(els.map((el) => el.style.getPropertyValue('--reveal-i'))).toEqual(['0', '1', '2', '3', '4', '5', '5', '5']);
    expect(REVEAL_STAGGER_CAP).toBe(5);
    expect(els.every((el) => el.getAttribute(REVEAL_ATTRIBUTE) === REVEAL_SHOWN)).toBe(true);
  });

  it('never hides a reveal again once it has been shown', () => {
    armMotion();
    const el = document.createElement('div');
    el.setAttribute(REVEAL_ATTRIBUTE, REVEAL_SHOWN);
    el.getBoundingClientRect = () => ({ top: BELOW_FOLD, left: 0, bottom: BELOW_FOLD + 100, right: 100, width: 100, height: 100, x: 0, y: BELOW_FOLD, toJSON: () => ({}) });

    expect(armReveal(el)).toBeUndefined();
    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_SHOWN);
  });

  it('stops watching a reveal that unmounts before it enters', () => {
    armMotion();
    const { container, unmount } = renderRevealsAt([BELOW_FOLD + 500]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;
    unmount();

    expect(observer().unobserved).toContain(el);
  });

  it('shares one observer across every reveal', () => {
    armMotion();
    renderRevealsAt([BELOW_FOLD, BELOW_FOLD + 100, BELOW_FOLD + 200]);

    expect(io.instances).toHaveLength(1);
  });
});

describe('pre-paint motion gate', () => {
  const listeners: Array<{ query: string; listener: (event: { matches: boolean }) => void }> = [];

  function stubMatchMedia(allowsMotion: boolean) {
    listeners.length = 0;
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('no-preference') ? allowsMotion : !allowsMotion,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => listeners.push({ query, listener }),
    }));
  }

  const runGate = () => new Function(MOTION_GATE_SCRIPT)();

  it('arms motion only when JavaScript runs and the visitor has not asked for reduced motion', () => {
    stubMatchMedia(true);
    runGate();
    expect(html.getAttribute(MOTION_ATTRIBUTE)).toBe('on');
    expect(html.getAttribute(ENTRANCE_ATTRIBUTE)).toBe(location.pathname);

    html.removeAttribute(MOTION_ATTRIBUTE);
    html.removeAttribute(ENTRANCE_ATTRIBUTE);
    stubMatchMedia(false);
    runGate();
    expect(html.hasAttribute(MOTION_ATTRIBUTE)).toBe(false);
    expect(html.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);
  });

  it('fails closed and says why when the preference cannot be read', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('matchMedia', () => {
      throw new Error('no matchMedia');
    });

    expect(runGate).not.toThrow();
    expect(html.hasAttribute(MOTION_ATTRIBUTE)).toBe(false);
    expect(warn).toHaveBeenCalledWith('[motion] pre-paint gate failed', expect.any(Error));
  });

  it('stands motion down if the visitor switches to reduced motion mid-visit', () => {
    stubMatchMedia(true);
    runGate();
    const reduce = listeners.find((l) => l.query.includes('reduce'));
    expect(reduce).toBeDefined();

    reduce!.listener({ matches: true });
    expect(html.hasAttribute(MOTION_ATTRIBUTE)).toBe(false);
    expect(html.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);
  });

  it('closes the entrance window once no entrance animation is left running', () => {
    stubMatchMedia(true);
    let running = [{ animationName: 'entrance-line', playState: 'running' }];
    Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => running });
    runGate();

    document.dispatchEvent(new Event('DOMContentLoaded'));
    expect(html.getAttribute(ENTRANCE_ATTRIBUTE)).toBe(location.pathname);

    // an unrelated animation ending changes nothing
    const other = Object.assign(new Event('animationend'), { animationName: 'live-pulse' });
    running = [];
    document.dispatchEvent(other);
    expect(html.getAttribute(ENTRANCE_ATTRIBUTE)).toBe(location.pathname);

    const last = Object.assign(new Event('animationend'), { animationName: 'entrance-rise' });
    document.dispatchEvent(last);
    expect(html.hasAttribute(ENTRANCE_ATTRIBUTE)).toBe(false);
    delete (document as { getAnimations?: unknown }).getAnimations;
  });

  it('is inlined into <head> by the root layout, ahead of the page', () => {
    const markup = renderToStaticMarkup(<RootLayout>{<p>page</p>}</RootLayout>);
    const head = /<head>([\s\S]*?)<\/head>/.exec(markup)?.[1] ?? '';

    expect(head).toContain(`<script id="${MOTION_GATE_SCRIPT_ID}">${MOTION_GATE_SCRIPT}</script>`);
    expect(markup.indexOf(MOTION_GATE_SCRIPT)).toBeLessThan(markup.indexOf('<p>page</p>'));
  });
});
