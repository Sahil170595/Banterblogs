// The ecosystem map's three layouts, laid out by hand in SVG user units (one
// unit is one CSS pixel at the size each is meant to be read): across for a
// wide figure, in rows for a tablet-width one, down for a phone.
// mapLayout.test.ts rules them with Manrope's measured widths: every edge
// starts and ends on its own nodes' borders, text fits its pill, and labels
// sit by their own lines, clear of everything else.
import { CORE_ID, type NodeId } from '@/lib/ecosystem';

export type LayoutId = 'wide' | 'medium' | 'narrow';
export type Point = readonly [number, number];

/** a node: a pill centred on (cx, cy), w wide and the layout's pillHeight tall */
export interface Pill {
  cx: number;
  cy: number;
  w: number;
}

export interface Route {
  /** on the caller's border */
  from: Point;
  /** on the border of what it calls, where the arrowhead lands */
  to: Point;
  /** one point bends the edge as a quadratic, two as a cubic; none is a straight line */
  via?: readonly Point[];
  /** the label's baseline anchor; wrap breaks it at its separator */
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; wrap?: boolean };
}

export interface MapLayout {
  id: LayoutId;
  width: number;
  height: number;
  pillHeight: number;
  nodes: Record<NodeId, Pill>;
  /** by edgeKey: `${from}>${to}` */
  routes: Record<string, Route>;
  /** document order, which is tab order: rows top to bottom, each left to right */
  order: readonly NodeId[];
}

// Pill widths are the node's widest line, measured, plus an even margin
// either side (18 units, 16 on the phone), so every pill holds its text alike.

// The three clients down the left, the gateway and the core it hosts across
// the middle with Wyvern beyond, the research and observability tier beneath.
const WIDE: MapLayout = {
  id: 'wide',
  width: 820,
  height: 470,
  pillHeight: 46,
  nodes: {
    'jarvis-console': { cx: 92, cy: 64, w: 142 },
    chimeradroid: { cx: 92, cy: 150, w: 126 },
    echo: { cx: 92, cy: 236, w: 76 },
    banterpacks: { cx: 330, cy: 150, w: 118 },
    [CORE_ID]: { cx: 524, cy: 150, w: 110 },
    'project-wyvern': { cx: 750, cy: 150, w: 136 },
    'chimera-multi-agent': { cx: 230, cy: 340, w: 172 },
    banterhearts: { cx: 470, cy: 340, w: 122 },
    chimeraforge: { cx: 700, cy: 340, w: 126 },
    'this-site': { cx: 350, cy: 440, w: 142 },
  },
  routes: {
    'echo>banterpacks': { from: [130, 228], to: [271, 164], label: { x: 204, y: 212, anchor: 'start' } },
    'chimeradroid>banterpacks': { from: [155, 150], to: [271, 150], label: { x: 213, y: 142, anchor: 'middle' } },
    // onto the gateway's top, so the three arrivals stay apart
    'jarvis-console>banterpacks': { from: [163, 76], to: [290, 127], label: { x: 228, y: 92, anchor: 'start' } },
    // over the top of the gateway, into the core from above
    'jarvis-console>core': { from: [163, 52], via: [[350, -8]], to: [514, 127], label: { x: 300, y: 24, anchor: 'middle' } },
    'banterpacks>core': { from: [389, 150], to: [469, 150], label: { x: 429, y: 142, anchor: 'middle' } },
    'core>project-wyvern': { from: [579, 150], to: [682, 150], label: { x: 630.5, y: 142, anchor: 'middle' } },
    // the observability loop: traces down, fixes back up
    'banterpacks>chimera-multi-agent': { from: [300, 173], to: [204, 317], label: { x: 240, y: 249, anchor: 'end' } },
    'chimera-multi-agent>banterpacks': { from: [252, 317], to: [336, 173], label: { x: 304, y: 249, anchor: 'start' } },
    'banterpacks>banterhearts': { from: [366, 173], to: [452, 317], label: { x: 420, y: 245, anchor: 'start' } },
    'banterhearts>chimera-multi-agent': { from: [409, 340], to: [316, 340], label: { x: 362.5, y: 332, anchor: 'middle' } },
    'chimera-multi-agent>this-site': { from: [262, 363], to: [318, 417], label: { x: 276, y: 398, anchor: 'end' } },
    'banterhearts>this-site': { from: [440, 363], to: [384, 417], label: { x: 424, y: 398, anchor: 'start' } },
    'banterhearts>chimeraforge': { from: [531, 340], to: [637, 340], label: { x: 584, y: 332, anchor: 'middle' } },
  },
  order: [
    'jarvis-console',
    'chimeradroid',
    'banterpacks',
    CORE_ID,
    'project-wyvern',
    'echo',
    'chimera-multi-agent',
    'banterhearts',
    'chimeraforge',
    'this-site',
  ],
};

// For a tablet-width figure: the clients across the top, the gateway and the
// core beneath them, the research tier with Wyvern under the core, then the
// two that are fed. Most edges drop straight down between rows.
const MEDIUM: MapLayout = {
  id: 'medium',
  width: 580,
  height: 408,
  pillHeight: 46,
  nodes: {
    echo: { cx: 60, cy: 30, w: 76 },
    chimeradroid: { cx: 180, cy: 30, w: 126 },
    'jarvis-console': { cx: 400, cy: 30, w: 142 },
    banterpacks: { cx: 100, cy: 150, w: 118 },
    [CORE_ID]: { cx: 410, cy: 150, w: 110 },
    'chimera-multi-agent': { cx: 96, cy: 270, w: 172 },
    banterhearts: { cx: 330, cy: 270, w: 122 },
    'project-wyvern': { cx: 500, cy: 270, w: 136 },
    'this-site': { cx: 215, cy: 380, w: 142 },
    chimeraforge: { cx: 420, cy: 380, w: 126 },
  },
  routes: {
    'echo>banterpacks': { from: [64, 53], to: [64, 127], label: { x: 58, y: 94, anchor: 'end' } },
    'chimeradroid>banterpacks': { from: [124, 53], to: [124, 127], label: { x: 130, y: 94, anchor: 'start' } },
    'jarvis-console>banterpacks': { from: [340, 53], to: [152, 127], label: { x: 250, y: 110, anchor: 'start' } },
    'jarvis-console>core': { from: [410, 53], to: [410, 127], label: { x: 416, y: 94, anchor: 'start' } },
    'banterpacks>core': { from: [159, 150], to: [355, 150], label: { x: 257, y: 142, anchor: 'middle' } },
    'core>project-wyvern': { from: [448, 173], to: [448, 247], label: { x: 454, y: 214, anchor: 'start' } },
    'banterpacks>chimera-multi-agent': { from: [80, 173], to: [80, 247], label: { x: 74, y: 214, anchor: 'end' } },
    'chimera-multi-agent>banterpacks': { from: [120, 247], to: [120, 173], label: { x: 126, y: 214, anchor: 'start' } },
    'banterpacks>banterhearts': { from: [155, 173], to: [290, 247], label: { x: 232, y: 200, anchor: 'start' } },
    'banterhearts>chimera-multi-agent': { from: [269, 270], to: [182, 270], label: { x: 225.5, y: 262, anchor: 'middle' } },
    'chimera-multi-agent>this-site': { from: [160, 293], to: [160, 357], label: { x: 154, y: 330, anchor: 'end' } },
    'banterhearts>this-site': { from: [278, 293], to: [278, 357], label: { x: 284, y: 330, anchor: 'start' } },
    'banterhearts>chimeraforge': { from: [375, 293], to: [375, 357], label: { x: 381, y: 330, anchor: 'start' } },
  },
  order: [
    'echo',
    'chimeradroid',
    'jarvis-console',
    'banterpacks',
    CORE_ID,
    'chimera-multi-agent',
    'banterhearts',
    'project-wyvern',
    'this-site',
    'chimeraforge',
  ],
};

// The same graph in rows of one or two: the clients, the gateway and the
// core, then the tier beneath. Long edges run down the margins.
const NARROW: MapLayout = {
  id: 'narrow',
  width: 310,
  height: 530,
  pillHeight: 44,
  nodes: {
    echo: { cx: 40, cy: 26, w: 72 },
    chimeradroid: { cx: 144, cy: 26, w: 116 },
    'jarvis-console': { cx: 236, cy: 108, w: 138 },
    banterpacks: { cx: 59, cy: 204, w: 110 },
    [CORE_ID]: { cx: 252, cy: 204, w: 106 },
    'chimera-multi-agent': { cx: 84, cy: 304, w: 160 },
    banterhearts: { cx: 112, cy: 404, w: 114 },
    'project-wyvern': { cx: 242, cy: 404, w: 126 },
    'this-site': { cx: 73, cy: 504, w: 138 },
    chimeraforge: { cx: 247, cy: 504, w: 116 },
  },
  routes: {
    'echo>banterpacks': { from: [40, 48], to: [40, 182], label: { x: 46, y: 121, anchor: 'start' } },
    'chimeradroid>banterpacks': { from: [128, 48], to: [88, 182], label: { x: 131, y: 74, anchor: 'start' } },
    'jarvis-console>banterpacks': { from: [186, 130], to: [104, 182], label: { x: 146, y: 172, anchor: 'start' } },
    'jarvis-console>core': { from: [270, 130], to: [270, 182], label: { x: 276, y: 160, anchor: 'start' } },
    'banterpacks>core': { from: [114, 204], to: [199, 204], label: { x: 156.5, y: 196, anchor: 'middle' } },
    'banterpacks>chimera-multi-agent': { from: [48, 226], to: [48, 282], label: { x: 42, y: 258, anchor: 'end' } },
    'chimera-multi-agent>banterpacks': { from: [80, 282], to: [80, 226], label: { x: 86, y: 258, anchor: 'start' } },
    // round the right of the node between them
    'banterpacks>banterhearts': {
      from: [110, 226],
      via: [[210, 236], [210, 330]],
      to: [150, 382],
      label: { x: 200, y: 297, anchor: 'start', wrap: true },
    },
    'banterhearts>chimera-multi-agent': { from: [92, 382], to: [92, 326], label: { x: 86, y: 358, anchor: 'end' } },
    // down the left margin, past the row between
    'chimera-multi-agent>this-site': { from: [14, 326], to: [14, 482], label: { x: 22, y: 449, anchor: 'start', wrap: true } },
    'banterhearts>this-site': { from: [100, 426], to: [100, 482], label: { x: 106, y: 458, anchor: 'start' } },
    'banterhearts>chimeraforge': { from: [150, 426], to: [226, 482], label: { x: 196, y: 444, anchor: 'start' } },
    'core>project-wyvern': { from: [294, 226], to: [294, 382], label: { x: 288, y: 362, anchor: 'end' } },
  },
  order: [
    'echo',
    'chimeradroid',
    'jarvis-console',
    'banterpacks',
    CORE_ID,
    'chimera-multi-agent',
    'banterhearts',
    'project-wyvern',
    'this-site',
    'chimeraforge',
  ],
};

export const MAP_LAYOUTS: Record<LayoutId, MapLayout> = { wide: WIDE, medium: MEDIUM, narrow: NARROW };

/** the separator a label may break at */
const LABEL_BREAK = ' · ';
/** arrowhead, tip to base, and half its base */
const ARROW_LENGTH = 7;
const ARROW_HALF_WIDTH = 3.25;

export function pillBox(layout: MapLayout, id: NodeId): { x0: number; y0: number; x1: number; y1: number } {
  const { cx, cy, w } = layout.nodes[id];
  return { x0: cx - w / 2, y0: cy - layout.pillHeight / 2, x1: cx + w / 2, y1: cy + layout.pillHeight / 2 };
}

const pair = ([x, y]: Point) => `${x} ${y}`;

export function routePath({ from, via = [], to }: Route): string {
  if (via.length === 1) return `M${pair(from)}Q${pair(via[0])} ${pair(to)}`;
  if (via.length === 2) return `M${pair(from)}C${pair(via[0])} ${pair(via[1])} ${pair(to)}`;
  return `M${pair(from)}L${pair(to)}`;
}

/** the point a fraction t of the way along the route (a Bézier of its points) */
export function pointAt({ from, via = [], to }: Route, t: number): [number, number] {
  let points: Point[] = [from, ...via, to];
  // de Casteljau: fold the control polygon until one point is left
  while (points.length > 1) {
    points = points.slice(1).map(([x, y], i) => [points[i][0] + (x - points[i][0]) * t, points[i][1] + (y - points[i][1]) * t] as const);
  }
  return [points[0][0], points[0][1]];
}

const round = (value: number) => Math.round(value * 100) / 100;

/** a triangle's points, its tip on the route's end, along the way the edge arrives */
export function arrowHead({ from, via = [], to }: Route): string {
  const before = via.at(-1) ?? from;
  const length = Math.hypot(to[0] - before[0], to[1] - before[1]) || 1;
  const [ux, uy] = [(to[0] - before[0]) / length, (to[1] - before[1]) / length];
  const [bx, by] = [to[0] - ux * ARROW_LENGTH, to[1] - uy * ARROW_LENGTH];
  const corners: Point[] = [
    to,
    [bx - uy * ARROW_HALF_WIDTH, by + ux * ARROW_HALF_WIDTH],
    [bx + uy * ARROW_HALF_WIDTH, by - ux * ARROW_HALF_WIDTH],
  ];
  return corners.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}

/** a label's lines: one, or broken after its first separator where the layout asks */
export function labelLines(label: string, wrap = false): string[] {
  const at = wrap ? label.indexOf(LABEL_BREAK) : -1;
  return at < 0 ? [label] : [label.slice(0, at + LABEL_BREAK.length).trimEnd(), label.slice(at + LABEL_BREAK.length)];
}
