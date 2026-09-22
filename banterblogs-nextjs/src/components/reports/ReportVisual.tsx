import { createElement } from 'react';
import { classifyReportSlug, PHASE_DEFINITIONS, type PhaseKey } from '@/lib/reports/phases';

// The archive cards' per-report picture: an abstract, monochrome SVG in one of
// five families. The phase picks the family and its variant; a hash of the
// slug picks a composition inside the family (a layout, sometimes mirrored)
// and its parameters, so a report always draws the same picture, a phase
// reads as one series, and a row of one phase never repeats a single image.
// Integer PRNG and plain arithmetic only, so the server and every browser
// produce identical markup. Strokes and the ember accent are styled by the
// .rv rules in globals.css.

export const VISUAL_FAMILIES = ['dots', 'fan', 'bars', 'arcs', 'wave'] as const;
export type VisualFamily = (typeof VISUAL_FAMILIES)[number];
export type Variant = 0 | 1;

/** markup budget per visual, so ~60 cards stay light in the archive HTML */
export const MAX_VISUAL_BYTES = 1800;

const W = 320;
const H = 180;
const CX = W / 2;
// the drawing frame inside the viewBox
const L = 22;
const R = 298;
const T = 18;
const B = 162;

const PHASE_STYLE: Record<PhaseKey | 'compendium', readonly [VisualFamily, Variant]> = {
  phase0: ['wave', 0],
  phase1: ['dots', 0],
  phase2: ['bars', 0],
  phase3: ['fan', 0],
  phase4: ['arcs', 0],
  phase5: ['wave', 1],
  phase6: ['arcs', 1],
  phase7: ['dots', 1],
  phase8: ['bars', 1],
  phase9: ['fan', 1],
  compendium: ['arcs', 0],
};
const DEFAULT_STYLE: readonly [VisualFamily, Variant] = ['wave', 0];
// plate marks in the top corners: a synthesis document, not a single study
const SYNTHESIS_MARKS = 'M10 17V10H17M303 10H310V17';

type Rng = () => number;
type Mirror = 'x' | 'y';
interface Shape {
  tag: 'path' | 'rect' | 'circle';
  cls: string;
  props: Record<string, string | number>;
}
interface Drawing {
  shapes: Shape[];
  layout: number;
  mirror?: Mirror;
}
const MIRROR_TRANSFORM: Record<Mirror, string> = {
  x: `matrix(-1 0 0 1 ${W} 0)`,
  y: `matrix(1 0 0 -1 0 ${H})`,
};

const n1 = (v: number) => String(Math.round(v * 10) / 10);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const shape = (tag: Shape['tag'], cls: string, props: Shape['props']): Shape => ({ tag, cls, props });

// FNV-1a over the slug, then mulberry32: integer ops only
function hashSlug(slug: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seeded(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (r: Rng, lo: number, hi: number) => lo + (hi - lo) * r();
const pick = (r: Rng, n: number) => Math.floor(r() * n);
const chance = (r: Rng, p: number) => r() < p;

// ---- dots: 4x4 Bayer-dithered blocks; a density gradient (0) or dense cores (1)
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DOTS_PER_BLOCK = 4;
const DOT_PITCH = 8;
// block grids that each fill the frame: blocks across and down, gaps; the
// 2-unit gaps read as one continuous dithered field
const DOT_LAYOUTS = [
  { cols: 7, rows: 3, gapX: 8, gapY: 12 },
  { cols: 8, rows: 3, gapX: 2, gapY: 2 },
  { cols: 6, rows: 2, gapX: 14, gapY: 18 },
  { cols: 5, rows: 3, gapX: 24, gapY: 12 },
] as const;
// the hover accent lights a block at least this dense, so the ember reads
const ACCENT_MIN_DENSITY = 0.55;

function dots(r: Rng, variant: Variant): Drawing {
  const layout = pick(r, DOT_LAYOUTS.length);
  const { cols, rows, gapX, gapY } = DOT_LAYOUTS[layout];
  const perBlock = DOTS_PER_BLOCK;
  const block = perBlock * DOT_PITCH;
  const x0 = (W - (cols * block + (cols - 1) * gapX)) / 2;
  const y0 = (H - (rows * block + (rows - 1) * gapY)) / 2;
  const u = (c: number) => c / (cols - 1);
  const v = (row: number) => (rows > 1 ? row / (rows - 1) : 0);
  let density: (c: number, row: number) => number;
  let mirror: Mirror | undefined;
  if (variant === 0) {
    const hi = between(r, 0.94, 1);
    const lo = between(r, 0.02, 0.12);
    const field = pick(r, 3);
    const along = (c: number, row: number) => (field === 0 ? u(c) : field === 1 ? 0.7 * v(row) + 0.3 * u(c) : (u(c) + v(row)) / 2);
    density = (c, row) => clamp(hi + (lo - hi) * along(c, row), 0, 1);
    mirror = chance(r, 0.5) ? 'x' : undefined;
  } else {
    const cores: Array<[number, number]> = [];
    for (let i = 0, n = 1 + pick(r, 2); i < n; i++) cores.push([between(r, 0.5, cols - 1.5), between(r, 0, rows - 1)]);
    const reach = (between(r, 2.8, 4.4) * cols) / 7;
    density = (c, row) => {
      let nearest: number = cols;
      for (const [cx, cy] of cores) {
        const dx = c - cx;
        const dy = (row - cy) * 1.4;
        nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
      }
      return clamp(1.08 - nearest / reach, 0.02, 1);
    };
  }
  const dense: Array<[number, number]> = [];
  for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) if (density(c, row) > ACCENT_MIN_DENSITY) dense.push([c, row]);
  const [ac, ar] = dense.length ? dense[pick(r, dense.length)] : [0, 0];
  const paths = { base: [] as string[], accent: [] as string[] };
  for (let row = 0; row < rows; row++) {
    for (let dy = 0; dy < perBlock; dy++) {
      const y = y0 + row * (block + gapY) + dy * DOT_PITCH + DOT_PITCH / 2;
      const last: Record<'base' | 'accent', number | null> = { base: null, accent: null };
      for (let c = 0; c < cols; c++) {
        const which = c === ac && row === ar ? 'accent' : 'base';
        for (let dx = 0; dx < perBlock; dx++) {
          if ((BAYER_4X4[dy * perBlock + dx] + 0.5) / (perBlock * perBlock) >= density(c, row)) continue;
          const x = x0 + c * (block + gapX) + dx * DOT_PITCH + DOT_PITCH / 2;
          const prev = last[which];
          paths[which].push(prev === null ? `M${n1(x)} ${n1(y)}h0` : `m${n1(x - prev)} 0h0`);
          last[which] = x;
        }
      }
    }
  }
  const shapes = [shape('path', 'd', { d: paths.base.join(''), strokeWidth: DOT_PITCH })];
  if (paths.accent.length) shapes.push(shape('path', 'd h', { d: paths.accent.join(''), strokeWidth: DOT_PITCH }));
  return { shapes, layout, mirror };
}

// ---- fan: perspective fans from the corners (0) or a projection cone (1)
function fan(r: Rng, variant: Variant): Drawing {
  const frame = shape('rect', 'l', { x: L, y: T, width: R - L, height: B - T });
  if (variant === 1) return projection(r, frame);
  const stops: number[] = [];
  const ratio = between(r, 0.66, 0.86);
  let s = 1;
  for (let i = 0, n = 6 + pick(r, 8); i < n; i++) {
    s *= ratio;
    stops.push(s);
  }
  if (chance(r, 0.34)) {
    // twin fan: both bottom corners reach the same stops, denser toward the sides
    const xs = stops.flatMap((f) => [CX - (CX - L) * (1 - f), CX + (R - CX) * (1 - f)]);
    return {
      layout: 1,
      mirror: chance(r, 0.5) ? 'y' : undefined,
      shapes: [
        frame,
        shape('path', 'l', { d: xs.map((x) => `M${n1(x)} ${T}V${B}`).join('') }),
        shape('path', 'l', { d: xs.map((x) => `M${L} ${B}L${n1(x)} ${T}M${R} ${B}L${n1(x)} ${T}`).join('') }),
        shape('path', 'h', { d: `M${L} ${B}L${CX} ${T}L${R} ${B}` }),
      ],
    };
  }
  const xs = stops.map((f) => R - (R - L) * f);
  const edge: number[] = [];
  for (let j = 1, m = 2 + pick(r, 3); j <= m; j++) edge.push(T + ((B - T) * j * j) / ((m + 1) * (m + 1)));
  const mirrors: Array<Mirror | undefined> = [undefined, 'x', 'y'];
  return {
    layout: 0,
    mirror: mirrors[pick(r, mirrors.length)],
    shapes: [
      frame,
      shape('path', 'l', { d: xs.map((x) => `M${n1(x)} ${T}V${B}`).join('') }),
      shape('path', 'l', { d: [...xs.map((x) => `M${L} ${B}L${n1(x)} ${T}`), ...edge.map((y) => `M${L} ${B}L${R} ${n1(y)}`)].join('') }),
      shape('path', 'h', { d: `M${L} ${B}L${R} ${T}` }),
    ],
  };
}

function projection(r: Rng, frame: Shape): Drawing {
  const now = L + (R - L) * between(r, 0.34, 0.46);
  let y = between(r, 96, 120);
  const observed: Array<[number, number]> = [[L, y]];
  const steps = 5 + pick(r, 4);
  for (let i = 1; i <= steps; i++) {
    y = clamp(y + between(r, -12, 10), T + 20, B - 20);
    observed.push([L + ((now - L) * i) / steps, y]);
  }
  const [ox, oy] = observed[observed.length - 1];
  const rays = 7 + 2 * pick(r, 3);
  const spread = between(r, 44, 70);
  const drift = between(r, -26, 18);
  const ends: number[] = [];
  for (let j = 0; j < rays; j++) ends.push(clamp(oy + drift + spread * ((2 * j) / (rays - 1) - 1), T, B));
  return {
    layout: 0,
    mirror: chance(r, 0.5) ? 'y' : undefined,
    shapes: [
      frame,
      shape('path', 'l', { d: [1, 2, 3].map((k) => `M${L} ${n1(T + ((B - T) * k) / 4)}H${R}`).join(''), strokeDasharray: '1 4' }),
      shape('path', 'l', { d: ends.map((ey) => `M${n1(ox)} ${n1(oy)}L${R} ${n1(ey)}`).join('') }),
      shape('path', 'k', { d: `M${n1(ox)} ${T}V${B}`, strokeDasharray: '2 3' }),
      shape('path', 'k', { d: 'M' + observed.map(([x, py]) => `${n1(x)} ${n1(py)}`).join('L') }),
      shape('path', 'h', { d: `M${n1(ox)} ${n1(oy)}L${R} ${n1(clamp(oy + drift, T, B))}` }),
    ],
  };
}

// ---- bars: benchmark comparisons (0) or throughput that breaks down (1)
const BAR_BASE = 150;
const BAR_TOP = 30;
const BAR_LEVELS = 7;
const BAR_STEP = (BAR_BASE - BAR_TOP) / BAR_LEVELS;
const BAR_GUIDES = `M${L} ${n1(BAR_BASE - 2 * BAR_STEP)}H${R}M${L} ${n1(BAR_BASE - 4 * BAR_STEP)}H${R}M${L} ${n1(BAR_BASE - 6 * BAR_STEP)}H${R}`;

interface Bar {
  x: number;
  w: number;
  level: number;
  broken?: boolean;
}

function evenBars(levels: number[], widthRatio: number, brokenFrom = levels.length): Bar[] {
  const pitch = (R - L) / levels.length;
  const w = pitch * widthRatio;
  return levels.map((level, i) => ({ x: L + i * pitch + (pitch - w) / 2, w, level, broken: i >= brokenFrom }));
}

function drawBars(bars: Bar[], accentAt: number): Shape[] {
  const solid: string[] = [];
  const broken: string[] = [];
  const caps: string[] = [];
  let accent = '';
  bars.forEach((bar, i) => {
    const y = BAR_BASE - bar.level * BAR_STEP;
    const outline = `M${n1(bar.x)} ${BAR_BASE}V${n1(y)}H${n1(bar.x + bar.w)}V${BAR_BASE}`;
    if (i === accentAt) {
      accent = outline;
      return;
    }
    (bar.broken ? broken : solid).push(outline);
    caps.push(`M${n1(bar.x)} ${n1(y)}H${n1(bar.x + bar.w)}`);
  });
  const shapes = [shape('path', 'l', { d: BAR_GUIDES, strokeDasharray: '1 4' })];
  if (solid.length) shapes.push(shape('path', 'l', { d: solid.join('') }));
  if (broken.length) shapes.push(shape('path', 'l', { d: broken.join(''), strokeDasharray: '2 2' }));
  shapes.push(shape('path', 'k', { d: `${caps.join('')}M${L} ${BAR_BASE}H${R}` }));
  if (accent) shapes.push(shape('path', 'h', { d: accent }));
  return shapes;
}

function climb(r: Rng, n: number, start: number, p: number): number[] {
  const levels: number[] = [];
  let level = start;
  for (let i = 0; i < n; i++) {
    if (i > 0 && chance(r, p)) level = Math.min(BAR_LEVELS, level + 1);
    levels.push(level);
  }
  return levels;
}

function bars(r: Rng, variant: Variant): Drawing {
  const widthRatio = between(r, 0.34, 0.66);
  if (variant === 0) {
    const layout = pick(r, 3);
    if (layout === 0) {
      const levels = climb(r, 10 + pick(r, 11), 1 + pick(r, 2), between(r, 0.35, 0.65));
      return { layout, mirror: chance(r, 0.5) ? 'x' : undefined, shapes: drawBars(evenBars(levels, widthRatio), levels.indexOf(Math.max(...levels))) };
    }
    if (layout === 1) return { layout, shapes: clusteredBars(r, widthRatio) };
    return { layout, shapes: rankedBars(r) };
  }
  const layout = pick(r, 4);
  const mirror = layout < 3 && chance(r, 0.5) ? 'x' : undefined;
  const n = 10 + pick(r, 9);
  const cliff = Math.floor(n * between(r, 0.5, 0.76));
  if (layout === 0) {
    const levels = [...climb(r, cliff, 2, 0.7), ...Array.from({ length: n - cliff }, () => 1 + pick(r, 2))];
    return { layout, mirror, shapes: drawBars(evenBars(levels, widthRatio, cliff), cliff - 1) };
  }
  if (layout === 1) {
    // a plateau that holds, then steps down
    const levels: number[] = [];
    for (let i = 0; i < n; i++) levels.push(i < cliff ? Math.min(BAR_LEVELS, 3 + i * 2) : Math.max(1, BAR_LEVELS - Math.ceil((i - cliff + 1) * between(r, 0.8, 1.6))));
    return { layout, mirror, shapes: drawBars(evenBars(levels, widthRatio, cliff), cliff - 1) };
  }
  if (layout === 2) return { layout, mirror, shapes: tickBars(r) };
  return { layout, shapes: pairedBars(r) };
}

function clusteredBars(r: Rng, widthRatio: number): Shape[] {
  const clusters = 3 + pick(r, 2);
  const per = 3 + pick(r, 3);
  const pitch = (R - L) / (clusters * per + clusters - 1);
  const w = pitch * widthRatio;
  const bars: Bar[] = [];
  for (let c = 0; c < clusters; c++) {
    climb(r, per, 1 + pick(r, 3), 0.6).forEach((level, i) => bars.push({ x: L + (c * (per + 1) + i) * pitch + (pitch - w) / 2, w, level }));
  }
  const top = Math.max(...bars.map((bar) => bar.level));
  return drawBars(bars, bars.findIndex((bar) => bar.level === top));
}

function rankedBars(r: Rng): Shape[] {
  const rows = 7 + pick(r, 4);
  const pitch = (B - T - 12) / rows;
  const h = pitch * between(r, 0.38, 0.6);
  let length = (R - L) * between(r, 0.86, 1);
  const outlines: string[] = [];
  let accent = '';
  for (let i = 0; i < rows; i++) {
    const y = T + 6 + i * pitch;
    const x = L + length;
    const outline = `M${L} ${n1(y)}H${n1(x)}V${n1(y + h)}H${L}`;
    if (i === 0) accent = outline;
    else outlines.push(outline);
    length *= between(r, 0.76, 0.95);
  }
  const quarters = [0.25, 0.5, 0.75].map((q) => `M${n1(L + (R - L) * q)} ${T}V${B}`).join('');
  return [
    shape('path', 'l', { d: quarters, strokeDasharray: '1 4' }),
    shape('path', 'l', { d: outlines.join('') }),
    shape('path', 'k', { d: `M${L} ${T}V${B}` }),
    shape('path', 'h', { d: accent }),
  ];
}

// a dense histogram of 1px ticks: a rise, then the ticks past the cliff dashed
function tickBars(r: Rng): Shape[] {
  const n = 28 + pick(r, 13);
  const cliff = Math.floor(n * between(r, 0.5, 0.75));
  const pitch = (R - L) / (n - 1);
  const held: string[] = [];
  const fell: string[] = [];
  let accent = '';
  let level = between(r, 0.15, 0.3);
  for (let i = 0; i < n; i++) {
    level = i < cliff ? clamp(level + between(r, 0, 0.07), 0, 1) : between(r, 0.06, 0.2);
    const x = n1(L + i * pitch);
    const tick = `M${x} ${BAR_BASE}V${n1(BAR_BASE - level * (BAR_BASE - BAR_TOP))}`;
    if (i === cliff - 1) accent = tick;
    else (i < cliff ? held : fell).push(tick);
  }
  return [
    shape('path', 'l', { d: BAR_GUIDES, strokeDasharray: '1 4' }),
    shape('path', 'l', { d: held.join('') }),
    shape('path', 'l', { d: fell.join(''), strokeDasharray: '2 2' }),
    shape('path', 'k', { d: `M${L} ${BAR_BASE}H${R}` }),
    shape('path', 'h', { d: accent }),
  ];
}

// two series side by side: one holds, the other breaks at the cliff
function pairedBars(r: Rng): Shape[] {
  const pairs = 6 + pick(r, 4);
  const cliff = 2 + pick(r, pairs - 3);
  const pitch = (R - L) / pairs;
  const w = pitch * 0.3;
  const bars: Bar[] = [];
  let held = 2;
  let failing = 2;
  for (let i = 0; i < pairs; i++) {
    held = Math.min(BAR_LEVELS, held + pick(r, 2));
    failing = i < cliff ? Math.min(BAR_LEVELS, failing + pick(r, 2)) : 1;
    const x = L + i * pitch + pitch * 0.16;
    bars.push({ x, w, level: held }, { x: x + w + pitch * 0.08, w, level: failing, broken: i >= cliff });
  }
  return drawBars(bars, 2 * cliff);
}

// ---- arcs: rings around an off-frame centre with a needle (0) or a gauge (1)
// sparse dashes only: dense dash patterns on large rings rasterize slowly
const RING_DASHES = [null, null, '3 5'] as const;
// Gauge ticks are short 1px lines, not dashed circles: a thick dashed ring
// cost a 50ms GPU raster the first time a row of cards scrolled in. Unit
// vectors every 15 degrees, clockwise from 3 o'clock (SVG y points down),
// built from literal constants so no engine's Math.sin decides the markup.
const DIAL_QUADRANT = [
  [1, 0],
  [0.9659, 0.2588],
  [0.866, 0.5],
  [0.7071, 0.7071],
  [0.5, 0.866],
  [0.2588, 0.9659],
] as const;
const DIAL: ReadonlyArray<readonly [number, number]> = [0, 1, 2, 3].flatMap((q) =>
  DIAL_QUADRANT.map(([x, y]): readonly [number, number] => (q === 0 ? [x, y] : q === 1 ? [-y, x] : q === 2 ? [-x, -y] : [y, -x])),
);
const DIAL_MAJOR_EVERY = 3;
// the linear scale's minor and major tick spacing, in viewBox units
const SCALE_MINOR_STEP = 8;
const SCALE_MAJOR_STEP = 40;

// radial ticks centred on radius r: every `step`th dial position, majors longer
function dialTicks(cx: number, cy: number, r: number, step: number): { minor: string; major: string } {
  const minor: string[] = [];
  const major: string[] = [];
  DIAL.forEach(([ux, uy], i) => {
    if (i % step) return;
    const isMajor = i % (step * DIAL_MAJOR_EVERY) === 0;
    const half = isMajor ? 4 : 2;
    const tick = `M${n1(cx + ux * (r - half))} ${n1(cy + uy * (r - half))}L${n1(cx + ux * (r + half))} ${n1(cy + uy * (r + half))}`;
    (isMajor ? major : minor).push(tick);
  });
  return { minor: minor.join(''), major: major.join('') };
}

function rings(r: Rng, cx: number, cy: number, count: number, r0: number, gap: number, accentAt: number): Shape[] {
  return Array.from({ length: count }, (_, i) => {
    const dash = i === accentAt ? null : RING_DASHES[pick(r, RING_DASHES.length)];
    return shape('circle', i === accentAt ? 'h' : 'l', { cx: n1(cx), cy: n1(cy), r: n1(r0 + i * gap), ...(dash ? { strokeDasharray: dash } : {}) });
  });
}

function arcs(r: Rng, variant: Variant): Drawing {
  if (variant === 1) return gauge(r);
  const layout = pick(r, 3);
  const count = 7 + pick(r, 3);
  const accentAt = 2 + pick(r, count - 3);
  let cx: number;
  let cy: number;
  let r0: number;
  let gap: number;
  let needle: string;
  let angle: number;
  if (layout === 0) {
    [cx, cy, r0, gap] = [CX + between(r, -36, 36), 178, between(r, 14, 22), between(r, 12, 14.5)];
    needle = `M${n1(cx)} ${cy}V${n1(cy - r0 - (count - 1) * gap)}`;
    angle = Math.round(between(r, -48, 48));
  } else if (layout === 1) {
    [cx, cy, r0, gap] = [between(r, -24, 8), between(r, 72, 108), between(r, 24, 40), between(r, 22, 30)];
    needle = `M${n1(cx)} ${n1(cy)}H${n1(cx + r0 + (count - 1) * gap)}`;
    angle = Math.round(between(r, -34, 34));
  } else {
    [cx, cy, r0, gap] = [306, 8, between(r, 26, 40), between(r, 18, 24)];
    needle = `M${cx} ${cy}H${n1(cx - r0 - (count - 1) * gap)}`;
    angle = Math.round(between(r, 12, 62));
  }
  return {
    layout,
    shapes: [...rings(r, cx, cy, count, r0, gap, accentAt), shape('path', 'k', { d: needle, transform: `rotate(${angle} ${n1(cx)} ${n1(cy)})` })],
  };
}

function gauge(r: Rng): Drawing {
  const layout = pick(r, 4);
  const certified = Math.round(between(r, 54, 92));
  if (layout === 0) {
    const cy = 94;
    const r0 = between(r, 10, 16);
    const step = between(r, 9, 13);
    const count = Math.min(3 + pick(r, 4), Math.floor((62 - r0) / step) + 1);
    const outer = r0 + (count - 1) * step;
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) shapes.push(shape('circle', 'l', { cx: CX, cy, r: n1(r0 + i * step), ...(chance(r, 0.5) ? { strokeDasharray: '2 3' } : {}) }));
    const dial = dialTicks(CX, cy, outer + 14, 1 + pick(r, 2));
    shapes.push(shape('path', 'l', { d: dial.minor }), shape('path', 'k', { d: dial.major }));
    shapes.push(shape('circle', 'h', { cx: CX, cy, r: n1(outer + 6), pathLength: 100, strokeDasharray: `${certified} 100`, transform: `rotate(-90 ${CX} ${cy})` }));
    if (chance(r, 0.5) && count > 1) {
      const inner = Math.round(certified * between(r, 0.4, 0.8));
      shapes.push(shape('circle', 'k', { cx: CX, cy, r: n1(r0 + step), pathLength: 100, strokeDasharray: `${inner} 100`, transform: `rotate(-90 ${CX} ${cy})` }));
    }
    shapes.push(shape('path', 'k', { d: `M${CX - 5} ${cy}H${CX + 5}M${CX} ${cy - 5}V${cy + 5}` }));
    return { layout, shapes };
  }
  if (layout === 1) {
    // twin gauges, the higher reading lit
    const other = Math.round(between(r, 30, 88));
    const lit = other > certified ? 1 : 0;
    const shapes: Shape[] = [];
    [certified, other].forEach((reading, i) => {
      const gx = CX + (i ? 62 : -62);
      shapes.push(shape('circle', 'l', { cx: gx, cy: 92, r: 13 }), shape('circle', 'l', { cx: gx, cy: 92, r: 25, strokeDasharray: '2 3' }));
      const dial = dialTicks(gx, 92, 46, 2);
      shapes.push(shape('path', 'l', { d: dial.minor }), shape('path', 'k', { d: dial.major }));
      shapes.push(
        shape('circle', i === lit ? 'h' : 'k', {
          cx: gx,
          cy: 92,
          r: 38,
          pathLength: 100,
          strokeDasharray: `${reading} 100`,
          transform: `rotate(-90 ${gx} 92)`,
        }),
      );
    });
    return { layout, shapes };
  }
  if (layout === 2) {
    // a quarter dial from the bottom-left corner of the frame
    const step = between(r, 18, 22);
    const count = Math.min(5 + pick(r, 3), Math.floor((140 - 34) / step) + 1);
    const quarter = { pathLength: 400, transform: `rotate(-90 ${L} ${B})` };
    const shapes: Shape[] = [];
    for (let i = 0; i < count; i++) shapes.push(shape('circle', i % 2 ? 'k' : 'l', { cx: L, cy: B, r: n1(34 + i * step), strokeDasharray: '100 300', ...quarter }));
    const outer = 34 + (count - 1) * step;
    shapes.push(shape('circle', 'h', { cx: L, cy: B, r: n1(outer + 10), strokeDasharray: `${certified} 400`, ...quarter }));
    shapes.push(shape('path', 'k', { d: `M${L} ${B}H${n1(L + outer + 10)}`, transform: `rotate(${n1(-90 + 0.9 * certified)} ${L} ${B})` }));
    return { layout, shapes };
  }
  // a linear certification scale with the reading marked on it
  const scale = 118;
  const reach = L + ((R - L) * certified) / 100;
  const minorTicks = `M${L} ${scale - 5}v10` + `m${SCALE_MINOR_STEP} -10v10`.repeat(Math.floor((R - L) / SCALE_MINOR_STEP));
  const majorTicks = `M${L} ${scale - 10}v20` + `m${SCALE_MAJOR_STEP} -20v20`.repeat(Math.floor((R - L) / SCALE_MAJOR_STEP));
  return {
    layout,
    shapes: [
      shape('path', 'l', { d: minorTicks }),
      shape('path', 'l', { d: majorTicks }),
      shape('path', 'k', { d: `M${L} ${scale}H${R}` }),
      shape('circle', 'l', { cx: n1(reach), cy: 84, r: 14 }),
      shape('circle', 'l', { cx: n1(reach), cy: 84, r: 24, strokeDasharray: '2 3' }),
      shape('path', 'k', { d: `M${n1(reach)} 84V${scale}`, strokeDasharray: '2 3' }),
      shape('path', 'h', { d: `M${L} 84H${n1(reach)}` }),
      shape('circle', 'h', { cx: n1(reach), cy: 84, r: 4 }),
    ],
  };
}

// ---- wave: vertical ticks along a trace; calm (0) or with one perturbation
// window whose ticks spike (1); symmetric, one-sided or two stacked traces
const WAVE_MIN_AMP = 1.5;

function amplitudes(r: Rng, n: number, window: [number, number] | null, ceiling: number): number[] {
  let envelope = between(r, 0.25, 0.5);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    envelope = clamp(envelope + between(r, -0.09, 0.09), 0.12, ceiling);
    const jitter = between(r, 0.55, 1);
    const inWindow = window !== null && i >= window[0] && i < window[1];
    out.push(inWindow ? clamp(envelope * 2.2 * jitter + 0.25, 0, 1) : envelope * jitter);
  }
  return out;
}

function ticks(amps: number[], pitch: number, place: (amp: number) => [number, number], classOf: (i: number) => 'l' | 'k' | 'h'): Shape[] {
  const chains: Record<'l' | 'k' | 'h', string[]> = { l: [], k: [], h: [] };
  const last: Record<'l' | 'k' | 'h', { x: number; bottom: number } | null> = { l: null, k: null, h: null };
  amps.forEach((amp, i) => {
    const cls = classOf(i);
    const x = L + i * pitch;
    const [top, span] = place(amp);
    const prev = last[cls];
    chains[cls].push(prev === null ? `M${n1(x)} ${n1(top)}v${n1(span)}` : `m${n1(x - prev.x)} ${n1(top - prev.bottom)}v${n1(span)}`);
    last[cls] = { x, bottom: top + span };
  });
  return (['l', 'k', 'h'] as const).filter((cls) => chains[cls].length).map((cls) => shape('path', cls, { d: chains[cls].join('') }));
}

function wave(r: Rng, variant: Variant): Drawing {
  const layout = pick(r, 3);
  // two stacked traces share the frame, so each is sparser
  const n = layout === 2 ? 36 + pick(r, 10) : 56 + pick(r, 20);
  const pitch = (R - L) / (n - 1);
  let window: [number, number] | null = null;
  if (variant === 1) {
    const start = Math.floor(n * between(r, 0.28, 0.62));
    window = [start, start + Math.floor(n * between(r, 0.1, 0.2))];
  }
  const rhythm = 6 + pick(r, 5);
  const traces = layout === 2 ? [{ mid: 62, amp: 30 }, { mid: 124, amp: 30 }] : [{ mid: layout === 1 ? 150 : 90, amp: layout === 1 ? 116 : 62 }];
  const shapes: Shape[] = [];
  traces.forEach((trace, t) => {
    // the perturbation and the accent live on the last trace
    const lead = t === traces.length - 1;
    const win = lead ? window : null;
    const amps = amplitudes(r, n, win, variant === 1 ? 0.42 : 0.9);
    const peak = lead ? amps.indexOf(Math.max(...amps)) : -1;
    const place = (a: number): [number, number] => {
      const span = Math.max(WAVE_MIN_AMP, a * trace.amp);
      return layout === 1 ? [trace.mid - span, span] : [trace.mid - span, 2 * span];
    };
    const inWindow = (i: number) => win !== null && i >= win[0] && i < win[1];
    shapes.push(shape('path', layout === 1 ? 'k' : 'l', { d: `M${L} ${trace.mid}H${R}`, ...(layout === 1 ? {} : { strokeDasharray: '1 3' }) }));
    shapes.push(...ticks(amps, pitch, place, (i) => (i === peak ? 'h' : (variant === 0 ? i % rhythm === 0 : inWindow(i)) ? 'k' : 'l')));
    if (win) {
      const top = layout === 2 ? trace.mid - trace.amp - 4 : T;
      const bottom = layout === 2 ? trace.mid + trace.amp + 4 : B;
      const xa = n1(L + win[0] * pitch - pitch / 2);
      const xb = n1(L + (win[1] - 1) * pitch + pitch / 2);
      shapes.push(shape('path', 'l', { d: `M${xa} ${n1(top)}V${n1(bottom)}M${xb} ${n1(top)}V${n1(bottom)}`, strokeDasharray: '2 3' }));
    }
  });
  return { shapes, layout, mirror: chance(r, 0.5) ? 'x' : undefined };
}

const DRAW: Record<VisualFamily, (r: Rng, variant: Variant) => Drawing> = { dots, fan, bars, arcs, wave };
const PHASE_KEYS = new Set<string>(PHASE_DEFINITIONS.map((p) => p.key));

/** Which family draws a report, and whether it is a synthesis document. */
export function visualStyleFor(slug: string): { family: VisualFamily; variant: Variant; synthesis: boolean } {
  const category = classifyReportSlug(slug);
  const synthesis = ['whitepaper', 'conclusive', 'appendix', 'compendium'].includes(category);
  let key: string | null = category;
  if (category === 'whitepaper' || category === 'conclusive' || category === 'appendix') {
    const phase = /phase(\d+)/.exec(slug.toLowerCase());
    key = phase ? `phase${phase[1]}` : null;
  }
  const style = key !== null && (PHASE_KEYS.has(key) || key === 'compendium') ? PHASE_STYLE[key as PhaseKey | 'compendium'] : DEFAULT_STYLE;
  return { family: style[0], variant: style[1], synthesis };
}

export interface ReportVisualProps {
  /** the seed: a report slug, or any stable name (a repository on /platform) */
  slug: string;
  accent?: boolean;
  /** draw this family instead of the phase's; the seed still picks the composition */
  family?: VisualFamily;
  /** with a named family, its variant (default 0) */
  variant?: Variant;
}

export function ReportVisual({ slug, accent = false, family: named, variant: namedVariant = 0 }: ReportVisualProps) {
  const style = visualStyleFor(slug);
  const family = named ?? style.family;
  const variant = named ? namedVariant : style.variant;
  const { synthesis } = style;
  const { shapes, layout, mirror } = DRAW[family](seeded(hashSlug(slug)), variant);
  const body = shapes.map((s, i) => createElement(s.tag, { key: i, className: s.cls, ...s.props }));
  return (
    <svg
      className="rv"
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
      data-family={family}
      data-layout={`${layout}${mirror ?? ''}`}
      data-synthesis={synthesis ? 'true' : undefined}
      data-accent={accent ? 'on' : undefined}
    >
      {mirror ? <g transform={MIRROR_TRANSFORM[mirror]}>{body}</g> : body}
      {synthesis && <path className="k" d={SYNTHESIS_MARKS} />}
    </svg>
  );
}
