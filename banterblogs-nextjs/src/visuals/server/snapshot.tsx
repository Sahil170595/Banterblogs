import type { Timeseries } from '@/lib/reports/schemas';

export function renderTimeseriesSVG(data: Timeseries, opts?: { width?: number; height?: number }) {
  const width = opts?.width ?? 800;
  const height = opts?.height ?? 320;
  const margin = { top: 16, right: 16, bottom: 28, left: 44 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const all = data.series.flatMap((s) => s.points);
  const tMin = Math.min(...all.map((p) => p.t));
  const tMax = Math.max(...all.map((p) => p.t));
  const yMin = Math.min(...all.map((p) => p.y));
  const yMax = Math.max(...all.map((p) => p.y));
  const sx = (t: number) => margin.left + ((t - tMin) / Math.max(1, tMax - tMin)) * iw;
  const sy = (y: number) => margin.top + ih - ((y - yMin) / Math.max(1, yMax - yMin)) * ih;

  const paths = data.series.map((s) => {
    const pts = s.points.map((p) => ({ x: sx(p.t), y: sy(p.y) }));
    const d = pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    const color = s.color ?? '#a78bfa';
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#0b0b0c" />
    ${paths.join('\n')}
  </svg>`;
}



