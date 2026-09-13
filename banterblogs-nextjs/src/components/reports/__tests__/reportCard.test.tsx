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

  it('sends the card forward and pairs its title with the report heading', () => {
    const link = card().querySelector('a')!;

    expect(link.getAttribute('href')).toBe('/reports/technical-report-138');
    expect(link.getAttribute('data-transition-types')).toBe(NAV_FORWARD);
    expect(viewTransitions.map((vt) => vt.name)).toEqual(['report-title-technical-report-138']);
  });

  it('has no border of its own: depth comes from the hover rule, and the arrow is decorative', () => {
    const root = card();
    const link = root.querySelector('a')!;

    expect(link.className.split(/\s+/)).toContain('card-depth');
    expect(link.className).not.toMatch(/\bborder\b/);
    expect(root.querySelector('.card-arrow')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('card hover depth', () => {
  const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (selector: string) => {
    const at = CSS.indexOf(selector + ' {');
    return at < 0 ? '' : CSS.slice(at, CSS.indexOf('}', at));
  };

  it('lifts 4px, brightens and glows on hover, springing the arrow 4px: transform, opacity and colour only', () => {
    expect(CSS).toMatch(/--hover-lift:\s*4px;/);
    expect(CSS).toMatch(/--hover-nudge:\s*4px;/);
    expect(rule('.card-depth:is(:hover, :focus-visible)')).toMatch(/transform:\s*translateY\(calc\(-1 \* var\(--hover-lift\)\)\)/);
    expect(rule('.card-depth:is(:hover, :focus-visible) .card-visual')).toMatch(/background-color:/);
    expect(rule('.card-depth .card-arrow')).toMatch(/transform:\s*translateX\(calc\(-1 \* var\(--hover-nudge\)\)\)/);
    expect(rule('.card-depth:is(:hover, :focus-visible) .card-arrow')).toMatch(/transform:\s*none/);
    // the glow is a pre-rendered shadow that only fades
    expect(rule('.card-depth::before')).toMatch(/box-shadow:/);
    expect(rule('.card-depth::before')).toMatch(/opacity:\s*0;/);
    expect(rule('.card-depth:is(:hover, :focus-visible)::before')).toMatch(/opacity:\s*1;/);
    expect(rule('.card-depth:is(:hover, :focus-visible)::before')).not.toMatch(/box-shadow/);
    // nothing a hover changes moves the layout
    expect(CSS).not.toMatch(/\.card-depth:is\(:hover, :focus-visible\)[^{]*\{[^}]*(?:width|height|margin|padding|top|left|right|bottom|inset)\s*:/);
  });

  it('springs in over the hover token and eases out over base', () => {
    expect(rule('.card-depth')).toMatch(/var\(--motion-base\)\s+var\(--ease-out-quad\)/);
    expect(rule('.card-depth:is(:hover, :focus-visible)')).toMatch(/transform var\(--motion-hover\) var\(--ease-spring\)/);
    expect(rule('.card-depth:is(:hover, :focus-visible) .card-arrow')).toMatch(/transform var\(--motion-hover\) var\(--ease-spring\)/);
  });

  it('keeps the colour change but drops every transform under reduced motion', () => {
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
    const rest = neutralised.filter(([, selector, body]) => /\.card-depth/.test(selector) && /transform:\s*none\s*!important/.test(body));
    expect(rest.map(([, selector]) => selector).join(',')).toMatch(/\.card-arrow/);
    expect(neutralised.some(([, selector, body]) => /\.card-visual/.test(selector) && /background/.test(body))).toBe(false);
  });
});
