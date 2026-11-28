import fs from 'node:fs';
import path from 'node:path';
import type { ViewTransitionProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportFigure } from '@/lib/reports/figures';
import type { ResolvedFigure } from '@/lib/reports/figures/types';
import { exploreSummary, exploreView, toExplorable } from '../exploreView';
import { describeFigure, ReportFigure } from '../ReportFigure';
import { ReportHero } from '../ReportHead';

// The two report figures a reader can redraw (lib/reports/figures, specs with
// `explore`): a radio group of the table's own columns over the hero plate.
// Without script the page is the report's own figure, markup for markup;
// with it, a choice redraws the chart from the same table, on the same
// scale, with the one ember datum on the same row, and a polite live region
// says what is now shown.

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    ViewTransition: ({ children }: ViewTransitionProps) => actual.createElement(actual.Fragment, null, children),
  };
});

// the page reaches the control through a lazy loader (reportExploreLazy.test
// covers it); here it renders at once, so a test can read what it draws
vi.mock('../ReportExploreLazy', async () => ({ ReportExploreLazy: (await import('../ReportExplore')).ReportExplore }));

afterEach(cleanup);

const SHOTS = 'technical-report-140';
const FORMATS = 'technical-report-134';
const figureOf = (slug: string) => reportFigure(slug)!;
const withoutChoices = (figure: ResolvedFigure): ResolvedFigure => {
  const plain = { ...figure };
  delete plain.explore;
  return plain;
};
const textOf = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
// the value texts down the right edge of a full figure, one per row
const valueTexts = (svg: Element) => [...svg.querySelectorAll('text[text-anchor="end"]')].slice(1).map(textOf);
const radios = () => screen.getAllByRole('radio') as HTMLInputElement[];
const plateSvg = (root: Element) => root.querySelector('.report-hero svg')!;

describe('without script', () => {
  it.each([SHOTS, FORMATS])("%s draws the report's own figure and caption, markup for markup", (slug) => {
    const figure = figureOf(slug);
    expect(figure.explore).toBeDefined();
    const enhanced = renderToStaticMarkup(<ReportHero slug={slug} figure={figure} />);
    const plain = renderToStaticMarkup(<ReportHero slug={slug} figure={withoutChoices(figure)} />);
    // the control and the empty live region are all the enhanced markup adds
    const control = /<fieldset class="report-explore"[\s\S]*?<\/fieldset>/.exec(enhanced)?.[0] ?? '';
    const live = '<p class="sr-only" aria-live="polite"></p>';
    expect(control).not.toBe('');
    expect(enhanced).toContain(live);
    expect(enhanced.replace(control, '').replace(live, '')).toBe(plain);
    // and the plate holds exactly the static drawing
    expect(enhanced).toContain(renderToStaticMarkup(<ReportFigure figure={withoutChoices(figure)} />));
  });

  it('hides the control until script runs, from the reading stylesheet', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'reading.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css).toMatch(/\.report-explore \{[^}]*display: none;/);
    expect(css).toMatch(/@media \(scripting: enabled\) \{\s*\.report-explore \{[^}]*display: block;/);
  });
});

describe('the control', () => {
  it("lists the table's columns as one radio group, named by its legend, opening on the report's own column", () => {
    const figure = figureOf(SHOTS);
    render(<ReportHero slug={SHOTS} figure={figure} />);
    const group = screen.getByRole('group', { name: figure.explore!.legend });
    const options = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(options.map((radio) => radio.labels?.[0]?.textContent)).toEqual(figure.explore!.options.map((option) => option.column));
    expect(options.map((radio) => radio.checked)).toEqual(figure.explore!.options.map((_, index) => index === figure.explore!.initial));
    expect(textOf(group.querySelector('legend'))).toBe('Shot count');
  });

  it('is native radios in one named group: Tab enters at the choice, arrow keys move it', () => {
    render(<ReportHero slug={FORMATS} figure={figureOf(FORMATS)} />);
    const names = new Set(radios().map((radio) => radio.name));
    expect(names.size).toBe(1);
    for (const radio of radios()) {
      expect(radio.type).toBe('radio');
      expect(radio.disabled).toBe(false);
      expect(radio.hasAttribute('tabindex')).toBe(false);
      expect(radio.closest('fieldset')?.querySelector('legend')).not.toBeNull();
    }
  });

  it('announces nothing on load, only what a choice changes', () => {
    render(<ReportHero slug={SHOTS} figure={figureOf(SHOTS)} />);
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toBe('');
    fireEvent.click(screen.getByRole('radio', { name: 'N=16' }));
    expect(live.textContent).not.toBe('');
  });
});

describe('a choice', () => {
  it('redraws the chart from the chosen column and says what it now shows', () => {
    const figure = figureOf(SHOTS);
    const { container } = render(<ReportHero slug={SHOTS} figure={figure} />);
    const n16 = figure.explore!.options.find((option) => option.column === 'N=16')!;
    fireEvent.click(screen.getByRole('radio', { name: 'N=16' }));

    const svg = plateSvg(container);
    expect(valueTexts(svg)).toEqual(n16.rows.map((row) => row.values[0]!.text));
    expect(textOf(svg.querySelector('text[text-anchor="end"]'))).toBe('N=16');
    const lit = n16.rows[figure.highlight];
    expect(textOf(container.querySelector('[aria-live="polite"]'))).toBe(`Showing N=16: ${lit.label}, ${lit.values[0]!.text}.`);
    expect(svg.querySelector('desc')?.textContent).toBe(describeFigure(exploreView(toExplorable(figure)!, 2)));
  });

  it("keeps the report figure's scale: a bar's length stays in proportion to its value", () => {
    const figure = figureOf(SHOTS);
    const { container } = render(<ReportHero slug={SHOTS} figure={figure} />);
    const litWidth = () => Number(plateSvg(container).querySelector('g.text-primary rect')!.getAttribute('width'));
    const at128 = litWidth();
    fireEvent.click(screen.getByRole('radio', { name: 'N=16' }));
    const at16 = litWidth();
    const value = (column: string) => figure.explore!.options.find((option) => option.column === column)!.rows[figure.highlight].values[0]!.value;
    expect(at16 / at128).toBeCloseTo(value('N=16') / value('N=128'), 2);
  });

  it.each([SHOTS, FORMATS])('%s lights one datum, on the same row, in every choice', (slug) => {
    const figure = figureOf(slug);
    const { container } = render(<ReportHero slug={slug} figure={figure} />);
    for (const option of figure.explore!.options) {
      fireEvent.click(screen.getByRole('radio', { name: option.column }));
      const svg = plateSvg(container);
      expect(svg.querySelectorAll('.text-primary'), option.column).toHaveLength(1);
      expect(svg.querySelector('text.text-foreground')?.textContent, option.column).toBe(figure.rows[figure.highlight].label);
    }
  });

  it("opens the next report on that report's own figure, not on the last report's choice", () => {
    const { rerender } = render(<ReportHero slug={SHOTS} figure={figureOf(SHOTS)} />);
    fireEvent.click(screen.getByRole('radio', { name: 'N=1' }));
    const formats = figureOf(FORMATS);
    rerender(<ReportHero slug={FORMATS} figure={formats} />);
    expect((screen.getByRole('radio', { name: formats.explore!.options[formats.explore!.initial].column }) as HTMLInputElement).checked).toBe(true);
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toBe('');
  });

  it('draws a cell the table leaves empty as missing, never as a zero', () => {
    const figure = figureOf(FORMATS);
    const explorable = toExplorable(figure)!;
    const choice = figure.explore!.options.findIndex((option) => option.rows.some((row) => row.values.includes(null)));
    expect(choice, 'TR134 leaves a cell empty').toBeGreaterThanOrEqual(0);
    const option = figure.explore!.options[choice];
    const empty = option.rows.findIndex((row) => row.values.includes(null));

    const { container } = render(<ReportHero slug={FORMATS} figure={figure} />);
    fireEvent.click(screen.getByRole('radio', { name: option.column }));
    const svg = plateSvg(container);
    // every other row keeps its ring, its line and its dot; the empty one only its ring
    const rows = option.rows.length;
    expect(svg.querySelectorAll('circle')).toHaveLength(2 * rows - 1);
    expect(svg.querySelectorAll('g.text-foreground path')).toHaveLength(rows - 1);
    expect(valueTexts(svg)[empty]).toBe(`${option.rows[empty].values[0]!.text} → —`);
    expect(describeFigure(exploreView(explorable, choice))).toContain(`${option.rows[empty].label}: ${option.rows[empty].values[0]!.text} → no value`);
    expect(svg.innerHTML).not.toMatch(/NaN/);
  });
});

describe('what the client is handed', () => {
  it("is the figure's choices and what every choice shares, not the report's sentence", () => {
    const explorable = toExplorable(figureOf(SHOTS))!;
    expect(Object.keys(explorable).sort()).toEqual(['chart', 'dimension', 'explore', 'highlight', 'slug', 'title']);
    expect(toExplorable(figureOf('technical-report-138'))).toBeNull();
  });

  it("composes the opening choice into the report's own figure, on its scale", () => {
    for (const slug of [SHOTS, FORMATS]) {
      const figure = figureOf(slug);
      const opening = exploreView(toExplorable(figure)!, figure.explore!.initial);
      const plain = withoutChoices(figure);
      expect(renderToStaticMarkup(<ReportFigure figure={opening} />)).toBe(renderToStaticMarkup(<ReportFigure figure={plain} />));
    }
  });

  it('words a slope choice for the live region without arrows', () => {
    const figure = figureOf(FORMATS);
    const explorable = toExplorable(figure)!;
    const option = figure.explore!.options[0];
    const lit = option.rows[figure.highlight];
    expect(exploreSummary(explorable, 0)).toBe(`Showing FP16 to ${option.column}: ${lit.label}, ${lit.values[0]!.text} to ${lit.values[1]!.text}.`);
  });
});
