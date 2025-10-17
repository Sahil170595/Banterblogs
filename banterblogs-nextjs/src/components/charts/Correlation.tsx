'use client';

import { SVGChart, AnimatedReveal } from './Primitives';
import type { Correlation } from '@/lib/reports/schemas';

interface CorrelationChartProps {
  data: Correlation;
  size?: number;
}

export function CorrelationChart({ data, size = 420 }: CorrelationChartProps) {
  const n = data.variables.length;
  const cell = Math.max(16, Math.floor(size / Math.max(1, n + 1)));
  const pad = 32;
  const w = pad + n * cell + 8;
  const h = pad + n * cell + 8;

  return (
    <SVGChart width={w} height={h}>
      <AnimatedReveal>
        {/* labels */}
        {data.variables.map((v, i) => (
          <g key={v}>
            <text x={0} y={pad + i * cell + cell / 2} dy={4} fontSize={10} fill="hsl(var(--rp-muted))">
              {v}
            </text>
            <text x={pad + i * cell + cell / 2} y={12} textAnchor="middle" fontSize={10} fill="hsl(var(--rp-muted))">
              {v}
            </text>
          </g>
        ))}
        {/* cells */}
        {data.matrix.map((row, i) =>
          row.map((val, j) => {
            const x = pad + j * cell;
            const y = pad + i * cell;
            const base = val >= 0 ? 'var(--rp-heat-positive)' : 'var(--rp-heat-negative)';
            const opacity = 0.2 + Math.min(0.8, Math.abs(val));
            return (
              <rect
                key={`${i}-${j}`}
                x={x}
                y={y}
                width={cell - 2}
                height={cell - 2}
                rx={2}
                fill={base}
                opacity={opacity}
              />
            );
          }),
        )}
      </AnimatedReveal>
    </SVGChart>
  );
}


