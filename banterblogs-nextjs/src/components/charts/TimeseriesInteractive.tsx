'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import type { Timeseries } from '@/lib/reports/schemas';
import { SVGChart, Grid, Line, Area } from './Primitives';
import { lttb } from '@/visuals/utils/decimate';
import { getSeriesColor } from '@/lib/reports/colors';

interface TimeseriesInteractiveProps {
  data: Timeseries;
  width?: number;
  height?: number;
  timeIsEpoch?: boolean;
}

export function TimeseriesInteractive({ data, width = 800, height = 320, timeIsEpoch = true }: TimeseriesInteractiveProps) {
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
  const st = (x: number) => tMin + ((x - margin.left) / Math.max(1, iw)) * (tMax - tMin);

  const decimatedSeries = useMemo(() => data.series.map((s) => ({
    ...s,
    points: s.points.length > 2000 ? lttb(s.points as any, 2000) : s.points,
  })), [data]);

  const [hover, setHover] = useState<{ x: number; t: number; y: number; label: string } | null>(null);
  const [drag, setDrag] = useState<{ startX: number; endX: number } | null>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const x = e.nativeEvent.offsetX;
    const t = st(x);
    // find nearest point from first series for tooltip
    const s = decimatedSeries[0];
    if (!s) return;
    let nearest = s.points[0]; let nd = Infinity;
    for (const p of s.points) { const d = Math.abs(p.t - t); if (d < nd) { nd = d; nearest = p; } }
    setHover({ x: sx(nearest.t), t: nearest.t, y: nearest.y, label: s.name });
    if (liveRef.current) {
      const timeLabel = timeIsEpoch ? new Date(nearest.t).toLocaleString() : nearest.t.toString();
      liveRef.current.textContent = `Value ${nearest.y.toFixed(3)} at ${timeLabel}`;
    }
    setKeyboardIndex(null);
  };

  const onDown = (e: MouseEvent<SVGRectElement>) => {
    setDrag({ startX: e.nativeEvent.offsetX, endX: e.nativeEvent.offsetX });
  };
  const onUp = () => {
    setDrag(null);
  };
  const onDrag = (e: MouseEvent<SVGRectElement>) => {
    if (drag) setDrag({ ...drag, endX: e.nativeEvent.offsetX });
  };

  useEffect(() => {
    setKeyboardIndex(null);
    setHover(null);
  }, [data]);

  const handleKeyDown = (e: KeyboardEvent<SVGRectElement>) => {
    const primary = decimatedSeries[0];
    if (!primary) return;
    const length = primary.points.length;
    if (!length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      let next = keyboardIndex ?? (e.key === 'ArrowLeft' ? length - 1 : 0);
      if (e.key === 'ArrowRight') next = Math.min(length - 1, next + 1);
      if (e.key === 'ArrowLeft') next = Math.max(0, next - 1);
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = length - 1;
      const point = primary.points[next];
      setKeyboardIndex(next);
      setHover({ x: sx(point.t), t: point.t, y: point.y, label: primary.name });
      if (liveRef.current) {
        const timeLabel = timeIsEpoch ? new Date(point.t).toLocaleString() : point.t.toString();
        liveRef.current.textContent = `Value ${point.y.toFixed(3)} at ${timeLabel}`;
      }
    }
  };

  const xTicks = Array.from({ length: 6 }, (_, i) => margin.left + (i / 5) * iw);
  const yTicks = Array.from({ length: 5 }, (_, i) => margin.top + (i / 4) * ih);

  return (
    <div>
      <SVGChart width={width} height={height}>
        <g>
          <Grid xTicks={xTicks} yTicks={yTicks} width={width} height={height} />
          <g>
            {decimatedSeries.map((s, idx) => {
              const pts = s.points.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
              const color = s.color ?? getSeriesColor(idx);
              return (
                <g key={s.name + idx}>
                  <Area points={pts} color={color} opacity={0.18} />
                  <Line points={pts} color={color} />
                </g>
              );
            })}
          </g>
          {/* interactive overlay */}
          <rect
            x={margin.left}
            y={margin.top}
            width={iw}
            height={ih}
            fill="transparent"
            onMouseMove={onMove}
            onMouseDown={onDown}
            onMouseUp={onUp}
            onMouseLeave={() => setHover(null)}
            onMouseEnter={() => undefined}
            onMouseMoveCapture={onDrag}
            role="presentation"
            aria-label="Time series chart interactive layer"
            tabIndex={0}
            onKeyDown={handleKeyDown}
          />
          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={margin.top} y2={margin.top + ih} stroke="hsl(var(--rp-accent))" strokeDasharray="4 4" />
            </g>
          )}
          {drag && (
            <rect x={Math.min(drag.startX, drag.endX)} y={margin.top} width={Math.abs(drag.endX - drag.startX)} height={ih} fill="hsl(var(--rp-accent))" opacity={0.15} />
          )}
        </g>
      </SVGChart>
      {/* Tooltip */}
      {hover && (
        <div className="mt-2 inline-flex rounded-md border border-border/60 bg-card/60 px-2 py-1 text-xs text-foreground">
          <span className="font-medium mr-2">{hover.label}</span>
          <span>{hover.y.toFixed(3)}</span>
          <span className="mx-1">·</span>
          <span>{timeIsEpoch ? new Date(hover.t).toLocaleString() : hover.t}</span>
        </div>
      )}
      <div ref={liveRef} aria-live="polite" className="sr-only" />
    </div>
  );
}


