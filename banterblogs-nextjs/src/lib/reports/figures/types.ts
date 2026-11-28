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

/** ranked categories: one horizontal bar per row */
export interface BarFigureSpec extends FigureSpecBase {
  chart: 'bar';
  value: string;
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
}
