// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readReportMarkdown, reportFigureThumbnails, resolveSpec } from '../index';
import { extractTables, FigureSpecError, LABEL_JOIN, MAX_OPTIONS, parseNumber, resolveFigure } from '../resolve';
import { figureDomain } from '../scale';
import { FIGURE_SPECS } from '../specs';
import type { BarFigureSpec, FigureSpec, SlopeFigureSpec } from '../types';

// A figure the reader redraws: the spec names some of its table's columns,
// and every choice is resolved from that same table at build time. The page
// opens on the report's own figure, every choice shares its scale, and a cell
// the table leaves empty is missing, never a number.

const REPORT = `# Technical Report 901: An Explorable Fixture

## Summary

Refusal falls from 90.0% to 20.0% under GPTQ.
At N=128 the Q2_K cell reaches 99.0%.

### 5.1 Refusal by format

| Model | FP16 | Q4_K_M | AWQ | GPTQ | Notes |
|---|---|---|---|---|---|
| small | 90.0% | 88.0% | 30.0% | **20.0%** | cliff |
| medium | 80.0% | 79.0% | -- | 40.0% | no AWQ run |
| large | 70.0% | 69.5% | 60.0% | 55.0% | holds |

### Table 4: shots

| Quant | BPW | N=1 | N=16 | N=128 |
|---|---|---|---|---|
| Q8_0 | 8.00 | 2.0% | 4.0% | 40.0% |
| Q4_K_M | 4.85 | 9.0% | 2.0% | 45.0% |
| Q2_K | 3.35 | 85.0% | 65.0% | **99.0%** |
`;

const SHOTS: BarFigureSpec = {
  slug: 'technical-report-901',
  chart: 'bar',
  table: { heading: 'Table 4: shots' },
  label: 'Quant',
  value: 'N=128',
  highlight: 'Q2_K',
  claim: 'At N=128 the Q2_K cell reaches 99.0%.',
  explore: { legend: 'Shot count', columns: ['N=1', 'N=16', 'N=128'] },
};

const FORMATS: SlopeFigureSpec = {
  slug: 'technical-report-901',
  chart: 'slope',
  table: { heading: '5.1 Refusal by format' },
  label: 'Model',
  from: 'FP16',
  to: 'GPTQ',
  highlight: 'small',
  claim: 'Refusal falls from 90.0% to 20.0% under GPTQ.',
  explore: { legend: 'Compare FP16 with', columns: ['Q4_K_M', 'AWQ', 'GPTQ'] },
};

const failure = (spec: FigureSpec, markdown = REPORT): string => {
  try {
    resolveFigure(spec, markdown);
  } catch (error) {
    expect(error).toBeInstanceOf(FigureSpecError);
    return (error as Error).message;
  }
  throw new Error('resolved without an error');
};
const texts = (rows: Array<{ values: Array<{ text: string } | null> }>) => rows.map((row) => row.values.map((value) => value?.text ?? null));

describe('a figure the reader redraws', () => {
  it('offers each listed column as a choice, every value read from that column of the table', () => {
    const { explore } = resolveFigure(SHOTS, REPORT);
    expect(explore?.legend).toBe('Shot count');
    expect(explore?.options.map((option) => [option.column, option.measure])).toEqual([
      ['N=1', 'N=1'],
      ['N=16', 'N=16'],
      ['N=128', 'N=128'],
    ]);
    expect(explore?.options.map((option) => option.rows.map((row) => row.label))).toEqual(Array(3).fill(['Q8_0', 'Q4_K_M', 'Q2_K']));
    expect(texts(explore!.options[0].rows)).toEqual([['2.0%'], ['9.0%'], ['85.0%']]);
    expect(texts(explore!.options[1].rows)).toEqual([['4.0%'], ['2.0%'], ['65.0%']]);
    expect(explore!.options[1].rows[2].values[0]?.value).toBe(65);
  });

  it("opens on the figure's own column, number for number what the report's figure draws", () => {
    const figure = resolveFigure(SHOTS, REPORT);
    const { explore } = figure;
    expect(explore?.initial).toBe(2);
    expect(explore?.options[2].rows).toEqual(figure.rows);
    expect(explore?.options[2].measure).toBe(figure.measure);
  });

  it("runs a slope's choices from the same first column to each listed column", () => {
    const figure = resolveFigure(FORMATS, REPORT);
    const { explore } = figure;
    expect(explore?.options.map((option) => option.series)).toEqual([
      ['FP16', 'Q4_K_M'],
      ['FP16', 'AWQ'],
      ['FP16', 'GPTQ'],
    ]);
    expect(explore?.options.map((option) => option.measure)).toEqual(['FP16 → Q4_K_M', 'FP16 → AWQ', 'FP16 → GPTQ']);
    expect(texts(explore!.options[0].rows)).toEqual([
      ['90.0%', '88.0%'],
      ['80.0%', '79.0%'],
      ['70.0%', '69.5%'],
    ]);
    expect(explore?.initial).toBe(2);
    expect(explore?.options[2].rows).toEqual(figure.rows);
    expect(explore?.options[2].series).toEqual(figure.series);
  });

  it('reads a cell the table marks as empty as missing, never as a number', () => {
    const awq = resolveFigure(FORMATS, REPORT).explore!.options[1];
    expect(texts(awq.rows)).toEqual([
      ['90.0%', '30.0%'],
      ['80.0%', null],
      ['70.0%', '60.0%'],
    ]);
    // an em dash is the same mark
    const dashed = resolveFigure(FORMATS, REPORT.replace('| medium | 80.0% | 79.0% | -- |', '| medium | 80.0% | 79.0% | — |')).explore!.options[1];
    expect(dashed.rows[1].values[1]).toBeNull();
  });

  it("keeps every choice inside the report figure's own scale, so a switch never rescales", () => {
    for (const spec of [SHOTS, FORMATS]) {
      const figure = resolveFigure(spec, REPORT);
      const [lo, hi] = figureDomain(figure.chart, figure.rows);
      for (const option of figure.explore!.options) {
        const [optionLo, optionHi] = figureDomain(figure.chart, option.rows);
        expect(optionLo, option.column).toBeGreaterThanOrEqual(lo);
        expect(optionHi, option.column).toBeLessThanOrEqual(hi);
      }
    }
    expect(figureDomain('bar', resolveFigure(SHOTS, REPORT).rows)).toEqual([0, 99]);
  });

  it('leaves a figure without choices as it was', () => {
    const { explore: _explore, ...spec } = SHOTS;
    expect(resolveFigure(spec, REPORT)).not.toHaveProperty('explore');
  });
});

describe('a choice the table no longer supports fails loudly', () => {
  it('names a column the table does not have', () => {
    expect(failure({ ...SHOTS, explore: { legend: 'Shot count', columns: ['N=1', 'N=64', 'N=128'] } })).toMatch(/no column "N=64"/);
  });

  it("refuses a list of choices without the figure's own column", () => {
    expect(failure({ ...SHOTS, explore: { legend: 'Shot count', columns: ['N=1', 'N=16'] } })).toMatch(/"N=128"/);
  });

  it('refuses a column listed twice', () => {
    expect(failure({ ...SHOTS, explore: { legend: 'Shot count', columns: ['N=1', 'N=1', 'N=128'] } })).toMatch(/twice/);
  });

  it('refuses fewer than two choices, or more than one line of the control holds', () => {
    expect(failure({ ...SHOTS, explore: { legend: 'Shot count', columns: ['N=128'] } })).toMatch(/choices/);
    const many = Array.from({ length: MAX_OPTIONS + 1 }, (_, index) => `C${index}`);
    expect(failure({ ...SHOTS, explore: { legend: 'Shot count', columns: [...many, 'N=128'] } })).toMatch(/choices/);
  });

  it('refuses a slope choice that runs from its own first column', () => {
    expect(failure({ ...FORMATS, explore: { legend: 'Compare FP16 with', columns: ['FP16', 'GPTQ'] } })).toMatch(/"FP16"/);
  });

  it('refuses a cell that is neither a number nor a mark of a missing value', () => {
    expect(failure({ ...FORMATS, explore: { legend: 'Compare FP16 with', columns: ['Notes', 'GPTQ'] } })).toMatch(/no number in "cliff"/);
  });

  it('refuses a column with fewer than two numbers in the rows drawn', () => {
    const sparse = REPORT.replace('| small | 90.0% | 88.0% | 30.0% |', '| small | 90.0% | 88.0% | -- |');
    expect(failure(FORMATS, sparse)).toMatch(/"AWQ" has 1 number/);
  });

  it("refuses a column that reaches outside the report figure's scale", () => {
    expect(failure(SHOTS, REPORT.replace('| Q2_K | 3.35 | 85.0% |', '| Q2_K | 3.35 | 120.0% |'))).toMatch(/"N=1" reaches outside/);
    expect(failure(FORMATS, REPORT.replace('| small | 90.0% | 88.0% | 30.0% |', '| small | 90.0% | 88.0% | 5.0% |'))).toMatch(/"AWQ" reaches outside/);
  });

  it("keeps the report's own column whole: a missing cell there is still an error", () => {
    expect(failure({ ...FORMATS, to: 'AWQ', highlight: 'small', claim: 'Refusal falls from 90.0% to 20.0% under GPTQ.' })).toMatch(/no number in "--"/);
  });
});

// The specs that offer choices, run against the reports on disk.
const EXPLORABLE = FIGURE_SPECS.filter((spec): spec is BarFigureSpec | SlopeFigureSpec => (spec.chart === 'bar' || spec.chart === 'slope') && Boolean(spec.explore));
const MISSING_MARK = /^(?:--|—|–|-|n\/a)$/i;

describe('the explorable report figures', () => {
  it('are TR134 and TR140, the two whose headline table has a second dimension worth switching', () => {
    expect(EXPLORABLE.map((spec) => spec.slug).sort()).toEqual(['technical-report-134', 'technical-report-140']);
  });

  it.each(EXPLORABLE.map((spec) => [spec.slug, spec] as const))('%s: every choice is a column of its own table, cell for cell', (_slug, spec) => {
    const figure = resolveSpec(spec);
    const markdown = readReportMarkdown(spec.slug)!;
    const table = extractTables(markdown).filter((candidate) => candidate.heading === spec.table.heading)[spec.table.nth ?? 0];
    const labelAt = [spec.label].flat().map((name) => table.columns.indexOf(name));
    const rowOf = (label: string) => table.rows.find((row) => labelAt.map((at) => row[at]).join(LABEL_JOIN) === label)!;
    const explore = figure.explore!;

    expect(explore.options.map((option) => option.column)).toEqual(spec.explore!.columns);
    for (const option of explore.options) {
      expect(option.rows.map((row) => row.label)).toEqual(figure.rows.map((row) => row.label));
      const at = table.columns.indexOf(option.column);
      expect(at, option.column).toBeGreaterThanOrEqual(0);
      for (const row of option.rows) {
        const cell = rowOf(row.label)[at];
        const drawn = row.values.at(-1);
        if (drawn === null) expect(cell, `${row.label} · ${option.column}`).toMatch(MISSING_MARK);
        else expect(drawn, `${row.label} · ${option.column}`).toEqual({ value: parseNumber(cell)!.value, text: parseNumber(cell)!.text });
      }
    }
    // the page opens on the report's own figure, and every choice fits its scale
    expect(explore.options[explore.initial].rows).toEqual(figure.rows);
    expect(explore.options[explore.initial].measure).toBe(figure.measure);
    const [lo, hi] = figureDomain(figure.chart, figure.rows);
    for (const option of explore.options) {
      const [optionLo, optionHi] = figureDomain(figure.chart, option.rows);
      expect(optionLo, option.column).toBeGreaterThanOrEqual(lo);
      expect(optionHi, option.column).toBeLessThanOrEqual(hi);
    }
  });

  it.each(EXPLORABLE.map((spec) => [spec.slug, spec] as const))('%s fails loudly when a sync renames a choice or empties one of its cells', (_slug, spec) => {
    const markdown = readReportMarkdown(spec.slug)!;
    const table = extractTables(markdown).filter((candidate) => candidate.heading === spec.table.heading)[spec.table.nth ?? 0];
    const lines = markdown.split(/\r?\n/);
    const own = spec.chart === 'bar' ? spec.value : spec.to;
    const other = spec.explore!.columns.find((name) => name !== own)!;
    const at = table.columns.indexOf(other);

    // the header row renames the choice's column
    const renamed = [...lines];
    renamed[table.line - 1] = renamed[table.line - 1].replace(`| ${other} |`, `| ${other} (revised) |`);
    expect(renamed[table.line - 1]).not.toBe(lines[table.line - 1]);
    expect(() => resolveFigure(spec, renamed.join('\n'))).toThrow(new RegExp(`no column "${other.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));

    // a cell of the choice's column turns to words
    const emptied = [...lines];
    const first = table.line + 1;
    const cells = emptied[first].split('|');
    // a row's cells sit one past the leading pipe
    cells[at + 1] = ' pending ';
    emptied[first] = cells.join('|');
    expect(() => resolveFigure(spec, emptied.join('\n'))).toThrow(/no number in "pending"/);
  });

  it('keeps the choices off the archive thumbnails, which only draw the figure', () => {
    const thumbnails = reportFigureThumbnails();
    for (const spec of EXPLORABLE) expect(thumbnails[spec.slug], spec.slug).not.toHaveProperty('explore');
  });
});
