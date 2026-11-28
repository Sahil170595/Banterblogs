// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { reportFigure, toThumbnail } from '@/lib/reports/figures';
import { FIGURE_SPECS } from '@/lib/reports/figures/specs';
import type { ResolvedFigure } from '@/lib/reports/figures/types';
import { describeFigure, figureHeadline, fitsCard, MAX_FIGURE_BYTES, ReportFigure } from '../ReportFigure';

// The chart vocabulary: bar, dot with interval, line, and a before/after pair
// laid flat. Server-rendered SVG, monochrome, with one ember datum. What is
// asserted is that the geometry is the data.

const BAR: ResolvedFigure = {
  slug: 'fixture',
  chart: 'bar',
  title: '4.6 Highest-risk cells',
  dimension: 'Model',
  measure: 'ASR',
  rows: [
    { label: 'small', values: [{ value: 100, text: '100%' }] },
    { label: 'medium', values: [{ value: 50, text: '50%' }] },
    { label: 'large', values: [{ value: 25, text: '25%' }] },
  ],
  highlight: 0,
  claim: 'The small model reaches 100% ASR.',
};
const SIGNED: ResolvedFigure = {
  ...BAR,
  measure: 'Refusal vs FP16',
  rows: [
    { label: 'gptq', values: [{ value: -60, text: '-60pp' }] },
    { label: 'q8', values: [{ value: 20, text: '+20pp' }] },
  ],
};
const DOT: ResolvedFigure = {
  ...BAR,
  chart: 'dot',
  measure: 'Slope per BPW',
  rows: [
    { label: 'a', values: [{ value: -0.2, text: '-0.20' }], low: -0.3, high: -0.1 },
    { label: 'b', values: [{ value: 0.1, text: '0.10' }], low: -0.1, high: 0.3 },
  ],
};
const LINE: ResolvedFigure = {
  ...BAR,
  chart: 'line',
  dimension: 'N',
  measure: 'median',
  series: ['median', 'mean'],
  lit: 0,
  highlight: 1,
  rows: [
    { label: '1', values: [{ value: 1, text: '1.000' }, { value: 1, text: '1.000' }] },
    { label: '2', values: [{ value: 0.5, text: '0.500' }, { value: 0.6, text: '0.600' }] },
    { label: '4', values: [{ value: 0.25, text: '0.250' }, { value: 0.3, text: '0.300' }] },
  ],
};
const SLOPE: ResolvedFigure = {
  ...BAR,
  chart: 'slope',
  measure: 'FP16 → GPTQ',
  series: ['FP16', 'GPTQ'],
  rows: [
    { label: 'a', values: [{ value: 90, text: '90%' }, { value: 30, text: '30%' }] },
    { label: 'b', values: [{ value: 80, text: '80%' }, { value: 60, text: '60%' }] },
  ],
};

const draw = (figure: ResolvedFigure, props: Partial<Parameters<typeof ReportFigure>[0]> = {}) => renderToStaticMarkup(<ReportFigure figure={figure} {...props} />);
// NaN for a tag that is not there, so a missing mark fails its comparison
const attr = (tag: string | undefined, name: string) => Number(new RegExp(`\\s${name}="([^"]+)"`).exec(tag ?? '')?.[1]);
const tags = (svg: string, name: string) => svg.match(new RegExp(`<${name}\\b[^>]*>`, 'g')) ?? [];
const marks = (svg: string) => tags(svg, 'rect');
const lit = (svg: string) => /<g class="text-primary"[^>]*>(.*?)<\/g>/.exec(svg)?.[1] ?? '';

describe('report figure', () => {
  it('draws one bar per row, its length in proportion to the value', () => {
    const bars = marks(draw(BAR));
    expect(bars).toHaveLength(3);
    const widths = bars.map((bar) => attr(bar, 'width'));
    expect(widths[1] / widths[0]).toBeCloseTo(0.5, 2);
    expect(widths[2] / widths[0]).toBeCloseTo(0.25, 2);
    // every bar starts on the same zero line
    expect(new Set(bars.map((bar) => attr(bar, 'x'))).size).toBe(1);
  });

  it('draws a negative bar to the left of zero and a positive one to the right', () => {
    const [negative, positive] = marks(draw(SIGNED));
    const zero = attr(positive, 'x');
    expect(attr(negative, 'x') + attr(negative, 'width')).toBeCloseTo(zero, 1);
    expect(attr(negative, 'width') / attr(positive, 'width')).toBeCloseTo(3, 1);
  });

  it('lights exactly one datum in ember: the highlighted row', () => {
    for (const figure of [BAR, SIGNED, DOT, LINE, SLOPE]) {
      const svg = draw(figure);
      expect(svg.match(/class="text-primary"/g), figure.chart).toHaveLength(1);
      expect(lit(svg), figure.chart).not.toBe('');
      expect(svg).toContain('data-accent="on"');
    }
    // the ember bar is the first row's, the longest
    expect(attr(lit(draw(BAR)), 'width')).toBe(Math.max(...marks(draw(BAR)).map((bar) => attr(bar, 'width'))));
  });

  it('draws an estimate as a dot on its interval, on one scale for every row', () => {
    const svg = draw(DOT);
    const dots = tags(svg, 'circle').map((dot) => attr(dot, 'cx'));
    expect(dots).toHaveLength(2);
    expect(dots[0]).toBeLessThan(dots[1]);
    // whiskers: "M<low> <y>H<high>"
    const whiskers = [...svg.matchAll(/d="M([\d.]+) [\d.]+H([\d.]+)"/g)].map(([, from, to]) => [Number(from), Number(to)]);
    const spans = whiskers.filter(([from, to]) => to - from < 250);
    expect(spans).toHaveLength(2);
    spans.forEach(([low, high], index) => {
      expect(low).toBeLessThan(dots[index]);
      expect(high).toBeGreaterThan(dots[index]);
    });
    // an interval twice as wide (0.4 against 0.2) draws twice as long
    expect((spans[1][1] - spans[1][0]) / (spans[0][1] - spans[0][0])).toBeCloseTo(2, 1);
  });

  it('draws one line per series over the rows, and marks the highlighted point', () => {
    const svg = draw(LINE);
    const lines = tags(svg, 'polyline');
    expect(lines).toHaveLength(2);
    const points = /points="([^"]+)"/.exec(lines[lines.length - 1])![1].split(' ').map((point) => point.split(',').map(Number));
    expect(points).toHaveLength(3);
    // x steps evenly; y falls as the value falls (SVG y grows downward)
    expect(points[1][0] - points[0][0]).toBeCloseTo(points[2][0] - points[1][0], 1);
    expect(points[0][1]).toBeLessThan(points[1][1]);
    expect(points[1][1]).toBeLessThan(points[2][1]);
    const point = tags(lit(svg), 'circle')[0];
    expect([attr(point, 'cx'), attr(point, 'cy')]).toEqual(points[1]);
  });

  it('draws a before/after pair as two ends of one scale', () => {
    const svg = draw(SLOPE);
    const ends = tags(svg, 'circle').map((dot) => attr(dot, 'cx'));
    expect(ends).toHaveLength(4);
    const [aFrom, aTo, bFrom, bTo] = ends;
    expect(aTo).toBeLessThan(aFrom);
    expect((aFrom - aTo) / (bFrom - bTo)).toBeCloseTo(3, 1);
  });

  it('prints the labels and the numbers as the report prints them', () => {
    const svg = draw(BAR);
    for (const text of ['small', 'medium', 'large', '100%', '50%', '25%', 'Model', 'ASR']) expect(svg).toContain(`>${text}<`);
    expect(draw(SLOPE)).toContain('>90% → 30%<');
  });

  it('draws the mini variant as marks alone', () => {
    const svg = draw(BAR, { variant: 'mini' });
    expect(svg).toContain('viewBox="0 0 320 90"');
    expect(svg).not.toMatch(/<text\b/);
    expect(marks(svg)).toHaveLength(3);
  });

  it('keeps a mini a chart, not a placeholder: bars on their zero line, thin even when there are only two', () => {
    // signed bars meet at a zero inside the frame; all-positive ones at its left edge
    for (const svg of [draw(SIGNED, { variant: 'mini' }), draw(BAR, { variant: 'mini' })]) {
      const zero = Math.max(...marks(svg).map((bar) => attr(bar, 'x')));
      expect(svg).toMatch(new RegExp(`<path class="l" d="M${zero} [\\d.]+V[\\d.]+"`));
      for (const bar of marks(svg)) expect(attr(bar, 'height')).toBeLessThanOrEqual(5);
    }
  });

  it('fits a card only when every label it prints stays whole', () => {
    expect(fitsCard(BAR)).toBe(true);
    const long = 'a-label-long-enough-that-no-card-line-could-ever-hold-it-whole';
    const cut = { ...BAR, rows: [{ ...BAR.rows[0], label: long }, ...BAR.rows.slice(1)] };
    expect(fitsCard(cut)).toBe(false);
    expect(draw(cut)).toContain('…');
    expect(fitsCard({ ...BAR, measure: long })).toBe(false);
    // a header a little too long for the line is set smaller, not cut
    const header = 'Mean (ms) → Mean excluding first sample per run-file (ms)';
    expect(fitsCard({ ...BAR, measure: header })).toBe(true);
    expect(draw({ ...BAR, measure: header })).toMatch(new RegExp(`font-size="[\\d.]+"[^>]*>${header.replace(/[()]/g, '\\$&')}<`));
    expect(fitsCard({ ...LINE, rows: LINE.rows.map((row) => ({ ...row, label: `${row.label} agents in flight` })) })).toBe(false);
  });

  it('drops the header naming the rows, rather than cutting it, when the measure needs the line', () => {
    const measure = 'Mean parallel efficiency at N=32, both backends';
    const svg = draw({ ...BAR, dimension: 'Model · Quant · Strategy', measure });
    expect(svg).toContain(`>${measure}<`);
    expect(svg).not.toContain('>Model');
    expect(fitsCard({ ...BAR, dimension: 'Model · Quant · Strategy', measure })).toBe(true);
    // with room, both stand
    expect(draw(BAR)).toContain('>Model<');
  });

  it('is an image with a name and a text alternative that carries every number', () => {
    const svg = draw(DOT);
    expect(svg).toMatch(/^<svg[^>]*\brole="img"/);
    expect(svg).toContain('<title>4.6 Highest-risk cells: Slope per BPW, by Model</title>');
    expect(svg).toContain(`<desc>${describeFigure(DOT)}</desc>`);
    expect(describeFigure(DOT)).toBe('a: -0.20 [-0.3, -0.1]; b: 0.10 [-0.1, 0.3]. Highlighted: a.');
    expect(describeFigure(SLOPE)).toBe('a: 90% → 30%; b: 80% → 60%. Highlighted: a.');
    expect(describeFigure(LINE)).toBe('1: median 1.000, mean 1.000; 2: median 0.500, mean 0.600; 4: median 0.250, mean 0.300. Highlighted: 2 (median).');
    // a card names its figure; the report page describes it
    expect(draw(DOT, { describe: false })).not.toContain('<desc>');
  });

  it('names the highlighted number for a caption or a tile', () => {
    expect(figureHeadline(BAR)).toEqual({ value: '100%', label: 'small', measure: 'ASR' });
    expect(figureHeadline(SLOPE)).toEqual({ value: '90% → 30%', label: 'a', measure: 'FP16 → GPTQ' });
    expect(figureHeadline(LINE)).toEqual({ value: '0.500', label: '2', measure: 'median' });
  });
});

describe('every report figure on disk', () => {
  const figures = FIGURE_SPECS.map((spec) => reportFigure(spec.slug)!);

  it.each(figures.map((figure) => [figure.slug, figure] as const))('%s draws small, the same every time, with finite geometry and no ids', (_slug, figure) => {
    for (const variant of ['full', 'mini'] as const) {
      const svg = draw(figure, { variant, describe: false });
      expect(svg).toBe(draw(figure, { variant, describe: false }));
      expect(svg.length, variant).toBeLessThanOrEqual(MAX_FIGURE_BYTES[variant]);
      expect(svg, variant).not.toMatch(/NaN|Infinity|undefined|\sid="|<(image|script|use|foreignObject)\b/);
      expect(svg.match(/class="text-primary"/g), variant).toHaveLength(1);
      // dash patterns coarse enough to rasterize cheaply as a row of cards scrolls in
      for (const [, dashes] of svg.matchAll(/stroke-dasharray="([^"]+)"/g)) {
        expect(dashes.split(/[\s,]+/).map(Number).reduce((sum, part) => sum + part, 0)).toBeGreaterThanOrEqual(4);
      }
      // nothing is drawn outside the frame
      for (const [, x] of svg.matchAll(/\s(?:x|cx)="([-\d.]+)"/g)) {
        expect(Number(x), `${variant} x`).toBeGreaterThanOrEqual(0);
        expect(Number(x), `${variant} x`).toBeLessThanOrEqual(320);
      }
    }
    // a thumbnail (no caption sentence) draws the same picture
    expect(renderToStaticMarkup(<ReportFigure figure={toThumbnail(figure)} describe={false} />)).toBe(draw(figure, { describe: false }));
  });
});
