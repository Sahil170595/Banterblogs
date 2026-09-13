import { isValidElement, type ReactElement, type ViewTransitionProps } from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ReportsIndex from '@/app/reports/page';
import { Reveal } from '@/components/motion/Reveal';
import { MEASUREMENTS, REPORTS } from '@/lib/constants';
import { PHASE_DEFINITIONS, extractTRNumber, phaseWhitepaperSlug } from '@/lib/reports/phases';
import { ReportTabs, type ReportTabEntry, type ReportTabGroup } from '../ReportTabs';

// Next's App Router bundles the React canary that exports ViewTransition; the
// npm React these tests run on is stable and has none.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

type AnyElement = ReactElement<Record<string, unknown>>;

// Every element of the page's own tree, depth first; child components are not
// called, so what is inspected is the page's wiring.
function elementsIn(node: unknown): AnyElement[] {
  if (Array.isArray(node)) return node.flatMap(elementsIn);
  if (!isValidElement(node)) return [];
  const element = node as AnyElement;
  return [element, ...elementsIn(element.props.children)];
}

function textIn(node: unknown): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textIn).join('');
  return isValidElement(node) ? textIn((node as AnyElement).props.children) : '';
}

const classes = (el: AnyElement) => String(el.props.className ?? '').split(/\s+/);
// border width utilities: border, border-b, hover:border-2 ... (colour utilities do not draw one)
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
// one line at the desktop measure
const INTRO_MAX_CHARS = 120;

let page: AnyElement[];
let tabs: AnyElement;

beforeAll(async () => {
  page = elementsIn(await ReportsIndex());
  tabs = page.find((el) => el.type === ReportTabs)!;
});

describe('archive head', () => {
  it('opens on the title in two entrance lines, with no boxed hero or stat tiles', () => {
    const h1s = page.filter((el) => el.type === 'h1');
    expect(h1s).toHaveLength(1);
    const lines = elementsIn(h1s[0].props.children).filter((el) => classes(el).includes('entrance-line'));

    expect(lines.map(textIn)).toEqual(['Edge LLM Inference', 'Under Real-World Constraints']);
    expect(lines.map((el) => (el.props.style as Record<string, number>)['--line'])).toEqual([0, 1]);
    expect(page.filter((el) => classes(el).some((c) => /^signal-(panel|pill)/.test(c)))).toEqual([]);
  });

  it('follows the title with a one-line intro and the three stats inline, then the tabs', () => {
    const at = (el: AnyElement | undefined) => (el ? page.indexOf(el) : -1);
    const h1 = page.find((el) => el.type === 'h1');
    const intro = page.find((el) => el.type === 'p' && classes(el).includes('entrance-intro'));
    const stats = page.find((el) => el.type === 'ul' && classes(el).includes('entrance-intro'));

    expect(at(h1)).toBeLessThan(at(intro));
    expect(at(intro)).toBeLessThan(at(stats));
    expect(at(stats)).toBeLessThan(at(tabs));
    expect(textIn(intro?.props.children).length).toBeLessThanOrEqual(INTRO_MAX_CHARS);
    const items = elementsIn(stats?.props.children).filter((el) => el.type === 'li').map(textIn);
    expect(items.slice(0, 3)).toEqual([
      `${MEASUREMENTS.SHORT} measurements`,
      `${REPORTS.DISPLAY} technical reports`,
      `${PHASE_DEFINITIONS.filter((p) => p.hasWhitepaper).length} synthesis whitepapers`,
    ]);
  });

  it('never holds the title, intro or stats in a reveal: they paint on the first frame', () => {
    for (const reveal of page.filter((el) => el.type === Reveal)) {
      const inside = elementsIn(reveal.props.children);
      expect(inside.some((el) => el.type === 'h1' || classes(el).some((c) => c.startsWith('entrance-')))).toBe(false);
    }
  });

  it('draws no bordered boxes of its own', () => {
    expect(page.map(classes).filter((list) => list.some((c) => BORDER_WIDTH.test(c)))).toEqual([]);
  });
});

describe('archive grid inputs', () => {
  it('opens the All tab on the curated synthesis set: the compendium, then each phase whitepaper', () => {
    const synthesis = tabs.props.synthesis as ReportTabEntry[];

    expect(synthesis.map((s) => s.slug)).toEqual([
      'compendium',
      ...PHASE_DEFINITIONS.filter((p) => p.hasWhitepaper).map((p) => phaseWhitepaperSlug(p.key)),
    ]);
    for (const s of synthesis) {
      expect(s.title, s.slug).not.toBe('');
      expect(s.description, s.slug).not.toBe('');
    }
  });

  it('marks the highest TR number live and lights the newest phase', () => {
    const groups = tabs.props.groups as ReportTabGroup[];
    const numbers = groups.flatMap((g) => g.reports).map((r) => extractTRNumber(r.slug) ?? -1);
    const newestPhase = [...PHASE_DEFINITIONS].reverse().find((p) => groups.some((g) => g.key === p.key));

    expect(extractTRNumber(tabs.props.latestSlug as string)).toBe(Math.max(...numbers));
    expect(tabs.props.accentGroupKey).toBe(newestPhase?.key);
    expect(groups[0].key).toBe(newestPhase?.key);
  });

  it('reveals the findings and the conclusive list as they scroll in', () => {
    const revealed = page.filter((el) => el.type === Reveal);
    expect(revealed.filter((el) => el.props.as === 'article').length).toBeGreaterThan(0);
    expect(revealed.filter((el) => el.props.as === 'li').length).toBeGreaterThan(0);
  });
});
