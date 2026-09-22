import fs from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseSpan, placeSpans } from '@/lib/timeline';
import { TimelineFigure } from '../TimelineFigure';

// A figure of spans on one time axis (R5: the /work career). Each lane is
// text first (its label, detail and dates, read in order by a screen
// reader), then a bar at its place on the axis, drawn from the same dates;
// a span still running ends in the one ember mark, at the present.

const CSS = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const BORDER_WIDTH = /^(?:[\w-]+:)*border(?:-[trblxy])?(?:-\d+)?$/;
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

const NOW = { year: 2026, month: 8 };
// Jan 2020 through Sep 2026
const AXIS_MONTHS = 6 * 12 + 9;
const LANES = [
  { label: 'PICT', detail: 'Research Engineer', dates: 'Nov 2020 – Sep 2023' },
  { label: 'Stealth Startup', detail: 'Co-Founder', dates: 'Oct 2023 – Aug 2025' },
  { label: 'Chimera', detail: 'Founder', dates: 'Sep 2025 – Present' },
];

const figure = () =>
  render(<TimelineFigure title="Roles over time" caption="Three roles on one axis." lanes={LANES} now={NOW} />).container.querySelector('figure')!;

describe('TimelineFigure', () => {
  it('is a captioned figure of the lanes in order, each with its label, detail and dates as text', () => {
    const fig = figure();
    expect(text(fig.querySelector('figcaption'))).toContain('Roles over time');
    expect(text(fig.querySelector('figcaption'))).toContain('Three roles on one axis.');
    const lanes = [...fig.querySelectorAll('ol > li')];
    expect(lanes.map((li) => text(li.querySelector('.timeline-label')))).toEqual(LANES.map((l) => l.label));
    expect(lanes.map((li) => text(li.querySelector('.timeline-detail')))).toEqual(LANES.map((l) => l.detail));
    expect(lanes.map((li) => text(li.querySelector('.timeline-dates')))).toEqual(LANES.map((l) => l.dates));
  });

  it('draws each bar where its dates fall on the axis', () => {
    const { spans } = placeSpans(LANES.map((l) => parseSpan(l.dates)), NOW);
    const bars = [...figure().querySelectorAll<HTMLElement>('.timeline-bar')];
    expect(bars).toHaveLength(LANES.length);
    bars.forEach((bar, i) => {
      expect(parseFloat(bar.style.left)).toBeCloseTo(spans[i].start * 100, 3);
      expect(parseFloat(bar.style.width)).toBeCloseTo(spans[i].width * 100, 3);
    });
  });

  it('marks the spans still running, and only those, with the present mark', () => {
    const lanes = [...figure().querySelectorAll('ol > li')];
    expect(lanes.map((li) => li.getAttribute('data-ongoing'))).toEqual(['false', 'false', 'true']);
    expect(lanes.map((li) => li.querySelectorAll('.timeline-now').length)).toEqual([0, 0, 1]);
    // the figure's one ember mark
    expect(figure().querySelectorAll('.bg-primary')).toHaveLength(1);
  });

  it('labels the years along the axis, one per year from the first to the present, and rules each track at every January', () => {
    const fig = figure();
    const years = [...fig.querySelectorAll<HTMLElement>('.timeline-year')];
    expect(years.map(text)).toEqual(['2020', '2021', '2022', '2023', '2024', '2025', '2026']);
    expect(parseFloat(years[0].style.left)).toBe(0);
    expect(parseFloat(years[1].style.left)).toBeCloseTo((12 / AXIS_MONTHS) * 100, 3);
    for (const track of fig.querySelectorAll<HTMLElement>('.timeline-track')) {
      expect(parseFloat(track.style.backgroundSize)).toBeCloseTo((12 / AXIS_MONTHS) * 100, 3);
    }
  });

  it('keeps the drawing out of the accessibility tree; the text carries the dates', () => {
    for (const el of figure().querySelectorAll('.timeline-track, .timeline-axis')) expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('sits on the FlowFigure plate, with no borders', () => {
    const fig = figure();
    expect(fig.classList.contains('flow')).toBe(true);
    const classes = [fig, ...fig.querySelectorAll('*')].flatMap((el) => [...el.classList]);
    expect(classes.filter((c) => BORDER_WIDTH.test(c))).toEqual([]);
  });

  it('draws its bars out only while motion is armed, so reduced motion shows them whole', () => {
    const drawing = [...CSS.matchAll(/([^{}]+)\{[^}]*(?:clip-path|animation)[^}]*\}/g)].map((m) => m[1].trim()).filter((s) => s.includes('.timeline-bar'));
    expect(drawing.length).toBeGreaterThanOrEqual(2);
    for (const selector of drawing) expect(selector).toMatch(/^html\[data-motion="on"\]/);
    // a basic shape does not interpolate with none: the draw names both ends
    const keyframes = /@keyframes timeline-draw \{([\s\S]*?\}\s*)\}/.exec(CSS)?.[1] ?? '';
    expect(keyframes).toMatch(/from \{\s*clip-path:\s*inset\(/);
    expect(keyframes).toMatch(/to \{\s*clip-path:\s*inset\(/);
  });
});
