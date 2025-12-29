'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ReportThemeBridge } from '@/components/ReportThemeBridge';
import { ChartCaption } from '@/components/charts/ChartCaption';
import { DataTable } from '@/components/charts/DataTable';
import type { Timeseries, Distribution, Correlation } from '@/lib/reports/schemas';
import { SparklineKPI } from '@/components/charts/SparklineKPI';
import { SmallMultiples } from '@/components/charts/SmallMultiples';
import { ChartLegend } from '@/components/reports/ReportLegend';

const TimeseriesInteractive = dynamic(() => import('@/components/charts/TimeseriesInteractive').then((m) => m.TimeseriesInteractive), { ssr: false });
const TimeseriesChart = dynamic(() => import('@/components/charts/Timeseries').then((m) => m.TimeseriesChart), { ssr: false });
const DistributionChart = dynamic(() => import('@/components/charts/Distribution').then((m) => m.DistributionChart), { ssr: false });
const CorrelationChart = dynamic(() => import('@/components/charts/Correlation').then((m) => m.CorrelationChart), { ssr: false });

interface ReportDetailClientProps {
  id: string;
  timeseries: Timeseries;
  distribution: Distribution;
  correlation: Correlation;
  source?: string;
  issues?: string[];
}

export function ReportDetailClient({ id, timeseries, distribution, correlation, source, issues }: ReportDetailClientProps) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const rangeParam = search.get('range'); // e.g., 7d, 30d, all; fallback by points
  const interactParam = search.get('interact');
  const defaultInteractive = useMemo(() => interactParam === '1' || interactParam === 'true', [interactParam]);
  const [interactive, setInteractive] = useState(defaultInteractive);
  const sourceLabel = useMemo(() => source ?? `Derived - ${id}`, [source, id]);

  useEffect(() => {
    setInteractive(defaultInteractive);
  }, [defaultInteractive]);

  const seriesNames = useMemo(() => timeseries.series.map((s) => s.name), [timeseries]);
  const legendEntries = useMemo(() => seriesNames.map((name) => ({ name })), [seriesNames]);
  const seriesParam = search.get('series');
  const initialSeries = useMemo(() => {
    if (!seriesParam) return seriesNames;
    const requested = seriesParam.split(',').map((s) => s.trim()).filter(Boolean);
    const valid = requested.filter((name) => seriesNames.includes(name));
    return valid.length ? valid : seriesNames;
  }, [seriesParam, seriesNames]);
  const [activeSeries, setActiveSeries] = useState<string[]>(initialSeries);

  const isEpochTimeseries = useMemo(() => {
    const sample = timeseries.series.flatMap((s) => s.points.slice(0, 8));
    return sample.some((p) => p.t > 1e11); // treat large values as epoch milliseconds
  }, [timeseries]);

  useEffect(() => {
    setActiveSeries(initialSeries);
  }, [initialSeries]);

  const rangedTimeseries = useMemo(() => {
    const baseSeries = timeseries.series.filter((s) => activeSeries.includes(s.name));
    if (!rangeParam || rangeParam === 'all') {
      return { ...timeseries, series: baseSeries };
    }
    const m = rangeParam.match(/^(\d+)([dh])$/);
    if (!m) return { ...timeseries, series: baseSeries };
    const count = parseInt(m[1], 10);
    const unit = m[2];

    if (isEpochTimeseries) {
      const hours = unit === 'd' ? 24 : 1;
      const lookbackMs = hours * count * 3_600_000;
      const cutoff = Date.now() - lookbackMs;
      return {
        ...timeseries,
        series: baseSeries.map((s) => ({
          ...s,
          points: s.points.filter((p) => p.t >= cutoff),
        })),
      };
    }

    const slices = Math.max(1, count * (unit === 'd' ? 24 : 1));
    return {
      ...timeseries,
      series: baseSeries.map((s) => ({
        ...s,
        points: s.points.slice(-slices),
      })),
    };
  }, [timeseries, rangeParam, isEpochTimeseries, activeSeries]);

  const tsRows = useMemo(() => rangedTimeseries.series[0]?.points.map((p) => ({ t: p.t, y: p.y })) ?? [], [rangedTimeseries]);
  const kpis = useMemo(() => timeseries.series.slice(0, 3).map((s, idx) => {
    const last = s.points[s.points.length - 1]?.y ?? 0;
    const prev = s.points[s.points.length - 2]?.y ?? last;
    const delta = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;
    const trend = s.points.slice(-16).map((p) => p.y);
    return { label: s.name, value: last, delta, trend, colorIndex: idx };
  }), [timeseries]);

  const hasSeries = rangedTimeseries.series.length > 0;
  const selectedRange = rangeParam && /^(\d+[dh]|all)$/.test(rangeParam) ? rangeParam : 'all';
  const RANGE_OPTIONS = [
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
    { label: '90d', value: '90d' },
    { label: 'All', value: 'all' },
  ];

  const updateQuery = (params: Record<string, string | null>) => {
    const sp = new URLSearchParams(search.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) {
        sp.delete(key);
      } else {
        sp.set(key, value);
      }
    });
    router.replace(`${pathname}?${sp.toString()}`);
  };

  const handleSeriesToggle = (name: string) => {
    setActiveSeries((prev) => {
      const exists = prev.includes(name);
      let next = exists ? prev.filter((s) => s !== name) : [...prev, name];
      if (next.length === 0) {
        next = [name];
      }
      updateQuery({ series: next.length === seriesNames.length ? null : next.join(',') });
      return next;
    });
  };

  const handleRangeSelect = (value: string) => {
    updateQuery({ range: value === 'all' ? null : value });
  };

  const handleInteractiveToggle = () => {
    setInteractive((current) => {
      const next = !current;
      updateQuery({ interact: next ? '1' : null });
      return next;
    });
  };

  return (
    <ReportThemeBridge>
      {issues?.length ? (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <div className="font-semibold text-amber-100">Data warnings</div>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>View:</span>
          <button
            onClick={handleInteractiveToggle}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-muted/40"
            aria-pressed={interactive}
          >
            {interactive ? 'Interactive (on)' : 'Interactive (off)'}
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Range:</span>
          <div className="inline-flex rounded-full border border-border/60 bg-card/40 p-1">
            {RANGE_OPTIONS.map((option) => {
              const active = option.value === selectedRange;
              return (
                <button
                  key={option.value}
                  onClick={() => handleRangeSelect(option.value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    active ? 'bg-primary/80 text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-pressed={active}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Series</h2>
        <ChartLegend series={legendEntries} activeSeries={activeSeries} onToggle={handleSeriesToggle} />
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <SparklineKPI
            key={k.label}
            label={k.label}
            value={k.value}
            delta={k.delta}
            trend={k.trend}
            colorIndex={k.colorIndex}
          />
        ))}
      </div>

      {hasSeries ? (
        <>
          <div className="rounded-xl border border-border/50 p-4 bg-card/50">
            {interactive ? (
              <TimeseriesInteractive data={rangedTimeseries} timeIsEpoch={isEpochTimeseries} />
            ) : (
              <TimeseriesChart data={rangedTimeseries} />
            )}
            <ChartCaption
              title="Live themed timeseries"
              description="SVG-first rendering, consistent with Banterblogs tokens."
              provenance={{ source: sourceLabel }}
            />
            <DataTable
              caption="Timeseries sample points"
              columns={[
                { key: 't', label: isEpochTimeseries ? 't (ms)' : 'index' },
                { key: 'y', label: 'y' },
              ]}
              rows={tsRows}
            />
            <div aria-live="polite" className="sr-only">Latest value {tsRows.length ? tsRows[tsRows.length - 1].y : ''}</div>
          </div>

          <div className="mt-6 rounded-xl border border-border/50 p-4 bg-card/50">
            <DistributionChart data={distribution} />
            <ChartLegend series={[{ name: 'Bucket count' }]} />
            <ChartCaption
              title="Distribution"
              description="Binned counts with Banterblogs styling."
              provenance={{ source: sourceLabel, notes: 'Preview' }}
            />
            <DataTable
              caption="Distribution buckets"
              columns={[{ key: 'x0', label: 'x0' }, { key: 'x1', label: 'x1' }, { key: 'count', label: 'count' }]}
              rows={distribution.buckets as any}
            />
          </div>

          <div className="mt-6 rounded-xl border border-border/50 p-4 bg-card/50">
            <CorrelationChart data={correlation} />
            <ChartLegend
              series={[
                { name: 'Positive correlation', color: 'var(--rp-heat-positive)' },
                { name: 'Negative correlation', color: 'var(--rp-heat-negative)' },
              ]}
            />
            <ChartCaption
              title="Correlation matrix"
              description="Correlation heatmap (-1 to 1) in Banterblogs palette."
              provenance={{ source: sourceLabel, notes: 'Preview' }}
            />
          </div>

          {rangedTimeseries.series.length > 1 && (
            <div className="mt-6 rounded-xl border border-border/50 p-4 bg-card/50">
              <SmallMultiples data={rangedTimeseries} columns={3} />
              <ChartCaption title="Small multiples" description="Series shown individually for clear comparison." />
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
          Select at least one series to view charts.
        </div>
      )}
    </ReportThemeBridge>
  );
}

