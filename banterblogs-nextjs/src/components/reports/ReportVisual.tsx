import { createElement } from 'react';
import { classifyReportSlug, PHASE_DEFINITIONS, type PhaseKey } from '@/lib/reports/phases';

// The archive cards' per-report picture: an abstract, monochrome SVG in one of
// five families. The phase picks the family and its variant, a hash of the
// slug picks the parameters, so a report always draws the same picture and a
// phase reads as one series. Integer PRNG and plain arithmetic only, so the
// server and every browser produce identical markup. Strokes and the ember
// accent are styled by the .rv rules in globals.css.

export const VISUAL_FAMILIES = ['dots', 'fan', 'bars', 'arcs', 'wave'] as const;
export type VisualFamily = (typeof VISUAL_FAMILIES)[number];
type Variant = 0 | 1;

/** markup budget per visual, so ~60 cards stay light in the archive HTML */
export const MAX_VISUAL_BYTES = 1800;

const W = 320;
const H = 180;
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
interface Shape {
  tag: 'path' | 'rect' | 'circle';
  cls: string;
  props: Record<string, string | number>;
}

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

// ---- dots: Bayer-dithered blocks; a density gradient (0) or a radial core (1)
const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DOT_PITCH = 8;
const DOT_GRID = { cols: 7, rows: 3, perBlock: 4, gapX: 8, gapY: 12 };
// the hover accent lights a block at least this dense, so the ember reads
const ACCENT_MIN_DENSITY = 0.55;

function dots(r: Rng, variant: Variant): Shape[] {
  const { cols, rows, perBlock, gapX, gapY } = DOT_GRID;
  const block = perBlock * DOT_PITCH;
  const x0 = (W - (cols * block + (cols - 1) * gapX)) / 2;
  const y0 = (H - (rows * block + (rows - 1) * gapY)) / 2;
  let density: (c: number, row: number) => number;
  if (variant === 0) {
    const hi = between(r, 0.94, 1);
    const lo = between(r, 0.03, 0.12);
    const reverse = r() < 0.5;
    const rowShift = between(r, -0.1, 0.1);
    density = (c, row) => clamp(hi + (lo - hi) * ((reverse ? cols - 1 - c : c) / (cols - 1)) + rowShift * (row - 1), 0, 1);
  } else {
    const cx = between(r, 1, cols - 2);
    const cy = between(r, 0.4, rows - 1.4);
    const reach = between(r, 3.4, 4.8);
    density = (c, row) => {
      const dx = c - cx;
      const dy = (row - cy) * 1.4;
      return clamp(1.08 - Math.sqrt(dx * dx + dy * dy) / reach, 0.02, 1);
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
          if ((BAYER_4X4[dy * perBlock + dx] + 0.5) / 16 >= density(c, row)) continue;
          const x = x0 + c * (block + gapX) + dx * DOT_PITCH + DOT_PITCH / 2;
          const prev = last[which];
          paths[which].push(prev === null ? `M${n1(x)} ${n1(y)}h0` : `m${n1(x - prev)} 0h0`);
          last[which] = x;
        }
      }
    }
  }
  const out = [shape('path', 'd', { d: paths.base.join(''), strokeWidth: DOT_PITCH })];
  if (paths.accent.length) out.push(shape('path', 'd h', { d: paths.accent.join(''), strokeWidth: DOT_PITCH }));
  return out;
}

// ---- fan: a perspective fan from a corner (0) or a projection cone (1)
function fan(r: Rng, variant: Variant): Shape[] {
  const out = [shape('rect', 'l', { x: L, y: T, width: R - L, height: B - T })];
  if (variant === 0) {
    const rules: number[] = [];
    const ratio = between(r, 0.72, 0.84);
    let s = 1;
    for (let i = 0, n = 8 + pick(r, 5); i < n; i++) {
      s *= ratio;
      rules.push(R - (R - L) * s);
    }
    const edge: number[] = [];
    for (let j = 1, m = 2 + pick(r, 3); j <= m; j++) edge.push(T + ((B - T) * j * j) / ((m + 1) * (m + 1)));
    out.push(shape('path', 'l', { d: rules.map((x) => `M${n1(x)} ${T}V${B}`).join('') }));
    out.push(
      shape('path', 'l', { d: [...rules.map((x) => `M${L} ${B}L${n1(x)} ${T}`), ...edge.map((y) => `M${L} ${B}L${R} ${n1(y)}`)].join('') }),
    );
    out.push(shape('path', 'h', { d: `M${L} ${B}L${R} ${T}` }));
    return out;
  }
  const now = L + (R - L) * between(r, 0.34, 0.46);
  let y = between(r, 96, 120);
  const observed: Array<[number, number]> = [[L, y]];
  const steps = 7;
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
  out.push(shape('path', 'l', { d: [1, 2, 3].map((k) => `M${L} ${n1(T + ((B - T) * k) / 4)}H${R}`).join(''), strokeDasharray: '1 4' }));
  out.push(shape('path', 'l', { d: ends.map((ey) => `M${n1(ox)} ${n1(oy)}L${R} ${n1(ey)}`).join('') }));
  out.push(shape('path', 'k', { d: `M${n1(ox)} ${T}V${B}`, strokeDasharray: '2 3' }));
  out.push(shape('path', 'k', { d: 'M' + observed.map(([x, py]) => `${n1(x)} ${n1(py)}`).join('L') }));
  out.push(shape('path', 'h', { d: `M${n1(ox)} ${n1(oy)}L${R} ${n1(clamp(oy + drift, T, B))}` }));
  return out;
}

// ---- bars: an ascending staircase (0) or a rise that breaks at a cliff (1)
const BAR_BASE = 150;
const BAR_TOP = 30;
const BAR_LEVELS = 7;

function bars(r: Rng, variant: Variant): Shape[] {
  const step = (BAR_BASE - BAR_TOP) / BAR_LEVELS;
  const n = 12 + pick(r, 7);
  const pitch = (R - L) / n;
  const width = pitch * 0.56;
  const levels: number[] = [];
  let cliff = n;
  if (variant === 0) {
    let level = 1 + pick(r, 2);
    const climb = between(r, 0.38, 0.62);
    for (let i = 0; i < n; i++) {
      if (i > 0 && r() < climb) level = Math.min(BAR_LEVELS, level + 1);
      levels.push(level);
    }
  } else {
    cliff = Math.floor(n * between(r, 0.56, 0.74));
    let level = 2;
    for (let i = 0; i < n; i++) {
      if (i < cliff) {
        if (i > 0 && r() < 0.7) level = Math.min(BAR_LEVELS, level + 1);
        levels.push(level);
      } else {
        levels.push(1 + pick(r, 2));
      }
    }
  }
  const accentAt = variant === 0 ? levels.indexOf(Math.max(...levels)) : cliff - 1;
  const solid: string[] = [];
  const broken: string[] = [];
  const caps: string[] = [];
  let accent = '';
  levels.forEach((level, i) => {
    const x = L + i * pitch + (pitch - width) / 2;
    const y = BAR_BASE - level * step;
    const outline = `M${n1(x)} ${BAR_BASE}V${n1(y)}H${n1(x + width)}V${BAR_BASE}`;
    if (i === accentAt) accent = outline;
    else {
      (i >= cliff ? broken : solid).push(outline);
      caps.push(`M${n1(x)} ${n1(y)}H${n1(x + width)}`);
    }
  });
  const out = [
    shape('path', 'l', { d: [2, 4, 6].map((level) => `M${L} ${n1(BAR_BASE - level * step)}H${R}`).join(''), strokeDasharray: '1 4' }),
    shape('path', 'l', { d: solid.join('') }),
  ];
  if (broken.length) out.push(shape('path', 'l', { d: broken.join(''), strokeDasharray: '2 2' }));
  out.push(shape('path', 'k', { d: `${caps.join('')}M${L} ${BAR_BASE}H${R}` }));
  out.push(shape('path', 'h', { d: accent }));
  return out;
}

// ---- arcs: rings rising from below with a needle (0) or a certification gauge (1)
const RING_DASHES = [null, null, '3 5', '1 3'] as const;

function arcs(r: Rng, variant: Variant): Shape[] {
  const out: Shape[] = [];
  if (variant === 0) {
    const cx = 160 + between(r, -36, 36);
    const cy = 178;
    const rings = 8 + pick(r, 3);
    const r0 = between(r, 14, 22);
    const gap = between(r, 12, 14.5);
    const accent = 2 + pick(r, rings - 3);
    for (let i = 0; i < rings; i++) {
      const dash = i === accent ? null : RING_DASHES[pick(r, RING_DASHES.length)];
      out.push(shape('circle', i === accent ? 'h' : 'l', { cx: n1(cx), cy, r: n1(r0 + i * gap), ...(dash ? { strokeDasharray: dash } : {}) }));
    }
    const angle = Math.round(between(r, -48, 48));
    out.push(shape('path', 'k', { d: `M${n1(cx)} ${cy}V${n1(cy - r0 - (rings - 1) * gap)}`, transform: `rotate(${angle} ${n1(cx)} ${cy})` }));
    return out;
  }
  const cx = 160;
  const cy = 96;
  for (let i = 0; i < 5; i++) out.push(shape('circle', 'l', { cx, cy, r: 14 + i * 12, ...(i % 2 ? { strokeDasharray: '2 3' } : {}) }));
  out.push(shape('circle', 't', { cx, cy, r: 76, pathLength: 120, strokeDasharray: '0.3 1.7', strokeWidth: 6 }));
  const certified = Math.round(between(r, 54, 92));
  out.push(shape('circle', 'h', { cx, cy, r: 66, pathLength: 100, strokeDasharray: `${certified} 100`, transform: `rotate(-90 ${cx} ${cy})` }));
  out.push(shape('path', 'k', { d: `M${cx - 6} ${cy}H${cx + 6}M${cx} ${cy - 6}V${cy + 6}` }));
  return out;
}

// ---- wave: vertical ticks around a centre line; calm (0) or with one
// perturbation window whose ticks spike (1)
const WAVE_MID = 90;
const WAVE_MAX_AMP = 62;
const WAVE_MIN_AMP = 1.5;

function wave(r: Rng, variant: Variant): Shape[] {
  const n = 60 + pick(r, 12);
  const pitch = (R - L) / (n - 1);
  const winStart = variant === 1 ? Math.floor(n * between(r, 0.3, 0.62)) : -1;
  const winEnd = variant === 1 ? winStart + Math.floor(n * between(r, 0.12, 0.18)) : -1;
  const inWindow = (i: number) => i >= winStart && i < winEnd;
  let envelope = between(r, 0.25, 0.5);
  const amps: number[] = [];
  for (let i = 0; i < n; i++) {
    envelope = clamp(envelope + between(r, -0.09, 0.09), 0.12, variant === 1 ? 0.42 : 0.9);
    const jitter = between(r, 0.55, 1);
    amps.push(WAVE_MAX_AMP * (inWindow(i) ? clamp(envelope * 2.2 * jitter + 0.25, 0, 1) : envelope * jitter));
  }
  const peak = amps.indexOf(Math.max(...amps));
  const chains: Record<'l' | 'k' | 'h', string[]> = { l: [], k: [], h: [] };
  const last: Record<'l' | 'k' | 'h', { x: number; bottom: number } | null> = { l: null, k: null, h: null };
  amps.forEach((amp, i) => {
    const cls = i === peak ? 'h' : (variant === 0 ? i % 8 === 0 : inWindow(i)) ? 'k' : 'l';
    const x = L + i * pitch;
    const half = Math.max(WAVE_MIN_AMP, amp);
    const top = WAVE_MID - half;
    const prev = last[cls];
    chains[cls].push(prev === null ? `M${n1(x)} ${n1(top)}v${n1(2 * half)}` : `m${n1(x - prev.x)} ${n1(top - prev.bottom)}v${n1(2 * half)}`);
    last[cls] = { x, bottom: top + 2 * half };
  });
  const out = [shape('path', 'l', { d: `M${L} ${WAVE_MID}H${R}`, strokeDasharray: '1 3' })];
  for (const cls of ['l', 'k', 'h'] as const) if (chains[cls].length) out.push(shape('path', cls, { d: chains[cls].join('') }));
  if (variant === 1) {
    const xa = L + winStart * pitch - pitch / 2;
    const xb = L + (winEnd - 1) * pitch + pitch / 2;
    out.push(shape('path', 'l', { d: `M${n1(xa)} ${T}V${B}M${n1(xb)} ${T}V${B}`, strokeDasharray: '2 3' }));
  }
  return out;
}

const DRAW: Record<VisualFamily, (r: Rng, variant: Variant) => Shape[]> = { dots, fan, bars, arcs, wave };
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

export function ReportVisual({ slug, accent = false }: { slug: string; accent?: boolean }) {
  const { family, variant, synthesis } = visualStyleFor(slug);
  const shapes = DRAW[family](seeded(hashSlug(slug)), variant);
  if (synthesis) shapes.push(shape('path', 'k', { d: SYNTHESIS_MARKS }));
  return (
    <svg
      className="rv"
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      focusable="false"
      data-family={family}
      data-synthesis={synthesis ? 'true' : undefined}
      data-accent={accent ? 'on' : undefined}
    >
      {shapes.map((s, i) => createElement(s.tag, { key: i, className: s.cls, ...s.props }))}
    </svg>
  );
}
