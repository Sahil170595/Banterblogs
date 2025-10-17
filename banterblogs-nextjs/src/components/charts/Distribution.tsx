'use client';

import { SVGChart, Grid, AnimatedReveal } from './Primitives';
import type { Distribution } from '@/lib/reports/schemas';
import { getSeriesColor } from '@/lib/reports/colors';

interface DistributionChartProps {
  data: Distribution;
  width?: number;
  height?: number;
}

export function DistributionChart({ data, width = 800, height = 280 }: DistributionChartProps) {
  const margin = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const xMin = Math.min(...data.buckets.map((b) => b.x0));
  const xMax = Math.max(...data.buckets.map((b) => b.x1));
  const yMax = Math.max(...data.buckets.map((b) => b.count), 1);

  const sx = (x: number) => margin.left + ((x - xMin) / Math.max(1, xMax - xMin)) * iw;
  const sy = (y: number) => margin.top + ih - (y / yMax) * ih;

  const xTicks = Array.from({ length: 6 }, (_, i) => margin.left + (i / 5) * iw);
  const yTicks = Array.from({ length: 5 }, (_, i) => margin.top + (i / 4) * ih);

  return (
    <SVGChart width={width} height={height}>
      <Grid xTicks={xTicks} yTicks={yTicks} width={width} height={height} />
      <AnimatedReveal>
        {data.buckets.map((b, i) => {
          const x0 = sx(b.x0);
          const x1 = sx(b.x1);
          const y = sy(b.count);
          return (
            <rect
              key={i}
              x={x0}
              y={y}
              width={Math.max(1, x1 - x0 - 1)}
              height={margin.top + ih - y}
              fill={getSeriesColor(i)}
              opacity={0.55}
              rx={2}
            />
          );
        })}
      </AnimatedReveal>
    </SVGChart>
  );
}


