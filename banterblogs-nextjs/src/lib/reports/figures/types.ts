// A report figure is a pointer, not a drawing: the spec names a table in the
// report's own markdown and the build parses the numbers out of it. Nothing a
// figure shows is typed here except where to look.

export type FigureChart = 'bar' | 'dot' | 'line' | 'slope';

interface FigureSpecBase {
  /** the report's slug */
  slug: string;
  /** the heading the table sits under, as the report words it, and which of that heading's tables (0-based) */
  table: { heading: string; nth?: number };
  /** the column that names each row, or several joined with " · " */
  label: string | string[];
  /** the rows drawn, by label, in this order; every row in table order when omitted */
  rows?: string[];
  /** the row that carries the report's headline result: the one ember mark */
  highlight: string;
  /** the report's own sentence stating that result, copied verbatim from its markdown */
  claim: string;
}

/**
 * A figure the reader redraws from the same table: a control offers some of
 * its columns for the one the figure draws (a bar's value, a slope's far end).
 * The figure's own column is one of them, and the page opens on it.
 */
export interface FigureExplore {
  /** the control's name, as the reader sees it */
  legend: string;
  /** the columns offered, by their headers, in the order the control lists them */
  columns: string[];
}

/** ranked categories: one horizontal bar per row */
export interface BarFigureSpec extends FigureSpecBase {
  chart: 'bar';
  value: string;
  /** the reader picks the column the bars measure */
  explore?: FigureExplore;
}

/** estimates with their intervals: one dot and whisker per row */
export interface DotFigureSpec extends FigureSpecBase {
  chart: 'dot';
  value: string;
  /** one column holding "[low, high]", or the low and high columns */
  interval: string | [string, string];
}

/** an ordered sweep: the rows are the x axis, each series column a line */
export interface LineFigureSpec extends FigureSpecBase {
  chart: 'line';
  series: string[];
  /** the series the highlighted point sits on; the first when omitted */
  lit?: string;
}

/** before and after: one line per row between two columns */
export interface SlopeFigureSpec extends FigureSpecBase {
  chart: 'slope';
  from: string;
  to: string;
  /** the reader picks the column the lines run to */
  explore?: FigureExplore;
}

export type FigureSpec = BarFigureSpec | DotFigureSpec | LineFigureSpec | SlopeFigureSpec;

/** a number as the report prints it */
export interface FigureValue {
  value: number;
  /** the cell's own text for it: "41.5%", "13.9×", "< 1e-4" */
  text: string;
}

export interface FigureRow {
  label: string;
  /** bar and dot: one value; line: one per series; slope: from, to */
  values: FigureValue[];
  /** dot: the interval's ends */
  low?: number;
  high?: number;
}

/** a row as one choice draws it: a cell the table leaves without a number is null, drawn as missing */
export interface ExploreRow {
  label: string;
  values: Array<FigureValue | null>;
}

export interface ExploreOption {
  /** the column chosen, as the table heads it: the option's label */
  column: string;
  /** what the figure's header names: the column, or a slope's two ends */
  measure: string;
  /** slope: the two columns compared */
  series?: string[];
  rows: ExploreRow[];
}

/**
 * The choices a figure offers, each resolved from the same table. Every
 * choice's values lie inside the report figure's own range, so all of them
 * are drawn on its scale and a switch never rescales the chart.
 */
export interface ResolvedExplore {
  legend: string;
  options: ExploreOption[];
  /** the option the report's own figure draws: the one the page opens on */
  initial: number;
}

/** A spec resolved against its report: plain data, safe to hand to a client component. */
export interface ResolvedFigure {
  slug: string;
  chart: FigureChart;
  /** the heading the table sits under */
  title: string;
  /** the label column's header: what the rows are */
  dimension: string;
  /** the value column's header */
  measure: string;
  /** line: the series columns; slope: the two columns compared */
  series?: string[];
  rows: FigureRow[];
  /** index of the highlighted row */
  highlight: number;
  /** line: index of the highlighted series */
  lit?: number;
  /** the report's sentence, as plain text */
  claim: string;
  /** the id of the table's heading on the report page, where the page has one */
  anchor?: string;
  /** the columns a reader may redraw it by, where the spec offers them */
  explore?: ResolvedExplore;
}
