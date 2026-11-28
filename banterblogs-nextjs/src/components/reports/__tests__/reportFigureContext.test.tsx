import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { FigureData } from '../ReportFigure';
import { ReportCardVisual, ReportFigureProvider } from '../ReportFigureContext';

// The archive's cards are client components inside another agent's tabs, so
// the server page resolves the figures and hands them down as plain data; a
// card draws its report's figure where there is one and the seeded visual
// everywhere else.

const FIGURE: FigureData = {
  slug: 'technical-report-139',
  chart: 'bar',
  title: '4.6 Highest-risk cells',
  dimension: 'Model',
  measure: 'ASR',
  rows: [
    { label: 'small', values: [{ value: 100, text: '100%' }] },
    { label: 'large', values: [{ value: 25, text: '25%' }] },
  ],
  highlight: 0,
};

afterEach(cleanup);

describe('report card visual', () => {
  it("draws the report's figure from the provider, without its data description", () => {
    const { container } = render(
      <ReportFigureProvider figures={{ [FIGURE.slug]: FIGURE }}>
        <ReportCardVisual slug={FIGURE.slug} />
      </ReportFigureProvider>,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('data-figure')).toBe('bar');
    expect(svg.getAttribute('viewBox')).toBe('0 0 320 180');
    expect(svg.querySelector('title')?.textContent).toBe('4.6 Highest-risk cells: ASR, by Model');
    expect(svg.querySelector('desc')).toBeNull();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('falls back to the seeded visual for a report the provider has no figure for, keeping its accent', () => {
    const { container } = render(
      <ReportFigureProvider figures={{ [FIGURE.slug]: FIGURE }}>
        <ReportCardVisual slug="technical-report-109" accent />
      </ReportFigureProvider>,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.hasAttribute('data-family')).toBe(true);
    expect(svg.hasAttribute('data-figure')).toBe(false);
    expect(svg.getAttribute('data-accent')).toBe('on');
  });

  it('falls back everywhere outside a provider', () => {
    const { container } = render(<ReportCardVisual slug={FIGURE.slug} />);
    expect(container.querySelector('svg')?.hasAttribute('data-family')).toBe(true);
  });
});
