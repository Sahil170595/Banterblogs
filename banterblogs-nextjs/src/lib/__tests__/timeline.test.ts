import { describe, expect, it } from 'vitest';
import { monthOf, parseMonth, parseSpan, placeSpans } from '../timeline';

// The /work career figure puts each role on one time axis. Its dates are the
// résumé's own strings ("Nov 2020 – Sep 2023", "Oct 2025 – Present"), read at
// month granularity: a span covers its first and last months whole, and a
// role still running reaches the month the page was built in.

describe('reading the résumé dates', () => {
  it('reads a month and year', () => {
    expect(parseMonth('Nov 2020')).toEqual({ year: 2020, month: 10 });
    expect(parseMonth('Jan 2026')).toEqual({ year: 2026, month: 0 });
  });

  it('refuses a date it cannot read, rather than drawing it somewhere wrong', () => {
    expect(() => parseMonth('Autumn 2020')).toThrow(/Autumn 2020/);
    expect(() => parseMonth('2020')).toThrow();
  });

  it('reads a closed span and one still running, with either dash', () => {
    expect(parseSpan('Nov 2020 – Sep 2023')).toEqual({ start: { year: 2020, month: 10 }, end: { year: 2023, month: 8 } });
    expect(parseSpan('Oct 2025 – Present')).toEqual({ start: { year: 2025, month: 9 }, end: null });
    expect(parseSpan('Dec 2025 - Mar 2026')).toEqual({ start: { year: 2025, month: 11 }, end: { year: 2026, month: 2 } });
    expect(() => parseSpan('Sep 2023')).toThrow(/Sep 2023/);
  });

  it('refuses a span that ends before it starts', () => {
    expect(() => parseSpan('Sep 2023 – Nov 2020')).toThrow(/ends before it starts/);
  });

  it('takes the month of a date in UTC, so the build machine’s zone cannot move it', () => {
    expect(monthOf(new Date(Date.UTC(2026, 8, 30, 23, 30)))).toEqual({ year: 2026, month: 8 });
  });
});

describe('placing spans on the axis', () => {
  const NOW = { year: 2026, month: 8 };

  it('runs the axis from January of the first year to the end of the current month', () => {
    const { months, years } = placeSpans([parseSpan('Nov 2020 – Sep 2023'), parseSpan('Oct 2025 – Present')], NOW);
    // Jan 2020 .. Sep 2026 inclusive
    expect(months).toBe(6 * 12 + 9);
    expect(years.map((y) => y.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026]);
    expect(years[0].at).toBe(0);
    expect(years[1].at).toBeCloseTo(12 / months, 10);
  });

  it('places each span by its months, whole months at both ends, and runs an ongoing one to the present', () => {
    const { spans, months } = placeSpans([parseSpan('Nov 2020 – Sep 2023'), parseSpan('Oct 2025 – Present')], NOW);
    // Nov 2020 is month 10 of the axis; through Sep 2023 is 35 months
    expect(spans[0]).toEqual({ start: 10 / months, width: 35 / months, ongoing: false });
    // Oct 2025 .. Sep 2026 is 12 months, ending at the axis end
    expect(spans[1].ongoing).toBe(true);
    expect(spans[1].start + spans[1].width).toBeCloseTo(1, 10);
    expect(spans[1].width).toBeCloseTo(12 / months, 10);
  });

  it('keeps every span inside the axis', () => {
    const { spans } = placeSpans([parseSpan('Dec 2025 – Mar 2026'), parseSpan('Sep 2025 – Present')], NOW);
    for (const span of spans) {
      expect(span.start).toBeGreaterThanOrEqual(0);
      expect(span.start + span.width).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('refuses a span that starts after the present', () => {
    expect(() => placeSpans([parseSpan('Oct 2027 – Present')], NOW)).toThrow(/after the present/);
  });
});
