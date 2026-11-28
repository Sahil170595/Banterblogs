import type { ReactNode } from 'react';
import type { FigureRow, ResolvedFigure } from '@/lib/reports/figures/types';

// A report's figure, drawn from the data its spec resolved to (lib/reports/
// figures): bars, dots on their intervals, a line over a sweep, or before and
// after as two ends of one scale. Plain arithmetic, so the server and every
// browser produce the same markup. Monochrome on the .rv hairlines
// (globals.css), with one ember datum: the highlighted row.

/** what a card draws: the figure with or without its caption sentence */
export type FigureData = Omit<ResolvedFigure, 'claim' | 'anchor'>;
/** full: labelled, at the archive card's 16:9; mini: marks alone, for a thumbnail or a tile */
export type FigureVariant = 'full' | 'mini';

/** markup budget per figure, so ~50 of them stay light in the archive HTML */
export const MAX_FIGURE_BYTES: Record<FigureVariant, number> = { full: 4200, mini: 2400 };

const W = 320;
const HEIGHT: Record<FigureVariant, number> = { full: 180, mini: 90 };
// the drawing frame: sides, the header baseline, the rows' top and bottom, the tallest a row grows
const FRAME = {
  full: { left: 14, right: 306, header: 16, top: 26, bottom: 172, maxPitch: 30 },
  mini: { left: 8, right: 312, header: 0, top: 8, bottom: 82, maxPitch: 16 },
} as const;
// the line chart's plot area inside the frame, and its label baselines
const PLOT = {
  full: { top: 36, bottom: 144, inset: 10, ticks: 159, axis: 173 },
  mini: { top: 10, bottom: 80, inset: 4, ticks: 0, axis: 0 },
} as const;
const FONT_SIZE = 8.5;
/** average glyph advance at FONT_SIZE, in viewBox units: what a line of labels can hold */
const CHAR_WIDTH = 4.9;
const MIN_LABEL_CHARS = 8;
const MAX_MEASURE_CHARS = 34;
const MAX_TICK_CHARS = 12;
/** a sweep of up to this many points labels every tick; a longer one its ends and the highlight */
const MAX_TICKS = 5;
const BAR_HEIGHT = 3.5;
const DOT_RADIUS = 2.6;
const POINT_RADIUS = 1.5;
const LIT_POINT_RADIUS = 3;
// how far past the data a position scale runs, as a share of its span
const SCALE_PAD = 0.06;
const REST_OPACITY = 0.3;
const DOT_OPACITY = 0.7;
const GUIDE_DASH = '2 3';

const n1 = (v: number) => Math.round(v * 10) / 10;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text);

function valueText(figure: FigureData, row: FigureRow): string {
  if (figure.chart === 'slope') return `${row.values[0].text} → ${row.values[1].text}`;
  return row.values[figure.chart === 'line' ? (figure.lit ?? 0) : 0].text;
}

/** The highlighted number, the row it belongs to and what it measures. */
export function figureHeadline(figure: FigureData): { value: string; label: string; measure: string } {
  const row = figure.rows[figure.highlight];
  return { value: valueText(figure, row), label: row.label, measure: figure.measure };
}

/** The figure as a sentence of data: its text alternative. */
export function describeFigure(figure: FigureData): string {
  const series = figure.series ?? [];
  const rows = figure.rows.map((row) => {
    if (figure.chart === 'dot') return `${row.label}: ${row.values[0].text} [${row.low}, ${row.high}]`;
    if (figure.chart === 'line' && series.length > 1) return `${row.label}: ${row.values.map((value, index) => `${series[index]} ${value.text}`).join(', ')}`;
    return `${row.label}: ${valueText(figure, row)}`;
  });
  const lit = figure.chart === 'line' && series.length > 1 ? ` (${series[figure.lit ?? 0]})` : '';
  return `${rows.join('; ')}. Highlighted: ${figure.rows[figure.highlight].label}${lit}.`;
}

// A linear scale from the data's domain onto a pixel range.
function scale(lo: number, hi: number, from: number, to: number) {
  const span = hi - lo || 1;
  return (value: number) => n1(from + ((value - lo) / span) * (to - from));
}

function padded(values: number[]): [number, number] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1) * SCALE_PAD;
  return [lo - pad, hi + pad];
}

interface Drawing {
  /** hairlines under the marks: tracks, the zero line, the baseline */
  guides: string[];
  dashed: string[];
  marks: ReactNode[];
  text: ReactNode[];
}

const label = (key: string, x: number, y: number, text: string, lit = false, anchor?: 'middle' | 'end') => (
  <text key={key} x={n1(x)} y={n1(y)} textAnchor={anchor} className={lit ? 'text-foreground' : undefined}>
    {text}
  </text>
);

// bar, dot and slope: one row per table row, its label and number over its mark
function drawRows(figure: FigureData, variant: FigureVariant): Drawing {
  const frame = FRAME[variant];
  const full = variant === 'full';
  const count = figure.rows.length;
  const pitch = Math.min((frame.bottom - frame.top) / count, frame.maxPitch);
  const first = frame.top + (frame.bottom - frame.top - count * pitch) / 2;
  const drawing: Drawing = { guides: [], dashed: [], marks: [], text: [] };

  let x: (value: number) => number;
  if (figure.chart === 'bar') {
    const values = figure.rows.map((row) => row.values[0].value);
    x = scale(Math.min(0, ...values), Math.max(0, ...values), frame.left, frame.right);
  } else {
    const all = figure.rows.flatMap((row) => [...row.values.map((value) => value.value), ...(row.low === undefined ? [] : [row.low, row.high!])]);
    const [lo, hi] = padded(all);
    x = scale(lo, hi, frame.left + DOT_RADIUS, frame.right - DOT_RADIUS);
    // where the scale crosses zero, the line an interval either clears or straddles
    if (lo < 0 && hi > 0) drawing.dashed.push(`M${x(0)} ${n1(first)}V${n1(first + count * pitch)}`);
  }
  if (figure.chart === 'bar' && x(0) > frame.left) drawing.guides.push(`M${x(0)} ${n1(first)}V${n1(first + count * pitch)}`);

  if (full) {
    const measure = clip(figure.measure, MAX_MEASURE_CHARS);
    const room = Math.floor((frame.right - frame.left) / CHAR_WIDTH) - 2;
    drawing.text.push(
      label('dimension', frame.left, frame.header, clip(figure.dimension, Math.max(MIN_LABEL_CHARS, room - measure.length))),
      label('measure', frame.right, frame.header, measure, false, 'end'),
    );
  }

  figure.rows.forEach((row, index) => {
    const lit = index === figure.highlight;
    const top = first + index * pitch;
    // full: the text line sits over the mark; mini: the mark alone, centred in its row
    const textY = top + pitch / 2 - 1;
    const y = n1(full ? textY + 6 : top + pitch / 2);
    const rest = lit ? undefined : REST_OPACITY;
    let mark: ReactNode;
    if (figure.chart === 'bar') {
      const value = row.values[0].value;
      const [from, to] = value < 0 ? [x(value), x(0)] : [x(0), x(value)];
      const height = full ? BAR_HEIGHT : n1(Math.max(BAR_HEIGHT, pitch * 0.5));
      mark = <rect key={index} x={from} y={n1(y - height / 2)} width={n1(to - from)} height={height} rx={1} fillOpacity={rest} />;
    } else if (figure.chart === 'dot') {
      mark = [
        <path key={`w${index}`} className={lit ? 'h' : 'k'} d={`M${x(row.low!)} ${y}H${x(row.high!)}`} />,
        <circle key={`d${index}`} cx={x(row.values[0].value)} cy={y} r={DOT_RADIUS} fillOpacity={lit ? undefined : DOT_OPACITY} />,
      ];
    } else {
      const [from, to] = row.values.map((value) => x(value.value));
      mark = [
        <path key={`c${index}`} className={lit ? 'h' : 'k'} d={`M${Math.min(from, to)} ${y}H${Math.max(from, to)}`} />,
        // before: an open ring; after: the filled dot
        <circle key={`f${index}`} className={lit ? 'h' : 'k'} cx={from} cy={y} r={DOT_RADIUS} />,
        <circle key={`t${index}`} cx={to} cy={y} r={DOT_RADIUS} fillOpacity={lit ? undefined : DOT_OPACITY} />,
      ];
    }
    if (figure.chart !== 'bar') drawing.guides.push(`M${frame.left} ${y}H${frame.right}`);
    drawing.marks.push(
      lit ? (
        <g key="lit" className="text-primary" fill="currentColor">
          {mark}
        </g>
      ) : (
        mark
      ),
    );
    if (full) {
      const value = valueText(figure, row);
      const room = Math.floor((frame.right - frame.left) / CHAR_WIDTH) - 2;
      drawing.text.push(
        label(`l${index}`, frame.left, textY, clip(row.label, Math.max(MIN_LABEL_CHARS, room - value.length)), lit),
        label(`v${index}`, frame.right, textY, value, lit, 'end'),
      );
    }
  });
  return drawing;
}

// line: the rows are the x axis in table order, each series a polyline
function drawLine(figure: FigureData, variant: FigureVariant): Drawing {
  const frame = FRAME[variant];
  const plot = PLOT[variant];
  const full = variant === 'full';
  const litSeries = figure.lit ?? 0;
  const count = figure.rows.length;
  const values = figure.rows.flatMap((row) => row.values.map((value) => value.value));
  // a quantity that is never negative is drawn from zero; one that crosses it, over its own range
  const [lo, hi] = Math.min(...values) >= 0 ? [0, Math.max(...values)] : padded(values);
  const y = scale(lo, hi, plot.bottom, plot.top);
  const step = (frame.right - frame.left - 2 * plot.inset) / Math.max(1, count - 1);
  const xAt = (index: number) => n1(frame.left + plot.inset + index * step);
  const points = (series: number) => figure.rows.map((row, index) => `${xAt(index)},${y(row.values[series].value)}`).join(' ');
  const seriesCount = figure.rows[0].values.length;
  const cx = xAt(figure.highlight);
  const cy = y(figure.rows[figure.highlight].values[litSeries].value);

  const drawing: Drawing = {
    guides: [`M${frame.left} ${plot.bottom}H${frame.right}`],
    dashed: [`M${cx} ${plot.top}V${plot.bottom}`],
    marks: [
      ...Array.from({ length: seriesCount }, (_, series) => series)
        .filter((series) => series !== litSeries)
        .map((series) => <polyline key={`s${series}`} className="l" points={points(series)} />),
      <polyline key="lit-series" className="k" points={points(litSeries)} />,
      ...figure.rows.map((row, index) =>
        index === figure.highlight ? null : <circle key={`p${index}`} cx={xAt(index)} cy={y(row.values[litSeries].value)} r={POINT_RADIUS} fillOpacity={DOT_OPACITY} />,
      ),
      <g key="lit" className="text-primary" fill="currentColor">
        <circle cx={cx} cy={cy} r={LIT_POINT_RADIUS} />
      </g>,
    ],
    text: [],
  };
  if (!full) return drawing;

  const last = count - 1;
  const ticked = count <= MAX_TICKS ? figure.rows.map((_, index) => index) : [...new Set([0, figure.highlight, last])];
  const anchorAt = (index: number) => (index === 0 ? undefined : index === last ? 'end' : 'middle');
  const tickX = (index: number) => (index === 0 ? frame.left : index === last ? frame.right : xAt(index));
  drawing.text.push(
    label('measure', frame.left, frame.header, clip(figure.measure, MAX_MEASURE_CHARS)),
    ...ticked.map((index) => label(`t${index}`, tickX(index), plot.ticks, clip(figure.rows[index].label, MAX_TICK_CHARS), index === figure.highlight, anchorAt(index))),
    label('dimension', W / 2, plot.axis, clip(figure.dimension, MAX_MEASURE_CHARS), false, 'middle'),
    label('value', tickX(figure.highlight), cy - 8, valueText(figure, figure.rows[figure.highlight]), true, anchorAt(figure.highlight)),
  );
  return drawing;
}

export interface ReportFigureProps {
  figure: FigureData;
  variant?: FigureVariant;
  /** carry the data as a <desc>; a card names its figure and leaves the numbers to the report page */
  describe?: boolean;
}

export function ReportFigure({ figure, variant = 'full', describe = true }: ReportFigureProps) {
  const { guides, dashed, marks, text } = figure.chart === 'line' ? drawLine(figure, variant) : drawRows(figure, variant);
  return (
    <svg className="rv" role="img" viewBox={`0 0 ${W} ${HEIGHT[variant]}`} focusable="false" data-figure={figure.chart} data-accent="on">
      <title>{`${figure.title}: ${figure.measure}, by ${figure.dimension}`}</title>
      {describe && <desc>{describeFigure(figure)}</desc>}
      {guides.length > 0 && <path className="l" d={guides.join('')} />}
      {dashed.length > 0 && <path className="l" d={dashed.join('')} strokeDasharray={GUIDE_DASH} />}
      <g className="text-foreground" fill="currentColor">
        {marks}
      </g>
      {text.length > 0 && (
        <g className="text-muted-foreground" fill="currentColor" fontSize={FONT_SIZE}>
          {text}
        </g>
      )}
    </svg>
  );
}
