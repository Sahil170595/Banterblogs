import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode, ViewTransitionProps } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportCard, describeReport } from '../ReportCard';
import { NAV_FORWARD } from '../ReportTransitions';

const { viewTransitions } = vi.hoisted(() => ({
  viewTransitions: [] as Array<Omit<ViewTransitionProps, 'children'>>,
}));

// Next bundles the React canary that exports ViewTransition; the npm React
// these tests run on is stable and has none, so a pass-through records props.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children, ...props }: ViewTransitionProps) => {
      viewTransitions.push(props);
      return actual.createElement(actual.Fragment, null, children);
    },
  };
});

// transitionTypes never reaches the DOM; surface it for the assertions
vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ transitionTypes, children, ...props }: { transitionTypes?: string[]; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-transition-types': transitionTypes?.join(' ') }, children),
  };
});

const TR138 = {
  slug: 'technical-report-138',
  title: 'TR138: Batch Inference Safety Under Non-Determinism',
  description: 'Batch perturbation and refusal robustness.',
};

const card = (props: Partial<Parameters<typeof ReportCard>[0]> = {}) => render(<ReportCard {...TR138} {...props} />).container;
const metaLine = (root: Element) => root.querySelector('[data-card-meta]')?.textContent?.replace(/\s+/g, ' ').trim();

beforeEach(() => {
  viewTransitions.length = 0;
});

afterEach(cleanup);

describe('report card', () => {
  it('renders exactly one visual, in a fixed 16:9 frame above the text', () => {
    const root = card();
    const visuals = root.querySelectorAll('svg[data-family]');

    expect(visuals).toHaveLength(1);
    const frame = visuals[0].parentElement!;
    expect(frame.className.split(/\s+/)).toEqual(expect.arrayContaining(['card-visual', 'aspect-video']));
    expect(frame.compareDocumentPosition(root.querySelector('h3')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves the TR number from the title into the meta line', () => {
    const root = card();

    expect(root.querySelector('h3')?.textContent).toBe('Batch Inference Safety Under Non-Determinism');
    expect(metaLine(root)).toBe('TR138 · Phase 5');
  });

  it.each([
    ['technical-report-164-v3', 'TR164 V3: Cross-Backend Serving Physics', 'Cross-Backend Serving Physics', 'TR164 V3 · Phase 8'],
    ['technical-report-138-study-d', 'TR138 Study D Addendum: Batch-Invariant Kernels', 'Batch-Invariant Kernels', 'TR138 Study D Addendum · Phase 5'],
    ['gemma3', 'Gemma 3 Benchmark Report', 'Gemma 3 Benchmark Report', 'Baseline · Phase 0'],
    ['technical-report-conclusive-phase1-whitepaper', 'Phase 1 Decision Whitepaper', 'Phase 1 Decision Whitepaper', 'Phase 1'],
    ['compendium', 'Chimeraforge Whitepaper', 'Chimeraforge Whitepaper', 'Compendium'],
  ])('describes %s', (slug, title, heading, meta) => {
    expect(describeReport(slug, title)).toEqual({ heading, meta });
  });

  it('badges a synthesis document and leaves single studies unbadged', () => {
    const synthesis = card({ slug: 'technical-report-conclusive-phase1-whitepaper', title: 'Phase 1 Decision Whitepaper', synthesis: true });
    expect(metaLine(synthesis)).toBe('Synthesis Phase 1');
    cleanup();
    expect(metaLine(card())).not.toContain('Synthesis');
  });

  it('marks only the latest report with the live dot, and lights its accent', () => {
    const latest = card({ latest: true });
    expect(latest.querySelectorAll('.live-dot')).toHaveLength(1);
    expect(metaLine(latest)).toBe('Latest TR138 · Phase 5');
    expect(latest.querySelector('svg')?.getAttribute('data-accent')).toBe('on');
    cleanup();
    const plain = card();
    expect(plain.querySelector('.live-dot')).toBeNull();
    expect(plain.querySelector('svg')?.hasAttribute('data-accent')).toBe(false);
  });

  it('clamps the description to two lines', () => {
    expect(card().querySelector('p')?.className).toMatch(/\bline-clamp-2\b/);
  });

  it('sends the card forward and pairs its visual and title with the report page hero and heading', () => {
    const link = card().querySelector('a')!;

    expect(link.getAttribute('href')).toBe('/reports/technical-report-138');
    expect(link.getAttribute('data-transition-types')).toBe(NAV_FORWARD);
    expect(viewTransitions.map((vt) => vt.name)).toEqual(['report-figure-technical-report-138', 'report-title-technical-report-138']);
  });

  it('has no border of its own, and moves a child while the link keeps the pointer', () => {
    const root = card();
    const link = root.querySelector('a')!;

    expect(link.className.split(/\s+/)).toContain('card-depth');
    expect(link.className).not.toMatch(/\bborder\b/);
    expect(link.firstElementChild?.className).toBe('card-lift');
    expect(root.querySelector('.card-arrow')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('card hover depth', () => {
  const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => {
    const at = CSS.indexOf(selector + ' {');
    return at < 0 ? '' : CSS.slice(at, CSS.indexOf('}', at));
  };
  // the body of the hover-capable media query, braces balanced
  const hoverOnly = (() => {
    const at = CSS.indexOf('@media (hover: hover) and (pointer: fine)');
    if (at < 0) return '';
    const open = CSS.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (; end < CSS.length; end++) {
      if (CSS[end] === '{') depth++;
      else if (CSS[end] === '}' && --depth === 0) break;
    }
    return CSS.slice(open + 1, end);
  })();

  it('lifts the card 3px only where the device really hovers, moving the child while the link keeps the pointer', () => {
    expect(CSS).toMatch(/--motion-lift:\s*3px;/);
    expect(hoverOnly).toMatch(/\.card-depth:hover \.card-lift \{[^}]*transform:\s*translateY\(calc\(-1 \* var\(--motion-lift\)\)\)/);
    // the link itself never moves, so it never slips out from under the cursor
    expect(CSS).not.toMatch(/\.card-depth(?::hover|:focus-visible|:active|:is\([^)]*\))?\s*\{[^}]*transform/);
    // hover rules live only inside hover-capable media queries (the card's, and R4's call to action)
    const outsideHover = CSS.replace(/@media \(hover: hover\) and \(pointer: fine\) \{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    expect(outsideHover).not.toMatch(/\.card-depth:hover/);
  });

  it('glows by fading a pre-rendered ring and shadow, and never transitions a shadow', () => {
    expect(rule('.card-lift::after')).toMatch(/box-shadow:/);
    expect(rule('.card-lift::after')).toMatch(/opacity:\s*0;/);
    expect(hoverOnly).toMatch(/\.card-depth:hover \.card-lift::after \{[^}]*opacity:\s*1;/);
    expect(CSS).not.toMatch(/transition[^;{}]*box-shadow/);
  });

  it('eases in over the hover token and out over enter, on strong-out', () => {
    expect(rule('.card-lift')).toMatch(/transition:\s*transform var\(--duration-enter\) var\(--ease-strong-out\)/);
    expect(hoverOnly).toMatch(/\.card-depth:hover \.card-lift \{[^}]*transition-duration:\s*var\(--duration-hover\)/);
  });

  it('nudges the arrow 4px in over hover and back over base, and shows it on keyboard focus without moving', () => {
    expect(CSS).toMatch(/--motion-nudge:\s*4px;/);
    expect(rule('.card-depth .card-arrow')).toMatch(/transform:\s*translateX\(calc\(-1 \* var\(--motion-nudge\)\)\)/);
    expect(rule('.card-depth .card-arrow')).toMatch(/var\(--duration-base\) var\(--ease-strong-out\)/);
    expect(hoverOnly).toMatch(/\.card-depth:hover \.card-arrow \{[^}]*transform:\s*none[^}]*transition-duration:\s*var\(--duration-hover\)/);
    expect(rule('.card-depth:focus-visible .card-arrow')).toMatch(/transition:\s*none/);
  });

  it('settles to 0.985 on a press, over the press token', () => {
    expect(CSS).toMatch(/--scale-press-card:\s*0\.985;/);
    expect(rule('.card-depth:active .card-lift')).toMatch(/scale\(var\(--scale-press-card\)\)/);
    expect(rule('.card-depth:active .card-lift')).toMatch(/var\(--duration-press\) var\(--ease-strong-out\)/);
  });

  it('changes nothing that moves the layout', () => {
    expect(CSS).not.toMatch(/\.card-depth[^{]*:(?:hover|active|focus-visible)[^{]*\{[^}]*(?:width|height|margin|padding|top|left|right|bottom|inset)\s*:/);
  });

  it('keeps the colour change but drops every movement under reduced motion', () => {
    // every reduced-motion block, braces balanced
    const reduced: string[] = [];
    for (let at = CSS.indexOf('@media (prefers-reduced-motion: reduce)'); at >= 0; at = CSS.indexOf('@media (prefers-reduced-motion: reduce)', at + 1)) {
      const open = CSS.indexOf('{', at);
      let depth = 0;
      let end = open;
      for (; end < CSS.length; end++) {
        if (CSS[end] === '{') depth++;
        else if (CSS[end] === '}' && --depth === 0) break;
      }
      reduced.push(CSS.slice(open + 1, end));
    }
    const neutralised = reduced.map((body) => [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)]).flat();
    const still = neutralised
      .filter(([, , body]) => /transform:\s*none\s*!important/.test(body))
      .map(([, selector]) => selector)
      .join(',');
    expect(still).toMatch(/\.card-lift/);
    expect(still).toMatch(/\.card-arrow/);
    expect(neutralised.some(([, selector, body]) => /\.card-visual/.test(selector) && /background/.test(body))).toBe(false);
    expect(neutralised.some(([, , body]) => /--motion-lift:\s*0px/.test(body))).toBe(true);
  });
});
