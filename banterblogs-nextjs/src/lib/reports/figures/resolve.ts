import type { ExploreOption, ExploreRow, FigureChart, FigureRow, FigureSpec, FigureValue, ResolvedExplore, ResolvedFigure } from './types';

// Spec + the report's markdown -> the figure's data. Pure string work with no
// imports at run time, so the same code checks a spec in a test, in the build
// and from a plain node script. Every way a spec can stop matching its report
// (a renamed heading, a dropped column, a reworded sentence) throws.

export class FigureSpecError extends Error {
  constructor(slug: string, problem: string) {
    super(`${slug}: ${problem}`);
    this.name = 'FigureSpecError';
  }
}

/** the most marks each chart holds at archive-card size and stays readable */
export const MAX_ROWS: Record<FigureChart, number> = { bar: 8, dot: 8, line: 12, slope: 6 };
export const MAX_SERIES = 4;
/** fewer than two marks is a number, not a chart */
export const MIN_ROWS = 2;
/** the claim is a caption: a sentence, not a paragraph */
export const MAX_CLAIM_CHARS = 280;
export const LABEL_JOIN = ' · ';
/** one choice is the figure as it is, not something to explore */
export const MIN_OPTIONS = 2;
/** the choices one line of the control holds on a phone's report column */
export const MAX_OPTIONS = 6;
// what a table writes in a cell it has no value for; only a choice may draw one, as missing
const MISSING_CELL = /^(?:--|—|–|-|n\/a)$/i;

export interface MarkdownTable {
  /** the nearest heading above the table, as plain text */
  heading: string;
  /** its position among the tables under headings with that text, 0-based */
  nth: number;
  /** 1-based line of the header row */
  line: number;
  columns: string[];
  rows: string[][];
}

export interface ParsedNumber extends FigureValue {
  /** digits after the decimal point, as printed */
  decimals: number;
  /** where it sits in the text it was read from */
  index: number;
  length: number;
}

const HEADING = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(?:```|~~~)/;
const DELIMITER_ROW = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;
const UNESCAPED_PIPE = /(?<!\\)\|/;
// a unit printed against the number: "%", "pp", "×", or a spaced "ms", "tok/s", ...
const UNIT = String.raw`(?:%|pp\b|×|x\b| ?(?:ms|µs|ns|s|tok\/s|tokens\/s|GB|GiB|MB|W|J|Wh|kWh)\b)`;
// A number standing on its own: not part of an identifier (Q4_K_M, llama3.2-1b)
// and, in "10-68pp", two numbers rather than ten and minus sixty-eight.
const NUMBER = new RegExp(
  String.raw`(?<![\w.])([<>≤≥~≈+] ?)?([-−–])?(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(?:e([-+]?\d+))?(${UNIT})?(?!\w|\.\d)`,
  'gi',
);
const BRACKETED = /[[(]([^[\]()]+)[\])]/;
const RANGE_JOIN = /^\s*(?:to|–|—|-|,)\s*$/;
const MAX_DECIMALS = 15;

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Inline markdown as the plain text it renders to. */
export function plainText(markdown: string): string {
  return squash(
    markdown
      .replace(/\\\|/g, '|')
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
      .replace(/`|\*|~~/g, ''),
  );
}

/** Every number a piece of plain text states, in order. */
export function numbersIn(text: string): ParsedNumber[] {
  const found: ParsedNumber[] = [];
  for (const match of text.matchAll(NUMBER)) {
    const [whole, prefix = '', sign = '', integer, fraction = '', exponent, unit = ''] = match;
    const magnitude = Number(`${integer.replace(/,/g, '')}${fraction}${exponent ? `e${exponent}` : ''}`);
    const decimals = Math.max(0, fraction.length - 1) - (exponent ? Number(exponent) : 0);
    found.push({
      value: sign ? -magnitude : magnitude,
      text: `${prefix}${sign}${integer}${fraction}${exponent ? `e${exponent}` : ''}${unit.replace(/x$/i, '×')}`,
      decimals: Math.min(MAX_DECIMALS, Math.max(0, decimals)),
      index: match.index,
      length: whole.length,
    });
  }
  return found;
}

/** The first number in a cell, or null when it holds none. */
export function parseNumber(cell: string): ParsedNumber | null {
  return numbersIn(cell)[0] ?? null;
}

/** "[low, high]", "(low, high)" or "low to high" as its two ends, ascending. */
export function parseInterval(cell: string): [number, number] | null {
  const bracketed = BRACKETED.exec(cell);
  const ends = numbersIn(bracketed ? bracketed[1] : cell);
  if (ends.length !== 2) return null;
  const [a, b] = ends;
  if (!bracketed && !RANGE_JOIN.test(cell.slice(a.index + a.length, b.index))) return null;
  return a.value <= b.value ? [a.value, b.value] : [b.value, a.value];
}

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  return inner.split(UNESCAPED_PIPE).map(plainText);
}

/** Every pipe table in a markdown document, under its nearest heading. Fenced code is skipped. */
export function extractTables(markdown: string): MarkdownTable[] {
  const lines = markdown.split(/\r?\n/);
  const tables: MarkdownTable[] = [];
  const seen = new Map<string, number>();
  let heading = '';
  let fenced = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const head = HEADING.exec(line);
    if (head) {
      heading = plainText(head[1]);
      continue;
    }
    const next = lines[i + 1] ?? '';
    if (!line.includes('|') || !next.includes('-') || !DELIMITER_ROW.test(next)) continue;
    let end = i + 2;
    while (end < lines.length && lines[end].trim() && lines[end].includes('|')) end++;
    const nth = seen.get(heading) ?? 0;
    seen.set(heading, nth + 1);
    tables.push({ heading, nth, line: i + 1, columns: splitRow(line), rows: lines.slice(i + 2, end).map(splitRow) });
    i = end - 1;
  }
  return tables;
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Resolve a spec against its report's markdown, or throw a FigureSpecError naming what no longer matches. */
export function resolveFigure(spec: FigureSpec, markdown: string): ResolvedFigure {
  const fail = (problem: string): never => {
    throw new FigureSpecError(spec.slug, problem);
  };

  const { heading } = spec.table;
  const nth = spec.table.nth ?? 0;
  const under = extractTables(markdown).filter((table) => table.heading === heading);
  if (!under.length) fail(`no table under the heading "${heading}"`);
  if (!under[nth]) fail(`the heading "${heading}" has ${plural(under.length, 'table')}, none at nth ${nth}`);
  const table = under[nth];
  const where = `the table under "${heading}"`;
  // nth alone cannot tell twins apart: cut one from the report and it lands on the other
  const twins = under.filter((candidate) => candidate.columns.join('|') === table.columns.join('|')).length;
  if (twins > 1) fail(`${twins} tables under "${heading}" share these columns (${table.columns.join(', ')}); a spec cannot tell them apart`);

  const column = (name: string): number => {
    const matches = table.columns.filter((header) => header === name).length;
    if (matches === 0) fail(`no column "${name}" in ${where} (it has: ${table.columns.join(', ')})`);
    if (matches > 1) fail(`"${name}" names ${matches} columns in ${where}`);
    return table.columns.indexOf(name);
  };

  const labelColumns = [spec.label].flat().map(column);
  const labels = table.rows.map((row) => labelColumns.map((at) => row[at] ?? '').join(LABEL_JOIN));
  const rowAt = (label: string): number => {
    const matches = labels.filter((candidate) => candidate === label).length;
    if (matches === 0) fail(`no row "${label}" in ${where}`);
    if (matches > 1) fail(`"${label}" names ${matches} rows in ${where}; add a column to the label`);
    return labels.indexOf(label);
  };

  const highlighted = rowAt(spec.highlight);
  const drawn = spec.rows ? spec.rows.map(rowAt) : table.rows.map((_, index) => index);
  const highlight = drawn.indexOf(highlighted);
  if (highlight < 0) fail(`highlight "${spec.highlight}" is not among the rows drawn`);
  if (drawn.length > MAX_ROWS[spec.chart]) {
    fail(`${plural(drawn.length, 'row')} is more than a ${spec.chart} chart holds (at most ${MAX_ROWS[spec.chart]}); list the rows to draw`);
  }
  if (drawn.length < MIN_ROWS) fail(`${plural(drawn.length, 'row')} is not a chart (at least ${MIN_ROWS})`);

  const numberAt = (row: number, at: number): ParsedNumber => {
    const text = table.rows[row][at] ?? '';
    return parseNumber(text) ?? fail(`no number in "${text}" (row "${labels[row]}", column "${table.columns[at]}")`);
  };

  // the columns each chart reads, and the series the highlighted point is on
  let valueColumns: number[];
  let series: string[] | undefined;
  let lit: number | undefined;
  let measure: string;
  if (spec.chart === 'line') {
    if (spec.series.length < 1 || spec.series.length > MAX_SERIES) fail(`a line chart draws 1 to ${MAX_SERIES} series, not ${spec.series.length}`);
    valueColumns = spec.series.map(column);
    series = spec.series;
    lit = spec.lit === undefined ? 0 : spec.series.indexOf(spec.lit);
    if (lit < 0) fail(`lit "${spec.lit}" is not one of the series`);
    measure = spec.series[lit];
  } else if (spec.chart === 'slope') {
    valueColumns = [column(spec.from), column(spec.to)];
    series = [spec.from, spec.to];
    measure = `${spec.from} → ${spec.to}`;
  } else {
    valueColumns = [column(spec.value)];
    measure = spec.value;
  }

  // what the highlighted mark shows, for the check against the claim
  const stated: Array<Pick<ParsedNumber, 'value' | 'decimals' | 'text'>> = [];
  const rows: FigureRow[] = drawn.map((row) => {
    const parsed = valueColumns.map((at) => numberAt(row, at));
    const figureRow: FigureRow = { label: labels[row], values: parsed.map(({ value, text }) => ({ value, text })) };
    let ends: ParsedNumber[] = [];
    if (spec.chart === 'dot') {
      if (typeof spec.interval === 'string') {
        const cell = table.rows[row][column(spec.interval)] ?? '';
        const interval = parseInterval(cell) ?? fail(`no interval in "${cell}" (row "${labels[row]}", column "${spec.interval}")`);
        [figureRow.low, figureRow.high] = interval;
        ends = numbersIn(cell);
      } else {
        ends = spec.interval.map((name) => numberAt(row, column(name)));
        [figureRow.low, figureRow.high] = ends.map((end) => end.value).sort((a, b) => a - b);
      }
    }
    if (row === highlighted) {
      if (spec.chart === 'line') stated.push(parsed[lit ?? 0]);
      else stated.push(...parsed, ...ends);
      if (spec.chart === 'slope') {
        const [from, to] = parsed;
        stated.push({ value: to.value - from.value, decimals: Math.max(from.decimals, to.decimals), text: `${from.text} → ${to.text}` });
      }
    }
    return figureRow;
  });

  if (!squash(markdown).includes(squash(spec.claim))) fail('the claim is not in the report, word for word');
  const claim = plainText(spec.claim);
  if (claim.length > MAX_CLAIM_CHARS) fail(`the claim runs ${claim.length} characters (at most ${MAX_CLAIM_CHARS}); quote the sentence, not the paragraph`);
  const quoted = numbersIn(claim);
  // the claim may round what the table prints, and may drop a sign it words ("falls 25pp")
  const states = stated.some((mark) =>
    quoted.some((token) => Math.abs(Math.abs(token.value) - Math.abs(mark.value)) <= 0.5 * 10 ** -Math.min(token.decimals, mark.decimals) + Number.EPSILON),
  );
  if (!states) fail(`the claim does not state the highlighted value ${stated[0].text}`);
  const caption = excerpt(spec.claim, markdown);

  // A figure the reader redraws: each choice is another column of this same
  // table, over the same rows, on the report figure's own scale.
  let explore: ResolvedExplore | undefined;
  if ((spec.chart === 'bar' || spec.chart === 'slope') && spec.explore) {
    const { legend, columns } = spec.explore;
    const own = spec.chart === 'bar' ? spec.value : spec.to;
    if (columns.length < MIN_OPTIONS || columns.length > MAX_OPTIONS) {
      fail(`the explorable offers ${plural(columns.length, 'choice')}, not ${MIN_OPTIONS} to ${MAX_OPTIONS} choices`);
    }
    const twice = columns.find((name, index) => columns.indexOf(name) !== index);
    if (twice !== undefined) fail(`the explorable lists the column "${twice}" twice`);
    const initial = columns.indexOf(own);
    if (initial < 0) fail(`the explorable's columns (${columns.join(', ')}) leave out the figure's own "${own}"`);
    if (spec.chart === 'slope' && columns.includes(spec.from)) fail(`a choice cannot run the slope from "${spec.from}" to itself`);

    const cellAt = (row: number, at: number): FigureValue | null => {
      const text = table.rows[row][at] ?? '';
      const parsed = parseNumber(text);
      if (parsed) return { value: parsed.value, text: parsed.text };
      if (MISSING_CELL.test(text)) return null;
      return fail(`no number in "${text}" (row "${labels[row]}", column "${table.columns[at]}"), and no mark of a missing value`);
    };
    const options = columns.map((name): ExploreOption => {
      const at = column(name);
      const optionRows: ExploreRow[] = drawn.map((row) => ({
        label: labels[row],
        values: spec.chart === 'slope' ? [cellAt(row, column(spec.from)), cellAt(row, at)] : [cellAt(row, at)],
      }));
      const numbers = optionRows.filter((row) => row.values[row.values.length - 1] !== null).length;
      if (numbers < MIN_ROWS) fail(`the column "${name}" has ${plural(numbers, 'number')} in the rows drawn; a choice draws at least ${MIN_ROWS}`);
      return spec.chart === 'slope'
        ? { column: name, measure: `${spec.from} → ${name}`, series: [spec.from, name], rows: optionRows }
        : { column: name, measure: name, rows: optionRows };
    });
    // Every choice stays inside the report figure's own range (a bar's from
    // zero), so the page draws them all on that figure's scale
    // (lib/reports/figures/scale.ts) and no switch rescales the chart.
    const extent = rows.flatMap((row) => row.values.map((value) => value.value));
    if (spec.chart === 'bar') extent.push(0);
    const [lo, hi] = [Math.min(...extent), Math.max(...extent)];
    for (const option of options) {
      const outside = option.rows.flatMap((row) => row.values).find((cell) => cell !== null && (cell.value < lo || cell.value > hi));
      if (outside) fail(`the column "${option.column}" reaches outside the range of the report's figure (${outside.text}, not ${lo} to ${hi}); choosing it would rescale the chart`);
    }
    explore = { legend, options, initial };
  }

  return {
    slug: spec.slug,
    chart: spec.chart,
    title: table.heading,
    dimension: [spec.label].flat().join(LABEL_JOIN),
    measure,
    ...(series ? { series } : {}),
    rows,
    highlight,
    ...(lit === undefined ? {} : { lit }),
    claim: caption,
    ...(explore ? { explore } : {}),
  };
}

// the report's text runs on past the claim: a word, a number or a joining mark
const RUNS_INTO = /[\p{L}\p{N},;)\]'"’”]$/u;
const RUNS_ON = /^[\p{L}\p{N},;(['"‘“—–-]/u;
const TERMINAL = /[.!?]$/;
const ELLIPSIS = '…';

/**
 * The claim as a caption: plain text, with an ellipsis where it was lifted
 * from inside a longer sentence on its line, so a clause never reads as the
 * whole of what the report says.
 */
export function excerpt(claim: string, markdown: string): string {
  const text = plainText(claim);
  const quoted = squash(claim);
  const line = markdown.split(/\r?\n/).map((source) => source.replace(/[ \t]+/g, ' ')).find((source) => source.includes(quoted));
  // a claim that spans lines keeps no marks: its line cannot be read whole
  if (line === undefined) return text;
  const at = line.indexOf(quoted);
  const before = plainText(line.slice(0, at));
  const after = plainText(line.slice(at + quoted.length));
  const opensInside = RUNS_INTO.test(before);
  const closesInside = !TERMINAL.test(text) && RUNS_ON.test(after);
  return `${opensInside ? ELLIPSIS : ''}${text}${closesInside ? ELLIPSIS : ''}`;
}
