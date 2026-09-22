// Spans on one time axis, read from the résumé's own date strings
// ("Nov 2020 – Sep 2023", "Oct 2025 – Present") at month granularity. Drawn
// by components/ui/TimelineFigure.tsx.

export interface MonthStamp {
  year: number;
  /** 0 = January */
  month: number;
}

export interface Span {
  start: MonthStamp;
  /** null: still running */
  end: MonthStamp | null;
}

/** a span's place on the axis, as fractions of its length */
export interface PlacedSpan {
  start: number;
  width: number;
  ongoing: boolean;
}

export interface Placement {
  /** the axis' length in months, from January of the first year through the present month */
  months: number;
  /** each January on the axis, as a fraction of its length */
  years: { year: number; at: number }[];
  spans: PlacedSpan[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_PER_YEAR = 12;
const MONTH_YEAR = /^([A-Z][a-z]{2}) (\d{4})$/;
// an en dash, or a hyphen, between spaces
const SPAN_SEPARATOR = /\s+[–-]\s+/;
const ONGOING = 'Present';

/** months since year 0: orders and subtracts month stamps */
export const monthIndex = (m: MonthStamp) => m.year * MONTHS_PER_YEAR + m.month;

/** as the résumé writes it: "Nov 2020" */
export const formatMonth = (m: MonthStamp) => `${MONTH_NAMES[m.month]} ${m.year}`;

export function parseMonth(text: string): MonthStamp {
  const match = MONTH_YEAR.exec(text.trim());
  const month = match ? MONTH_NAMES.indexOf(match[1] as (typeof MONTH_NAMES)[number]) : -1;
  if (!match || month < 0) throw new Error(`[timeline] cannot read the month "${text}"; expected e.g. "Nov 2020"`);
  return { year: Number(match[2]), month };
}

export function parseSpan(dates: string): Span {
  const parts = dates.split(SPAN_SEPARATOR);
  if (parts.length !== 2) throw new Error(`[timeline] cannot read the span "${dates}"; expected "<start> – <end|Present>"`);
  const start = parseMonth(parts[0]);
  const end = parts[1].trim() === ONGOING ? null : parseMonth(parts[1]);
  if (end && monthIndex(end) < monthIndex(start)) throw new Error(`[timeline] the span "${dates}" ends before it starts`);
  return { start, end };
}

/** the month a date falls in, in UTC, so the build machine's time zone cannot move it */
export function monthOf(date: Date): MonthStamp {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

/**
 * Places spans on one axis: from January of the earliest start through the
 * end of the present month. Each span covers its first and last months whole;
 * one still running reaches the axis end.
 */
export function placeSpans(spans: Span[], now: MonthStamp): Placement {
  const first = Math.min(...spans.map((span) => span.start.year));
  const origin = first * MONTHS_PER_YEAR;
  const months = monthIndex(now) + 1 - origin;
  for (const span of spans) {
    if (monthIndex(span.start) > monthIndex(now)) throw new Error(`[timeline] a span starts after the present (${formatMonth(span.start)})`);
  }
  const years = Array.from({ length: now.year - first + 1 }, (_, i) => ({ year: first + i, at: (i * MONTHS_PER_YEAR) / months }));
  return {
    months,
    years,
    spans: spans.map((span) => {
      const start = monthIndex(span.start) - origin;
      const end = span.end ? Math.min(monthIndex(span.end), monthIndex(now)) + 1 - origin : months;
      return { start: start / months, width: (end - start) / months, ongoing: span.end === null };
    }),
  };
}
