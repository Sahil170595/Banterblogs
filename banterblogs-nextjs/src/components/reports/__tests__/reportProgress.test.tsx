import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MOTION_ATTRIBUTE } from '@/components/motion/prePaint';
import { ReportProgress, SCROLL_TIMELINE_SUPPORT } from '../ReportProgress';

// The reading bar: a 2px copper bar under the header, scaled on a scroll
// timeline in CSS; a passive scroll listener stands in where scroll timelines
// are missing. Decision (documented in reading.css, the reading routes'
// stylesheet): it is functional, but it is a continuous scroll-linked motion,
// so under reduced motion it is not shown; the contents list still marks the
// section being read, by colour.

const CSS_TEXT = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'reading.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const html = document.documentElement;

// the body of the first block opened by `prelude` at or after `from`, braces balanced
function blockAfter(css: string, prelude: string, from = 0): { body: string; at: number } {
  const at = css.indexOf(prelude, from);
  if (at < 0) return { body: '', at };
  const open = css.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return { body: css.slice(open + 1, i), at };
  }
  return { body: '', at };
}

beforeEach(() => {
  html.removeAttribute(MOTION_ATTRIBUTE);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('reading progress styles', () => {
  it('scales the bar on the root scroll timeline, only where supported and only for visitors who allow motion', () => {
    const report = CSS_TEXT.slice(CSS_TEXT.indexOf('.report-progress {'));
    const supports = blockAfter(report, '@supports (animation-timeline: scroll())');
    const gate = blockAfter(supports.body, '@media (prefers-reduced-motion: no-preference)');
    const bar = blockAfter(gate.body, '.report-progress-bar');
    expect(bar.body).toMatch(/animation:\s*report-progress linear both;\s*animation-timeline:\s*scroll\(root block\);/);
    expect(CSS_TEXT).toMatch(/@keyframes report-progress \{\s*from \{\s*transform: scaleX\(0\);\s*\}\s*to \{\s*transform: scaleX\(1\);/);
  });

  it('fades the contents list edges on its own scroll timeline, with an auto duration the minifier cannot turn into 0s', () => {
    const supports = blockAfter(CSS_TEXT, '@supports (animation-timeline: scroll())', CSS_TEXT.indexOf('.report-progress {'));
    const gate = blockAfter(supports.body, '@media (prefers-reduced-motion: no-preference)');
    const scroller = blockAfter(gate.body, '.report-toc-scroller').body;
    expect(scroller).toMatch(/animation-name:\s*toc-fade-top, toc-fade-bottom;/);
    // an animation shorthand here was rewritten with animation-duration: 0s, pinning the top fade on
    expect(scroller).not.toMatch(/(?:^|[;\s])animation:/);
    expect(scroller).toMatch(/animation-duration:\s*auto;/);
    expect(scroller).toMatch(/animation-timeline:\s*scroll\(self\);/);
    expect(scroller).toMatch(/mask-image:\s*linear-gradient\(/);
  });

  it('is a 2px copper bar fixed under the header, scaled from its left edge', () => {
    const container = blockAfter(CSS_TEXT, '.report-progress {').body;
    expect(container).toMatch(/position:\s*fixed/);
    expect(container).toMatch(/top:\s*var\(--site-header-height\)/);
    expect(container).toMatch(/height:\s*2px/);
    const bar = blockAfter(CSS_TEXT, '.report-progress-bar {').body;
    expect(bar).toMatch(/background-color:\s*hsl\(var\(--primary\)\)/);
    expect(bar).toMatch(/transform-origin:\s*0 50%/);
  });

  it('is not shown under reduced motion', () => {
    const blocks: string[] = [];
    for (let at = CSS_TEXT.indexOf('@media (prefers-reduced-motion: reduce)'); at >= 0; at = CSS_TEXT.indexOf('@media (prefers-reduced-motion: reduce)', at + 1)) {
      blocks.push(blockAfter(CSS_TEXT, '@media (prefers-reduced-motion: reduce)', at).body);
    }
    expect(blocks.some((body) => /\.report-progress \{\s*display:\s*none;/.test(body))).toBe(true);
  });
});

describe('reading progress fallback', () => {
  const supportsTimelines = (supported: boolean) => vi.stubGlobal('CSS', { supports: (query: string) => supported && query === SCROLL_TIMELINE_SUPPORT });

  it('renders the bar hidden from assistive technology', () => {
    supportsTimelines(true);
    const { container } = render(<ReportProgress />);
    expect(container.querySelector('.report-progress')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.report-progress-bar')).toHaveLength(1);
  });

  it('leaves the bar to CSS where scroll timelines exist', () => {
    supportsTimelines(true);
    html.setAttribute(MOTION_ATTRIBUTE, 'on');
    const listen = vi.spyOn(window, 'addEventListener');
    render(<ReportProgress />);
    expect(listen.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
  });

  it('adds no listener while motion is not armed (no JavaScript gate, reduced motion)', () => {
    supportsTimelines(false);
    const listen = vi.spyOn(window, 'addEventListener');
    render(<ReportProgress />);
    expect(listen.mock.calls.filter(([type]) => type === 'scroll')).toEqual([]);
  });

  it('scales the bar from a passive scroll listener, once a frame, where scroll timelines are missing', () => {
    supportsTimelines(false);
    html.setAttribute(MOTION_ATTRIBUTE, 'on');
    let frame: ((time: number) => void) | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => {
      frame = cb;
      return 1;
    });
    vi.stubGlobal('innerHeight', 1000);
    Object.defineProperty(html, 'scrollHeight', { configurable: true, value: 5000 });
    const listen = vi.spyOn(window, 'addEventListener');
    const { container } = render(<ReportProgress />);
    const bar = container.querySelector<HTMLElement>('.report-progress-bar')!;

    const scroll = listen.mock.calls.find(([type]) => type === 'scroll');
    expect(scroll?.[2]).toEqual({ passive: true });
    vi.stubGlobal('scrollY', 1000);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(frame).not.toBeNull();
    frame!(0);
    expect(bar.style.transform).toBe('scaleX(0.25)');
    delete (html as { scrollHeight?: number }).scrollHeight;
  });
});
