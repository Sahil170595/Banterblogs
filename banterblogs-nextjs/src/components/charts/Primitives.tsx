'use client';

import { motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

export interface SVGChartProps {
  width: number;
  height: number;
  children: ReactNode;
  style?: CSSProperties;
}

export function SVGChart({ width, height, children, style }: SVGChartProps) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style} role="img">
      {children}
    </svg>
  );
}

export function Grid({ xTicks, yTicks, width, height }: { xTicks: number[]; yTicks: number[]; width: number; height: number }) {
  return (
    <g stroke="hsl(var(--border))" strokeOpacity={0.2} shapeRendering="crispEdges">
      {xTicks.map((x) => (
        <line key={x} x1={x} x2={x} y1={0} y2={height} />
      ))}
      {yTicks.map((y) => (
        <line key={y} x1={0} x2={width} y1={y} y2={y} />
      ))}
    </g>
  );
}

export function Line({ points, color = 'hsl(var(--primary))', strokeWidth = 2 }: { points: Array<{ x: number; y: number }>; color?: string; strokeWidth?: number }) {
  const d = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
}

export function Area({ points, color = 'hsl(var(--primary))', opacity = 0.12 }: { points: Array<{ x: number; y: number }>; color?: string; opacity?: number }) {
  if (points.length === 0) return null;
  const baseline = Math.max(...points.map((p) => p.y));
  const d = `M ${points[0].x},${baseline} ` + points.map((p) => `L ${p.x},${p.y}`).join(' ') + ` L ${points[points.length - 1].x},${baseline} Z`;
  return <path d={d} fill={color} opacity={opacity} />;
}

export function AnimatedReveal({ children }: { children: ReactNode }) {
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.24 }}>
      {children}
    </motion.g>
  );
}



