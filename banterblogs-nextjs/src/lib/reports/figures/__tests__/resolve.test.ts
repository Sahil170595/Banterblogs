// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { extractTables, FigureSpecError, numbersIn, parseInterval, parseNumber, plainText, resolveFigure } from '../resolve';
import type { FigureSpec } from '../types';

// The figure pipeline's core: a spec points at a table in a report's own
// markdown, and every number drawn is parsed out of that table. Anything the
// spec names that the markdown no longer has is an error, never a silent gap.

const REPORT = `# Technical Report 900: A Fixture

## Executive Summary

The worst cell reaches **100% ASR** on \`small-model\` at \`Q2_K\`, while the largest model holds at 2%.
Persistence falls fastest in \`small-model\` (\`slope = -0.198\` per BPW, CI \`[-0.305, -0.144]\`).
Safety moved from 91.2% to 66.0% between backends.

## 4. Results

### 4.6 Highest-risk cells

| Model | Quant | ASR |
|-------|-------|----:|
| \`small-model\` | \`Q2_K\` | **100%** |
| \`small-model\` | \`Q4_K_M\` | 41.5% |
| \`large-model\` | \`Q2_K\` | 2% |

A second table under the same heading:

| Model | Slope per BPW | Bootstrap CI |
|---|---|---|
| \`small-model\` | -0.1980 | \`[-0.3054, -0.1442]\` |
| \`large-model\` | 0.0160 | \`[-0.0080, 0.0641]\` |

### 4.7 Backends

| Backend | Safety (Q8) | Safety (Q2) | Notes |
|---|---|---|---|
| Ollama | 91.2% | 66.0% | drops |
| vLLM | 90.1% | 88.4% | holds |

\`\`\`
| Not | A table |
|-----|---------|
| 1   | 2       |
\`\`\`

### 4.8 Sweep

| N | Throughput (tok/s) | Efficiency |
|---|---|---|
| 1 | 1,204.5 | 100% |
| 2 | 1,800 | 74.7% |
| 4 | 2,710.1 | 56.2% |
`;

const BAR: FigureSpec = {
  slug: 'technical-report-900',
  chart: 'bar',
  table: { heading: '4.6 Highest-risk cells' },
  label: ['Model', 'Quant'],
  value: 'ASR',
  highlight: 'small-model · Q2_K',
  claim: 'The worst cell reaches **100% ASR** on `small-model` at `Q2_K`, while the largest model holds at 2%.',
};

const failure = (spec: FigureSpec, markdown = REPORT): string => {
  try {
    resolveFigure(spec, markdown);
  } catch (error) {
    expect(error).toBeInstanceOf(FigureSpecError);
    return (error as Error).message;
  }
  throw new Error('expected the spec to fail');
};

describe('markdown tables', () => {
  it('finds every pipe table under its nearest heading, skipping fenced code', () => {
    const tables = extractTables(REPORT);
    expect(tables.map((t) => [t.heading, t.nth])).toEqual([
      ['4.6 Highest-risk cells', 0],
      ['4.6 Highest-risk cells', 1],
      ['4.7 Backends', 0],
      ['4.8 Sweep', 0],
    ]);
    expect(tables[0].columns).toEqual(['Model', 'Quant', 'ASR']);
    expect(tables[0].rows[0]).toEqual(['small-model', 'Q2_K', '100%']);
  });

  it('reads cells as plain text: emphasis, code, links and escaped pipes', () => {
    expect(plainText('**`Q4_K_M`** ([TR125](/reports/technical-report-125))')).toBe('Q4_K_M (TR125)');
    expect(extractTables('## H\n\n| A | B |\n|---|---|\n| x \\| y | 2 |\n')[0].rows[0]).toEqual(['x | y', '2']);
  });
});

describe('numbers in cells', () => {
  it.each([
    ['100%', 100, '100%'],
    ['**41.5%**', 41.5, '41.5%'],
    ['-0.1980', -0.198, '-0.1980'],
    ['−25.1pp', -25.1, '−25.1pp'],
    ['1,204.5', 1204.5, '1,204.5'],
    ['2.25x', 2.25, '2.25×'],
    ['13.9× faster', 13.9, '13.9×'],
    ['< 1e-4', 0.0001, '< 1e-4'],
    ['+74%', 74, '+74%'],
    ['99.4% (dual)', 99.4, '99.4%'],
    ['~3.2 ms', 3.2, '~3.2 ms'],
  ])('parses %s', (cell, value, text) => {
    const parsed = parseNumber(plainText(cell));
    expect(parsed?.value).toBeCloseTo(value, 10);
    expect(parsed?.text).toBe(text);
  });

  it('finds no number in a cell without one', () => {
    expect(parseNumber('n/a')).toBeNull();
    expect(parseNumber('Q4_K_M')).toBeNull();
    expect(parseNumber('—')).toBeNull();
  });

  it('reads an interval cell', () => {
    expect(parseInterval('[-0.3054, -0.1442]')).toEqual([-0.3054, -0.1442]);
    expect(parseInterval('0.61 to 0.77')).toEqual([0.61, 0.77]);
    expect(parseInterval('95% CI [1.2, 3.4]')).toEqual([1.2, 3.4]);
    expect(parseInterval('0.5')).toBeNull();
  });

  it('lists the numbers a sentence states', () => {
    expect(numbersIn('falls 10-68pp at `Q2_K` (p = 0.942), 1,463,977 rows').map((n) => n.value)).toEqual([10, 68, 0.942, 1463977]);
  });
});

describe('resolving a spec', () => {
  it('draws a bar chart from the table the spec points at', () => {
    const figure = resolveFigure(BAR, REPORT);
    expect(figure).toMatchObject({
      slug: 'technical-report-900',
      chart: 'bar',
      title: '4.6 Highest-risk cells',
      dimension: 'Model · Quant',
      measure: 'ASR',
      highlight: 0,
      claim: 'The worst cell reaches 100% ASR on small-model at Q2_K, while the largest model holds at 2%.',
    });
    expect(figure.rows).toEqual([
      { label: 'small-model · Q2_K', values: [{ value: 100, text: '100%' }] },
      { label: 'small-model · Q4_K_M', values: [{ value: 41.5, text: '41.5%' }] },
      { label: 'large-model · Q2_K', values: [{ value: 2, text: '2%' }] },
    ]);
  });

  it('keeps only the rows a spec lists, in the order it lists them', () => {
    const figure = resolveFigure({ ...BAR, rows: ['large-model · Q2_K', 'small-model · Q2_K'] }, REPORT);
    expect(figure.rows.map((row) => row.label)).toEqual(['large-model · Q2_K', 'small-model · Q2_K']);
    expect(figure.highlight).toBe(1);
  });

  it('draws an estimate with its interval, from the second table under a heading', () => {
    const figure = resolveFigure(
      {
        slug: 'technical-report-900',
        chart: 'dot',
        table: { heading: '4.6 Highest-risk cells', nth: 1 },
        label: 'Model',
        value: 'Slope per BPW',
        interval: 'Bootstrap CI',
        highlight: 'small-model',
        claim: 'Persistence falls fastest in `small-model` (`slope = -0.198` per BPW, CI `[-0.305, -0.144]`).',
      },
      REPORT,
    );
    expect(figure.rows[0]).toEqual({ label: 'small-model', values: [{ value: -0.198, text: '-0.1980' }], low: -0.3054, high: -0.1442 });
    expect(figure.measure).toBe('Slope per BPW');
  });

  it('draws a slope between two columns', () => {
    const figure = resolveFigure(
      {
        slug: 'technical-report-900',
        chart: 'slope',
        table: { heading: '4.7 Backends' },
        label: 'Backend',
        from: 'Safety (Q8)',
        to: 'Safety (Q2)',
        highlight: 'Ollama',
        claim: 'Safety moved from 91.2% to 66.0% between backends.',
      },
      REPORT,
    );
    expect(figure.series).toEqual(['Safety (Q8)', 'Safety (Q2)']);
    expect(figure.rows[0].values.map((v) => v.text)).toEqual(['91.2%', '66.0%']);
  });

  it('draws a line of one or more series over the rows', () => {
    const figure = resolveFigure(
      {
        slug: 'technical-report-900',
        chart: 'line',
        table: { heading: '4.8 Sweep' },
        label: 'N',
        series: ['Efficiency'],
        highlight: '4',
        claim: '| 4 | 2,710.1 | 56.2% |',
      },
      REPORT,
    );
    expect(figure.rows.map((row) => row.values[0].value)).toEqual([100, 74.7, 56.2]);
    expect(figure.highlight).toBe(2);
    expect(figure.lit).toBe(0);
  });
});

describe('a spec the report no longer supports fails loudly', () => {
  it('names a heading that has gone', () => {
    expect(failure({ ...BAR, table: { heading: '4.6 Riskiest cells' } })).toMatch(/technical-report-900.*no table under the heading "4\.6 Riskiest cells"/);
  });

  it('names a table that has gone from under its heading', () => {
    expect(failure({ ...BAR, table: { heading: '4.6 Highest-risk cells', nth: 2 } })).toMatch(/has 2 tables.*nth 2/);
  });

  it('names a column that has gone, and lists the columns the table has', () => {
    expect(failure({ ...BAR, value: 'Attack success' })).toMatch(/no column "Attack success".*Model, Quant, ASR/);
  });

  it('names a row that has gone', () => {
    expect(failure({ ...BAR, highlight: 'tiny-model · Q2_K' })).toMatch(/no row "tiny-model · Q2_K"/);
    expect(failure({ ...BAR, rows: ['small-model · Q2_K', 'small-model · Q3_K_S'] })).toMatch(/no row "small-model · Q3_K_S"/);
  });

  it('refuses a label that names more than one row', () => {
    expect(failure({ ...BAR, label: 'Model', highlight: 'small-model' })).toMatch(/"small-model" names 2 rows/);
  });

  it('refuses a cell with no number in it', () => {
    expect(failure({ ...BAR, value: 'Quant' })).toMatch(/no number in "Q2_K"/);
  });

  it('refuses a highlight outside the rows drawn', () => {
    expect(failure({ ...BAR, rows: ['small-model · Q4_K_M', 'large-model · Q2_K'] })).toMatch(/highlight "small-model · Q2_K" is not among the rows drawn/);
  });

  it('refuses a claim the report does not make, word for word', () => {
    expect(failure({ ...BAR, claim: 'The worst cell reaches 100% ASR on the small model.' })).toMatch(/claim is not in the report/);
  });

  it('refuses a claim that does not state the highlighted number', () => {
    expect(failure({ ...BAR, highlight: 'small-model · Q4_K_M' })).toMatch(/claim does not state the highlighted value 41\.5%/);
  });

  // were one of the twins cut from the report, nth would land on the other without a sound
  it('refuses a table whose heading holds a twin with the same columns', () => {
    const twins = `## Curves\n\nm0 is at 1%.\n\n| Model | ASR |\n|---|---|\n| m0 | 1% |\n| m1 | 2% |\n\n| Model | ASR |\n|---|---|\n| m0 | 3% |\n| m1 | 4% |\n`;
    expect(failure({ slug: 'x', chart: 'bar', table: { heading: 'Curves' }, label: 'Model', value: 'ASR', highlight: 'm0', claim: 'm0 is at 1%.' }, twins)).toMatch(
      /2 tables under "Curves" share these columns/,
    );
  });

  it('refuses more marks than a small chart can hold', () => {
    const rows = Array.from({ length: 9 }, (_, i) => `| m${i} | ${i + 1}% |`).join('\n');
    const markdown = `## Wide\n\nm0 is at 1%.\n\n| Model | ASR |\n|---|---|\n${rows}\n`;
    expect(failure({ slug: 'x', chart: 'bar', table: { heading: 'Wide' }, label: 'Model', value: 'ASR', highlight: 'm0', claim: 'm0 is at 1%.' }, markdown)).toMatch(
      /9 rows.*at most 8/,
    );
  });
});
