'use client';

import { SVGChart, Line, Area } from './Primitives';
import type { Timeseries } from '@/lib/reports/schemas';
import { getSeriesColor } from '@/lib/reports/colors';

interface SmallMultiplesProps {
  data: Timeseries;
  columns?: number;
}

export function SmallMultiples({ data, columns = 2 }: SmallMultiplesProps) {
  const width = 320;
  const height = 120;
  const pad = 10;
  const iw = width - pad * 2;
  const ih = height - pad * 2;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {data.series.map((s, idx) => {
        const tMin = Math.min(...s.points.map((p) => p.t));
        const tMax = Math.max(...s.points.map((p) => p.t));
        const yMin = Math.min(...s.points.map((p) => p.y));
        const yMax = Math.max(...s.points.map((p) => p.y));
        const sx = (t: number) => pad + ((t - tMin) / Math.max(1, tMax - tMin)) * iw;
        const sy = (y: number) => pad + ih - ((y - yMin) / Math.max(1, yMax - yMin)) * ih;
        const pts = s.points.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
        const color = s.color ?? getSeriesColor(idx);
        return (
          <div key={s.name} className="rounded-lg border border-border/50 p-2 bg-card/40">
            <div className="mb-1 text-xs text-muted-foreground truncate">{s.name}</div>
            <SVGChart width={width} height={height}>
              <Area points={pts} color={color} opacity={0.18} />
              <Line points={pts} color={color} />
            </SVGChart>
          </div>
        );
      })}
    </div>
  );
}



