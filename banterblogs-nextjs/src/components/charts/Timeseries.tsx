'use client';

import { AnimatedReveal, Area, Grid, Line, SVGChart } from './Primitives';
import { Axes } from './Axes';
import type { Timeseries } from '@/lib/reports/schemas';
import { lttb } from '@/visuals/utils/decimate';
import { getSeriesColor } from '@/lib/reports/colors';

interface TimeseriesChartProps {
  data: Timeseries;
  width?: number;
  height?: number;
}

export function TimeseriesChart({ data, width = 800, height = 320 }: TimeseriesChartProps) {
  // Simple scales (placeholder). In production, compute from data extent.
  const margin = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const allPoints = data.series.flatMap((s) => s.points);
  const tMin = Math.min(...allPoints.map((p) => p.t));
  const tMax = Math.max(...allPoints.map((p) => p.t));
  const yMin = Math.min(...allPoints.map((p) => p.y));
  const yMax = Math.max(...allPoints.map((p) => p.y));

  const sx = (t: number) => margin.left + ((t - tMin) / Math.max(1, tMax - tMin)) * iw;
  const sy = (y: number) => margin.top + ih - ((y - yMin) / Math.max(1, yMax - yMin)) * ih;

  const xTicks = Array.from({ length: 6 }, (_, i) => margin.left + (i / 5) * iw);
  const yTicks = Array.from({ length: 5 }, (_, i) => margin.top + (i / 4) * ih);

  return (
    <SVGChart width={width} height={height}>
      <g>
        <Grid xTicks={xTicks} yTicks={yTicks} width={width} height={height} />
        <Axes
          type="x"
          scale={sx}
          domain={[tMin, tMax]}
          width={width}
          height={height}
          margin={margin}
        />
        <Axes
          type="y"
          scale={sy}
          domain={[yMin, yMax]}
          width={width}
          height={height}
          margin={margin}
        />
        <g>
          {data.series.map((s, idx) => {
            const decimated = s.points.length > 2000 ? lttb(s.points as any, 2000) : s.points;
            const pts = decimated.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
            const color = s.color ?? getSeriesColor(idx);
            return (
              <AnimatedReveal key={s.name + idx}>
                <Area points={pts} color={color} opacity={0.08} />
                <Line points={pts} color={color} />
              </AnimatedReveal>
            );
          })}
        </g>
      </g>
      {/* a11y live region mirror (hidden) updated externally by client wrapper */}
      <title>{data.series.map((s) => s.name).join(', ')}</title>
    </SVGChart>
  );
}


