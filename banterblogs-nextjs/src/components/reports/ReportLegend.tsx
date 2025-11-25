import { Fragment } from 'react';
import { getSeriesColor } from '@/lib/reports/colors';

interface LegendEntry {
  name: string;
  color?: string;
}

interface ChartLegendProps {
  series: LegendEntry[];
  activeSeries?: string[];
  onToggle?: (seriesName: string) => void;
}

export function ChartLegend({ series, activeSeries, onToggle }: ChartLegendProps) {
  if (!series.length) return null;
  const entries = series.map((entry, idx) => ({
    name: entry.name,
    color: entry.color ?? getSeriesColor(idx),
  }));

  const interactive = Boolean(onToggle);

  return (
    <div className="mt-3 flex flex-wrap gap-2" role={interactive ? 'group' : undefined} aria-label="Series legend">
      {entries.map((entry) => {
        const active = !activeSeries || activeSeries.includes(entry.name);
        const common = (
          <Fragment>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: active ? entry.color : 'transparent', border: `1px solid ${entry.color}` }}
              aria-hidden="true"
            />
            <span>{entry.name}</span>
          </Fragment>
        );

        if (!interactive) {
          return (
            <span
              key={entry.name}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground"
            >
              {common}
            </span>
          );
        }

        return (
          <button
            key={entry.name}
            onClick={() => onToggle?.(entry.name)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active ? 'border-transparent bg-white/10 text-foreground' : 'border-border/60 text-muted-foreground'
            }`}
            aria-pressed={active}
          >
            {common}
          </button>
        );
      })}
    </div>
  );
}
