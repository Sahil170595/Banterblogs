'use client';

import { SVGChart, Line, Area } from './Primitives';
import { getSeriesColor } from '@/lib/reports/colors';

interface SparklineKPIProps {
  label: string;
  value: number;
  delta?: number;
  trend: number[];
  colorIndex?: number;
}

export function SparklineKPI({ label, value, delta, trend, colorIndex = 0 }: SparklineKPIProps) {
  const width = 160;
  const height = 56;
  const pad = 6;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const sx = (i: number) => pad + (i / Math.max(1, trend.length - 1)) * iw;
  const sy = (y: number) => pad + ih - ((y - min) / Math.max(1, max - min)) * ih;
  const pts = trend.map((y, i) => ({ x: sx(i), y: sy(y) }));
  const color = getSeriesColor(colorIndex);

  const deltaColor = delta === undefined ? 'text-muted-foreground' : delta >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="rounded-lg border border-border/50 p-3 bg-card/50">
      <div className="flex items-baseline justify-between mb-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        {delta !== undefined && <div className={`text-xs ${deltaColor}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}%</div>}
      </div>
      <div className="text-lg font-semibold text-foreground mb-1">{Intl.NumberFormat('en-US').format(value)}</div>
      <SVGChart width={width} height={height}>
        <Area points={pts} color={color} opacity={0.25} />
        <Line points={pts} color={color} />
      </SVGChart>
    </div>
  );
}


