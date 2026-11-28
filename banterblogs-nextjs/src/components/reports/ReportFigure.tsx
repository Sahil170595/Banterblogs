import type { ReactNode } from 'react';
import { figureDomain } from '@/lib/reports/figures/scale';
import type { FigureRow, FigureValue, ResolvedFigure } from '@/lib/reports/figures/types';

// A report's figure, drawn from the data its spec resolved to (lib/reports/
// figures): bars, dots on their intervals, a line over a sweep, or before and
// after as two ends of one scale. Plain arithmetic, so the server and every
// browser produce the same markup. Monochrome on the .rv hairlines
// (globals.css), with one ember datum: the highlighted row.

/** a row as drawn: a cell the table leaves empty (one choice of a figure the reader redraws) is null */
export interface DrawnRow extends Omit<FigureRow, 'values'> {
  values: Array<FigureValue | null>;
}

/** what a card draws: the figure with or without its caption sentence */
export interface FigureData extends Omit<ResolvedFigure, 'claim' | 'anchor' | 'explore' | 'rows'> {
  rows: DrawnRow[];
  /** the position scale's range where the figure is one of several drawn on one scale; its own data's otherwise */
  domain?: [number, number];
}
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
// 9.5 units is 11px on a 376px archive card (1280 wide) and 10.6px on a phone's 358px card
const FONT_SIZE = 9.5;
/** average glyph advance at FONT_SIZE, in viewBox units: what a line of labels can hold */
const CHAR_WIDTH = 5.5;
const MIN_LABEL_CHARS = 8;
const MAX_MEASURE_CHARS = 34;
const MAX_TICK_CHARS = 12;
/** characters a full-width line of labels holds, less a gap between its two ends */
const LINE_CHARS = Math.floor((FRAME.full.right - FRAME.full.left) / CHAR_WIDTH) - 2;
// a long header line may set down to 85% (9.4px on a phone's card) before it is cut
const MIN_HEADER_SCALE = 0.85;
/** a sweep of up to this many points labels every tick; a longer one its ends and the highlight */
const MAX_TICKS = 5;
const BAR_HEIGHT = 3.5;
// a mini's bars thicken with fewer rows only this far: thicker, two bars read as a loading placeholder
const MINI_BAR_MAX_HEIGHT = 5;
const DOT_RADIUS = 2.6;
const POINT_RADIUS = 1.5;
const LIT_POINT_RADIUS = 3;
const REST_OPACITY = 0.3;
const DOT_OPACITY = 0.7;
const GUIDE_DASH = '2 3';
/** what an empty cell shows on the chart, and how its text alternative words it */
const MISSING_MARK = '—';
export const MISSING_WORDS = 'no value';

const n1 = (v: number) => Math.round(v * 10) / 10;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text);
const cellText = (cell: FigureValue | null, missing: string) => cell?.text ?? missing;

function valueText(figure: FigureData, row: DrawnRow, missing = MISSING_MARK): string {
  if (figure.chart === 'slope') return `${cellText(row.values[0], missing)} → ${cellText(row.values[1], missing)}`;
  return cellText(row.values[figure.chart === 'line' ? (figure.lit ?? 0) : 0], missing);
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
    if (figure.chart === 'dot') return `${row.label}: ${cellText(row.values[0], MISSING_WORDS)} [${row.low}, ${row.high}]`;
    if (figure.chart === 'line' && series.length > 1) {
      return `${row.label}: ${row.values.map((value, index) => `${series[index]} ${cellText(value, MISSING_WORDS)}`).join(', ')}`;
    }
    return `${row.label}: ${valueText(figure, row, MISSING_WORDS)}`;
  });
  const lit = figure.chart === 'line' && series.length > 1 ? ` (${series[figure.lit ?? 0]})` : '';
  return `${rows.join('; ')}. Highlighted: ${figure.rows[figure.highlight].label}${lit}.`;
}

// A linear scale from the data's domain onto a pixel range.
function scale(lo: number, hi: number, from: number, to: number) {
  const span = hi - lo || 1;
  return (value: number) => n1(from + ((value - lo) / span) * (to - from));
}

const domainOf = (figure: FigureData) => figure.domain ?? figureDomain(figure.chart, figure.rows);

interface Drawing {
  /** hairlines under the marks: tracks, the zero line, the baseline */
  guides: string[];
  dashed: string[];
  marks: ReactNode[];
  text: ReactNode[];
  /** a label was cut to fit its line */
  clipped: boolean;
}

// clip, and note on the drawing that something had to be cut
function fitter(drawing: Drawing) {
  return (text: string, max: number) => {
    const out = clip(text, max);
    if (out !== text) drawing.clipped = true;
    return out;
  };
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
  const drawing: Drawing = { guides: [], dashed: [], marks: [], text: [], clipped: false };
  const fit = fitter(drawing);

  const [lo, hi] = domainOf(figure);
  let x: (value: number) => number;
  if (figure.chart === 'bar') {
    x = scale(lo, hi, frame.left, frame.right);
  } else {
    x = scale(lo, hi, frame.left + DOT_RADIUS, frame.right - DOT_RADIUS);
    // where the scale crosses zero, the line an interval either clears or straddles
    if (lo < 0 && hi > 0) drawing.dashed.push(`M${x(0)} ${n1(first)}V${n1(first + count * pitch)}`);
  }
  // the zero line where bars meet it; marks without labels always keep it, so they read as a chart
  if (figure.chart === 'bar' && (x(0) > frame.left || !full)) drawing.guides.push(`M${x(0)} ${n1(first)}V${n1(first + count * pitch)}`);

  if (full) {
    // what the numbers measure keeps the header line, set a little smaller
    // before it is cut; what the rows are shows whole or not at all, since
    // every row label names its row anyway
    const scale = Math.max(MIN_HEADER_SCALE, Math.min(1, LINE_CHARS / figure.measure.length));
    const measure = fit(figure.measure, Math.floor(LINE_CHARS / scale));
    if (figure.dimension.length + measure.length * scale <= LINE_CHARS) drawing.text.push(label('dimension', frame.left, frame.header, figure.dimension));
    drawing.text.push(
      <text key="measure" x={frame.right} y={frame.header} textAnchor="end" fontSize={scale < 1 ? n1(FONT_SIZE * scale) : undefined}>
        {measure}
      </text>,
    );
  }

  figure.rows.forEach((row, index) => {
    const lit = index === figure.highlight;
    const top = first + index * pitch;
    // full: the text line sits over the mark; mini: the mark alone, centred in its row
    const textY = top + pitch / 2 - 1;
    const y = n1(full ? textY + 6 : top + pitch / 2);
    const rest = lit ? undefined : REST_OPACITY;
    // an empty cell draws no mark: a missing value is never a zero
    let mark: ReactNode = null;
    const [lead, tail] = row.values;
    if (figure.chart === 'bar') {
      if (lead) {
        const value = lead.value;
        const [from, to] = value < 0 ? [x(value), x(0)] : [x(0), x(value)];
        const height = full ? BAR_HEIGHT : n1(Math.min(MINI_BAR_MAX_HEIGHT, Math.max(BAR_HEIGHT, pitch * 0.5)));
        mark = <rect key={index} x={from} y={n1(y - height / 2)} width={n1(to - from)} height={height} rx={1} fillOpacity={rest} />;
      }
    } else if (figure.chart === 'dot') {
      mark = [
        <path key={`w${index}`} className={lit ? 'h' : 'k'} d={`M${x(row.low!)} ${y}H${x(row.high!)}`} />,
        lead && <circle key={`d${index}`} cx={x(lead.value)} cy={y} r={DOT_RADIUS} fillOpacity={lit ? undefined : DOT_OPACITY} />,
      ];
    } else {
      const from = lead && x(lead.value);
      const to = tail && x(tail.value);
      mark = [
        from !== null && to !== null && <path key={`c${index}`} className={lit ? 'h' : 'k'} d={`M${Math.min(from, to)} ${y}H${Math.max(from, to)}`} />,
        // before: an open ring; after: the filled dot
        from !== null && <circle key={`f${index}`} className={lit ? 'h' : 'k'} cx={from} cy={y} r={DOT_RADIUS} />,
        to !== null && <circle key={`t${index}`} cx={to} cy={y} r={DOT_RADIUS} fillOpacity={lit ? undefined : DOT_OPACITY} />,
      ];
    }
    if (figure.chart !== 'bar') drawing.guides.push(`M${frame.left} ${y}H${frame.right}`);
    if (mark !== null) {
      drawing.marks.push(
        lit ? (
          <g key="lit" className="text-primary" fill="currentColor">
            {mark}
          </g>
        ) : (
          mark
        ),
      );
    }
    if (full) {
      const value = valueText(figure, row);
      drawing.text.push(
        label(`l${index}`, frame.left, textY, fit(row.label, Math.max(MIN_LABEL_CHARS, LINE_CHARS - value.length)), lit),
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
  // a quantity that is never negative is drawn from zero; one that crosses it, over its own range
  const [lo, hi] = domainOf(figure);
  const y = scale(lo, hi, plot.bottom, plot.top);
  const step = (frame.right - frame.left - 2 * plot.inset) / Math.max(1, count - 1);
  const xAt = (index: number) => n1(frame.left + plot.inset + index * step);
  // an empty cell puts no point on its line
  const points = (series: number) =>
    figure.rows
      .flatMap((row, index) => {
        const cell = row.values[series];
        return cell ? [`${xAt(index)},${y(cell.value)}`] : [];
      })
      .join(' ');
  const seriesCount = figure.rows[0].values.length;
  const litCell = figure.rows[figure.highlight].values[litSeries];
  const cx = xAt(figure.highlight);
  const cy = litCell ? y(litCell.value) : plot.bottom;

  const drawing: Drawing = {
    guides: [`M${frame.left} ${plot.bottom}H${frame.right}`],
    dashed: [`M${cx} ${plot.top}V${plot.bottom}`],
    marks: [
      ...Array.from({ length: seriesCount }, (_, series) => series)
        .filter((series) => series !== litSeries)
        .map((series) => <polyline key={`s${series}`} className="l" points={points(series)} />),
      <polyline key="lit-series" className="k" points={points(litSeries)} />,
      ...figure.rows.map((row, index) => {
        const cell = row.values[litSeries];
        return index === figure.highlight || !cell ? null : <circle key={`p${index}`} cx={xAt(index)} cy={y(cell.value)} r={POINT_RADIUS} fillOpacity={DOT_OPACITY} />;
      }),
      litCell && (
        <g key="lit" className="text-primary" fill="currentColor">
          <circle cx={cx} cy={cy} r={LIT_POINT_RADIUS} />
        </g>
      ),
    ],
    text: [],
    clipped: false,
  };
  if (!full) return drawing;

  const fit = fitter(drawing);
  const last = count - 1;
  const ticked = count <= MAX_TICKS ? figure.rows.map((_, index) => index) : [...new Set([0, figure.highlight, last])];
  const anchorAt = (index: number) => (index === 0 ? undefined : index === last ? 'end' : 'middle');
  const tickX = (index: number) => (index === 0 ? frame.left : index === last ? frame.right : xAt(index));
  drawing.text.push(
    label('measure', frame.left, frame.header, fit(figure.measure, MAX_MEASURE_CHARS)),
    ...ticked.map((index) => label(`t${index}`, tickX(index), plot.ticks, fit(figure.rows[index].label, MAX_TICK_CHARS), index === figure.highlight, anchorAt(index))),
    label('dimension', W / 2, plot.axis, fit(figure.dimension, MAX_MEASURE_CHARS), false, 'middle'),
    label('value', tickX(figure.highlight), cy - 8, valueText(figure, figure.rows[figure.highlight]), true, anchorAt(figure.highlight)),
  );
  return drawing;
}

const draw = (figure: FigureData, variant: FigureVariant) => (figure.chart === 'line' ? drawLine(figure, variant) : drawRows(figure, variant));

/**
 * Whether the figure reads at archive-card size: every label whole on its
 * line (the resolver already caps the rows a chart holds). A figure that does
 * not keeps the seeded visual on its card and is drawn only on its report
 * page, beside its caption and its table's name.
 */
export function fitsCard(figure: FigureData): boolean {
  return !draw(figure, 'full').clipped;
}

export interface ReportFigureProps {
  figure: FigureData;
  variant?: FigureVariant;
  /** carry the data as a <desc>; a card names its figure and leaves the numbers to the report page */
  describe?: boolean;
}

export function ReportFigure({ figure, variant = 'full', describe = true }: ReportFigureProps) {
  const { guides, dashed, marks, text } = draw(figure, variant);
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
