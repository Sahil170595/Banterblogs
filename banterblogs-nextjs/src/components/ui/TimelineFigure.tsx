import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { parseSpan, placeSpans, type MonthStamp } from '@/lib/timeline';

export interface TimelineLane {
  label: ReactNode;
  /** a second, quieter line of the label */
  detail?: ReactNode;
  /** the span as written, e.g. "Nov 2020 – Sep 2023" or "Oct 2025 – Present" */
  dates: string;
}

export interface TimelineFigureProps {
  title: ReactNode;
  caption: ReactNode;
  lanes: TimelineLane[];
  /** the month a span still running reaches */
  now: MonthStamp;
  className?: string;
}

const MONTHS_PER_YEAR = 12;
const percent = (fraction: number) => `${(fraction * 100).toFixed(4)}%`;
// a hairline at every January along a track
const YEAR_RULE = 'linear-gradient(90deg, hsl(var(--foreground) / 0.12) 1px, transparent 1px)';

/**
 * Spans on one time axis, on the FlowFigure's drafting plate (.flow). Each
 * lane is text first, its label, detail and dates as written, so it reads in
 * order without the drawing; then a track ruled at every January with the
 * span's bar on it, drawn from the same dates. A span still running ends in
 * the figure's one ember mark, at the present. The bars draw out from their
 * start (.timeline-bar in globals.css).
 */
export function TimelineFigure({ title, caption, lanes, now, className }: TimelineFigureProps) {
  const { months, years, spans } = placeSpans(
    lanes.map((lane) => parseSpan(lane.dates)),
    now,
  );
  const ruling: CSSProperties = { backgroundImage: YEAR_RULE, backgroundSize: `${percent(MONTHS_PER_YEAR / months)} 100%`, backgroundRepeat: 'repeat-x' };
  return (
    <figure className={cn('flow timeline', className)}>
      <figcaption className="flow-caption">
        <span className="block text-copy-14 font-medium text-foreground">{title}</span>
        <span className="mt-1 block text-label-13 text-muted-foreground">{caption}</span>
      </figcaption>
      <ol className="mt-6 grid gap-y-4">
        {lanes.map((lane, i) => (
          <li key={lane.dates + String(i)} data-ongoing={String(spans[i].ongoing)} style={{ '--lane': String(i) } as CSSProperties}>
            {/* one column on a phone; label, detail and dates in a row from md.
                The spaces keep the parts apart when read as one line. */}
            <p className="grid items-baseline md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-3">
              <span className="timeline-label text-copy-14 font-medium text-foreground">{lane.label}</span>{' '}
              {lane.detail && <span className="timeline-detail text-label-13 text-muted-foreground">{lane.detail}</span>}{' '}
              <span className="timeline-dates whitespace-nowrap text-label-13 text-muted-foreground md:col-start-3 md:pl-4">{lane.dates}</span>
            </p>
            <div aria-hidden="true" className="timeline-track relative mt-2 h-3" style={ruling}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
              <span
                className="timeline-bar absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted-foreground"
                style={{ left: percent(spans[i].start), width: percent(spans[i].width) }}
              >
                {spans[i].ongoing && <span className="timeline-now absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary" />}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="timeline-axis relative mt-3 h-5">
        {years.map((year) => (
          <span key={year.year} className="timeline-year absolute top-0 text-label-13 text-muted-foreground" style={{ left: percent(year.at) }}>
            {year.year}
          </span>
        ))}
      </div>
    </figure>
  );
}
