import type { ReactNode, ViewTransitionProps } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readReportMarkdown, reportFigure } from '@/lib/reports/figures';
import { KEY_FINDINGS, KeyFindings } from '../KeyFindings';

// The archive's key findings are the owner's own tiles. The figure work adds
// a report's chart marks above a tile whose report has one, and changes no
// number and no word of the tile.

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ transitionTypes, children, ...props }: { transitionTypes?: string[]; children?: ReactNode }) =>
      createElement('a', { ...props, 'data-transition-types': transitionTypes?.join(' ') }, children),
  };
});

class QuietObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', QuietObserver);
});

afterEach(cleanup);

const tiles = () => [...render(<KeyFindings />).container.querySelectorAll('article')];

describe('key findings', () => {
  it("keeps the owner's ten tiles, their numbers and their sources, in order", () => {
    expect(KEY_FINDINGS.map((f) => [f.number, f.source.map((s) => s.label).join(' ')])).toEqual([
      ['100% ASR', 'TR139'],
      ['p = 0.942', 'TR141'],
      ['25pp', 'TR136'],
      ['13.9×', 'TR142'],
      ['99.4%', 'TR114'],
      ['+74%', 'TR131'],
      ['2.25×', 'TR130 TR132'],
      ['Q4_K_M', 'TR125'],
      ['NULL', 'TR145'],
      ['κ = 0.69', 'TR148'],
    ]);
  });

  // 2.25× sat on TR132 alone, which never states it: it is TR130's number
  it('cites, first, a report that states the decimal a tile leads with', () => {
    const decimals = KEY_FINDINGS.flatMap((f) => {
      const decimal = /\d+\.\d+/.exec(f.number)?.[0];
      return decimal ? [{ decimal, slug: f.source[0].slug }] : [];
    });
    expect(decimals.map((d) => d.decimal)).toEqual(['0.942', '13.9', '99.4', '2.25', '0.69']);
    for (const { decimal, slug } of decimals) {
      // a boolean, so a miss does not print the whole report
      expect(readReportMarkdown(slug)?.includes(decimal), `${slug} states ${decimal}`).toBe(true);
    }
  });

  it('prints each tile exactly as written', () => {
    tiles().forEach((tile, index) => {
      const finding = KEY_FINDINGS[index];
      expect(tile.querySelector('.font-mono')?.textContent).toBe(finding.number);
      expect(tile.querySelector('p')?.textContent).toBe(finding.finding);
      expect([...tile.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual(
        finding.source.map((s) => [s.label, `/reports/${s.slug}`]),
      );
    });
  });

  it("opens a tile on its report's chart marks where the report has a figure, with no numbers of the chart's own", () => {
    const rendered = tiles();
    expect(rendered).toHaveLength(KEY_FINDINGS.length);
    rendered.forEach((tile, index) => {
      const slug = KEY_FINDINGS[index].source[0].slug;
      const svg = tile.querySelector('svg');
      if (!reportFigure(slug)) {
        expect(svg, slug).toBeNull();
        return;
      }
      expect(svg?.getAttribute('viewBox'), slug).toBe('0 0 320 90');
      expect(svg?.querySelector('text'), slug).toBeNull();
      expect(svg?.querySelector('desc'), slug).toBeNull();
      // the marks come before the owner's number
      expect(svg!.compareDocumentPosition(tile.querySelector('.font-mono')!) & Node.DOCUMENT_POSITION_FOLLOWING, slug).toBeTruthy();
    });
  });
});
