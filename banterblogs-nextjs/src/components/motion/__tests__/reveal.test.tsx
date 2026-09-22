import fs from 'node:fs';
import path from 'node:path';
import type { CSSProperties, ReactNode } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import RootLayout from '@/app/layout';
import { Reveal } from '../Reveal';
import { RevealScope } from '../RevealScope';
import { armReveal, REVEAL_ATTRIBUTE, REVEAL_PENDING, REVEAL_SHOWN, REVEAL_STAGGER_CAP, REVEAL_TARGET } from '../revealObserver';
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
// the route boundary renders the canary-only ViewTransition, which npm React lacks
vi.mock('@/components/motion/RouteTransition', () => ({ RouteTransition: ({ children }: { children: ReactNode }) => children }));

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

// Reveals armed together are measured in one microtask queued at mount; this
// resolves once that pass has run.
const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

// Renders reveals whose boxes sit at the given page offsets when their batch
// is measured.
async function renderRevealsAt(tops: number[]) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  let next = 0;
  HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.hasAttribute(REVEAL_ATTRIBUTE) && this.dataset.top === undefined) this.dataset.top = String(tops[next++] ?? 0);
    const top = Number(this.dataset.top ?? 0);
    return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
  };
  try {
    const rendered = render(
      <>
        {tops.map((top) => (
          <Reveal key={top}>item at {top}</Reveal>
        ))}
      </>,
    );
    await settle();
    return rendered;
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
}

// every element's box sits at `top` until the returned restore runs
function boxesAt(top: number) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = () => ({ top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) });
  return () => {
    HTMLElement.prototype.getBoundingClientRect = original;
  };
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
      <Reveal data-entrance-item="" style={{ '--entrance-i': 2 } as CSSProperties}>
        card
      </Reveal>,
    );

    expect(markup).toContain('data-entrance-item=""');
    expect(markup).toContain('style="--entrance-i:2"');
  });
});

describe('<Reveal> behaviour', () => {
  it('leaves everything at rest while the motion gate is off (no JavaScript gate, reduced motion)', async () => {
    const { container } = await renderRevealsAt([BELOW_FOLD]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;

    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
    expect(io.instances.every((instance) => !instance.observed.has(el))).toBe(true);
  });

  it('never hides what is already on screen', async () => {
    armMotion();
    const { container } = await renderRevealsAt([ON_SCREEN]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;

    expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
  });

  it('holds back content below the fold and reveals it once as it enters', async () => {
    armMotion();
    const { container } = await renderRevealsAt([BELOW_FOLD]);
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

  it('staggers a batch entering together in reading order, capped at six steps', async () => {
    armMotion();
    const tops = [BELOW_FOLD, BELOW_FOLD + 10, BELOW_FOLD + 20, BELOW_FOLD + 30, BELOW_FOLD + 40, BELOW_FOLD + 50, BELOW_FOLD + 60, BELOW_FOLD + 70];
    const { container } = await renderRevealsAt(tops);
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

  it('stops watching a reveal that unmounts before it enters', async () => {
    armMotion();
    const { container, unmount } = await renderRevealsAt([BELOW_FOLD + 500]);
    const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;
    unmount();

    expect(observer().unobserved).toContain(el);
  });

  it('shares one observer across every reveal', async () => {
    armMotion();
    await renderRevealsAt([BELOW_FOLD, BELOW_FOLD + 100, BELOW_FOLD + 200]);

    expect(io.instances).toHaveLength(1);
  });

  it('measures every reveal armed together before it holds any, so no hold forces a layout for the next measure', async () => {
    armMotion();
    const steps: string[] = [];
    const tops = [BELOW_FOLD, BELOW_FOLD + 100, BELOW_FOLD + 200];
    const original = HTMLElement.prototype.getBoundingClientRect;
    const viewport = Object.getOwnPropertyDescriptor(globalThis, 'innerHeight');
    const setAttribute = Element.prototype.setAttribute;
    HTMLElement.prototype.getBoundingClientRect = function () {
      steps.push('measure');
      const top = Number(this.dataset.top ?? 0);
      return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
    };
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, get: () => (steps.push('measure'), VIEWPORT_HEIGHT) });
    vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (this: Element, name: string, value: string) {
      if (name === REVEAL_ATTRIBUTE && value === REVEAL_PENDING) steps.push('hold');
      setAttribute.call(this, name, value);
    });
    try {
      render(
        <>
          {tops.map((top) => (
            <Reveal key={top} data-top={String(top)}>
              item at {top}
            </Reveal>
          ))}
        </>,
      );
      await settle();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      if (viewport) Object.defineProperty(globalThis, 'innerHeight', viewport);
    }

    expect(steps.filter((step) => step === 'hold')).toHaveLength(tops.length);
    expect(steps.lastIndexOf('measure')).toBeLessThan(steps.indexOf('hold'));
  });

  it('never holds a reveal that unmounts before its batch is measured', async () => {
    armMotion();
    const restore = boxesAt(BELOW_FOLD);
    try {
      const { container, unmount } = render(<Reveal>gone before it is measured</Reveal>);
      const el = container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!;
      unmount();
      await settle();

      expect(el.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
      expect(io.instances.every((instance) => !instance.observed.has(el))).toBe(true);
    } finally {
      restore();
    }
  });

  it('holds nothing if motion stands down before the batch is measured (reduced motion mid-visit)', async () => {
    armMotion();
    const restore = boxesAt(BELOW_FOLD);
    try {
      const { container } = render(<Reveal>below the fold</Reveal>);
      html.removeAttribute(MOTION_ATTRIBUTE);
      await settle();

      expect(container.querySelector(`[${REVEAL_ATTRIBUTE}]`)!.getAttribute(REVEAL_ATTRIBUTE)).toBe('');
    } finally {
      restore();
    }
  });
});

// RevealScope arms the reveal targets a server renderer marked inside markup
// React only sets as a string (the report body): the same rest marker <Reveal>
// renders, the same shared observer, the same pending and shown states.
const ON_SCREEN_TARGET = `<div class="table-scroll" ${REVEAL_ATTRIBUTE}="" data-top="${ON_SCREEN}"><table><tbody><tr><td>1</td></tr></tbody></table></div>`;
const BELOW_TARGET = `<pre ${REVEAL_ATTRIBUTE}="" data-top="${BELOW_FOLD}"><code>x = 1</code></pre>`;
const BELOW_PROSE = `<p data-top="${BELOW_FOLD + 200}">prose never moves</p>`;
const SCOPED_HTML = `<p>intro</p>${ON_SCREEN_TARGET}${BELOW_TARGET}${BELOW_PROSE}`;

// renders a scope whose elements sit at their data-top offsets when their
// batch is measured
async function renderScope(html: string) {
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const top = Number(this.dataset.top ?? 0);
    return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
  };
  try {
    const rendered = render(<RevealScope className="report-prose" html={html} />);
    await settle();
    return rendered;
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
}

describe('<RevealScope> markup', () => {
  it('renders the server HTML exactly as it was given, every target at rest', () => {
    const markup = renderToStaticMarkup(<RevealScope className="report-prose" html={SCOPED_HTML} />);

    expect(markup).toBe(`<div class="report-prose">${SCOPED_HTML}</div>`);
    expect(markup).not.toMatch(/pending|shown|opacity|transform/);
  });

  it('owns the rest marker a server renderer writes: data-reveal="" as a hast or React property', () => {
    expect(REVEAL_TARGET).toEqual({ dataReveal: '' });
  });
});

describe('<RevealScope> behaviour', () => {
  const target = (container: Element, tag: string) => container.querySelector<HTMLElement>(`.report-prose > ${tag}`)!;

  it('leaves every target at rest while the motion gate is off (no JavaScript gate, reduced motion)', async () => {
    const { container } = await renderScope(SCOPED_HTML);

    expect(target(container, 'pre').getAttribute(REVEAL_ATTRIBUTE)).toBe('');
    expect(io.instances.every((instance) => !instance.observed.has(target(container, 'pre')))).toBe(true);
  });

  it('holds back only the marked targets below the fold, and reveals each once as it enters', async () => {
    armMotion();
    const { container } = await renderScope(SCOPED_HTML);
    const below = target(container, 'pre');

    expect(target(container, 'div').getAttribute(REVEAL_ATTRIBUTE)).toBe('');
    expect(below.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);
    // prose is never a target, wherever it sits
    expect(container.querySelectorAll(`p[${REVEAL_ATTRIBUTE}]`)).toHaveLength(0);

    act(() => observer().callback([entry(below)], observer() as unknown as IntersectionObserver));
    expect(below.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_SHOWN);
    expect(observer().observed.has(below)).toBe(false);
  });

  it('measures every target before it holds any, so no hold forces a layout for the next measure', async () => {
    armMotion();
    const steps: string[] = [];
    const original = HTMLElement.prototype.getBoundingClientRect;
    const viewport = Object.getOwnPropertyDescriptor(globalThis, 'innerHeight');
    const setAttribute = Element.prototype.setAttribute;
    HTMLElement.prototype.getBoundingClientRect = function () {
      steps.push('measure');
      const top = Number(this.dataset.top ?? 0);
      return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
    };
    Object.defineProperty(globalThis, 'innerHeight', { configurable: true, get: () => (steps.push('measure'), VIEWPORT_HEIGHT) });
    vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (this: Element, name: string, value: string) {
      if (name === REVEAL_ATTRIBUTE && value === REVEAL_PENDING) steps.push('hold');
      setAttribute.call(this, name, value);
    });
    const blocks = [BELOW_FOLD, BELOW_FOLD + 100, BELOW_FOLD + 200].map((top) => `<pre ${REVEAL_ATTRIBUTE}="" data-top="${top}"><code>${top}</code></pre>`);
    try {
      render(<RevealScope className="report-prose" html={blocks.join('')} />);
      await settle();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
      if (viewport) Object.defineProperty(globalThis, 'innerHeight', viewport);
    }

    expect(steps.filter((step) => step === 'hold')).toHaveLength(blocks.length);
    expect(steps.lastIndexOf('measure')).toBeLessThan(steps.indexOf('hold'));
  });

  it('joins the same measuring pass as a <Reveal> armed alongside it', async () => {
    armMotion();
    const steps: string[] = [];
    const original = HTMLElement.prototype.getBoundingClientRect;
    const setAttribute = Element.prototype.setAttribute;
    HTMLElement.prototype.getBoundingClientRect = function () {
      steps.push('measure');
      const top = Number(this.dataset.top ?? 0);
      return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) };
    };
    vi.spyOn(Element.prototype, 'setAttribute').mockImplementation(function (this: Element, name: string, value: string) {
      if (name === REVEAL_ATTRIBUTE && value === REVEAL_PENDING) steps.push('hold');
      setAttribute.call(this, name, value);
    });
    try {
      render(
        <>
          <Reveal data-top={String(BELOW_FOLD)}>card</Reveal>
          <RevealScope className="report-prose" html={BELOW_TARGET} />
        </>,
      );
      await settle();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }

    expect(steps).toEqual(['measure', 'measure', 'hold', 'hold']);
  });

  it('shares the one observer with <Reveal>, and lets go of its targets on unmount', async () => {
    armMotion();
    const before = io.instances.length;
    const { container, unmount } = await renderScope(SCOPED_HTML);
    const below = target(container, 'pre');
    unmount();

    expect(io.instances.length).toBeLessThanOrEqual(Math.max(before, 1));
    expect(observer().unobserved).toContain(below);
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

// Final WIG re-judge P1-C: the browser's minimal focus scroll parks a target
// in the bottom 8% band the observer leaves out, so a focused link on /work
// and a focused table on TR142 sat at opacity 0 for good. Held content with
// focus inside it is at rest at once, and stays shown once focus moves on.
describe('focus inside held content', () => {
  const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleFor = (selector: string) =>
    [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, prelude]) => prelude.split(',').map((s) => s.trim()).includes(selector))?.[2] ?? '';

  it('is at rest while it holds focus, with nothing to animate', () => {
    const rule = ruleFor(`html[${MOTION_ATTRIBUTE}="on"] [${REVEAL_ATTRIBUTE}="${REVEAL_PENDING}"]:focus-within`);
    expect(rule).toMatch(/opacity:\s*1;/);
    expect(rule).toMatch(/transform:\s*none;/);
    // the held state sets nothing else (no blur: globals.css, <Reveal>)
    const held = ruleFor(`html[${MOTION_ATTRIBUTE}="on"] [${REVEAL_ATTRIBUTE}="${REVEAL_PENDING}"]`);
    expect(held.match(/([\w-]+):/g)?.map((property) => property.slice(0, -1)).sort()).toEqual(['opacity', 'transform']);
  });

  it('stays shown once focus moves on, and is no longer watched', async () => {
    armMotion();
    const restore = boxesAt(BELOW_FOLD);
    try {
      const { container } = render(
        <>
          <Reveal>
            <a href="/work#pytorch">PyTorch PR</a>
          </Reveal>
          <Reveal>
            <a href="/work#other">Another held row</a>
          </Reveal>
        </>,
      );
      await settle();
      const [held, other] = [...container.querySelectorAll<HTMLElement>(`[${REVEAL_ATTRIBUTE}]`)];
      expect(held.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);

      held.querySelector('a')!.focus();
      expect(held.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);

      other.querySelector('a')!.focus();
      expect(held.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_SHOWN);
      expect(observer().observed.has(held)).toBe(false);
      // the row focus moved into is at rest by the rule above until it leaves
      expect(other.getAttribute(REVEAL_ATTRIBUTE)).toBe(REVEAL_PENDING);
    } finally {
      restore();
    }
  });
});
